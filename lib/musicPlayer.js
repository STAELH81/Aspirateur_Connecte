const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createReadStream } = require("fs");
const { PermissionFlagsBits, ChannelType, ActivityType } = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  demuxProbe,
  generateDependencyReport,
} = require("@discordjs/voice");
const play = require("play-dl");
const profile = require("./serverProfile");

function setupFfmpeg() {
  if (process.platform !== "win32") {
    try {
      const system = execSync("command -v ffmpeg", { encoding: "utf8" }).trim();
      if (system) {
        process.env.FFMPEG_PATH = system;
        console.log("[music] ffmpeg (system) :", system);
        return;
      }
    } catch {
      /* pas de ffmpeg systeme */
    }
  }
  try {
    const ffmpegPath = require("ffmpeg-static");
    if (ffmpegPath) {
      process.env.FFMPEG_PATH = ffmpegPath;
      console.log("[music] ffmpeg (static) :", ffmpegPath);
    }
  } catch {
    console.warn("[music] ffmpeg introuvable — audio impossible.");
  }
}

setupFfmpeg();
console.log("[music] Voice deps :\n", generateDependencyReport());

let voiceCryptoReady = null;

function ensureVoiceCrypto() {
  if (!voiceCryptoReady) {
    voiceCryptoReady = (async () => {
      try {
        const sodium = require("libsodium-wrappers");
        await sodium.ready;
        console.log("[music] Chiffrement vocal (libsodium) pret.");
      } catch (err) {
        console.warn("[music] libsodium indisponible :", err.message);
      }
    })();
  }
  return voiceCryptoReady;
}

const PLAYLIST_FILE = path.join(__dirname, "..", "data", "music-playlist.json");
const MUSIC_DIR = path.join(__dirname, "..", "data", "music");
const AUDIO_EXT = /\.(mp3|ogg|wav|flac|m4a|opus)$/i;
const CONNECT_TIMEOUT_MS = 60_000;
const MAX_CONNECT_ATTEMPTS = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLocalFiles() {
  if (!fs.existsSync(MUSIC_DIR)) return [];
  return fs
    .readdirSync(MUSIC_DIR)
    .filter((name) => AUDIO_EXT.test(name))
    .map((name) => path.join(MUSIC_DIR, name))
    .filter((file) => {
      try {
        return fs.statSync(file).size > 0;
      } catch {
        return false;
      }
    });
}

function loadTracks() {
  let urls = [];
  try {
    const raw = JSON.parse(fs.readFileSync(PLAYLIST_FILE, "utf8"));
    urls = (raw.urls || raw.tracks || []).map(String).filter(Boolean);
  } catch {
    urls = [];
  }
  return [...loadLocalFiles(), ...urls];
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function createResourceFromFile(filePath) {
  const probe = await demuxProbe(createReadStream(filePath));
  const resource = createAudioResource(probe.stream, {
    inputType: probe.type,
    inlineVolume: true,
  });
  resource.volume?.setVolume(1);
  return resource;
}

async function createResourceFromUrl(track) {
  if (/\.(mp3|ogg|wav|flac|m4a)(\?|$)/i.test(track)) {
    const stream = await play.stream(track);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume?.setVolume(1);
    return resource;
  }
  if (play.yt_validate(track) === "video") {
    const stream = await play.stream(track);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume?.setVolume(1);
    return resource;
  }
  throw new Error(`URL non supportee : ${track}`);
}

function trackLabel(track) {
  if (fs.existsSync(track)) return path.basename(track);
  return track.slice(0, 80);
}

function formatDisplayTitle(label) {
  let title = label.replace(/\.(mp3|ogg|wav|flac|m4a|opus)$/i, "");
  title = title.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  title = title.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return title.slice(0, 100);
}

async function updateNowPlaying(client, channelId, label) {
  const title = formatDisplayTitle(label);
  const status = `🎵 ${title}`;

  try {
    await client.rest.put(`/channels/${channelId}/voice-status`, {
      body: { status },
    });
  } catch (err) {
    console.warn("[music] Status salon vocal :", err.message);
  }

  try {
    client.user?.setActivity(title, { type: ActivityType.Listening });
  } catch {
    /* presence optionnelle */
  }
}

async function clearNowPlaying(client, channelId) {
  try {
    await client.rest.put(`/channels/${channelId}/voice-status`, {
      body: { status: null },
    });
  } catch {
    /* ignore */
  }
  try {
    client.user?.setActivity();
  } catch {
    /* ignore */
  }
}

async function connectToChannel(guild, channel, client) {
  let me = guild.members.me;
  if (!me && client?.user?.id) {
    me = await guild.members.fetch(client.user.id).catch(() => null);
  }
  if (!me) throw new Error("Bot introuvable sur le serveur.");

  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.Connect)) {
    throw new Error("Permission Connecter manquante.");
  }
  if (!perms?.has(PermissionFlagsBits.Speak)) {
    throw new Error("Permission Parler manquante.");
  }

  const existing = getVoiceConnection(guild.id);
  if (existing) existing.destroy();

  let lastErr;
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    console.log(`[music] Connexion #${channel.name} (tentative ${attempt}/${MAX_CONNECT_ATTEMPTS})...`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(`[music] Voice ${oldState.status} -> ${newState.status}`);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, CONNECT_TIMEOUT_MS);
      if (channel.type === ChannelType.GuildStageVoice) {
        await me.voice.setSuppressed(false).catch(() => null);
      }
      console.log(`[music] Connecte a #${channel.name} (tentative ${attempt}).`);
      return connection;
    } catch (err) {
      lastErr = err;
      connection.destroy();
      console.warn(`[music] Tentative ${attempt}/${MAX_CONNECT_ATTEMPTS} : ${err.message}`);
      if (attempt < MAX_CONNECT_ATTEMPTS) await sleep(8000 * attempt);
    }
  }

  throw lastErr || new Error("Connexion vocale impossible.");
}

async function startMusic(client) {
  if (!profile.feature("music")) {
    console.log("[music] Desactive (profil sans radio).");
    return;
  }

  console.log("[music] Demarrage radio...");

  const channelId = process.env.MUSIC_VOICE_CHANNEL_ID?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!channelId || !guildId) {
    console.warn(
      "[music] Config manquante — MUSIC_VOICE_CHANNEL_ID=",
      channelId || "(vide)",
      " DISCORD_GUILD_ID=",
      guildId || "(vide)"
    );
    return;
  }

  await ensureVoiceCrypto();

  const tracks = loadTracks();
  const localCount = loadLocalFiles().length;
  console.log(`[music] ${tracks.length} piste(s) (${localCount} locale(s) dans data/music/).`);
  if (!tracks.length) {
    console.warn("[music] Aucune piste — ajoute des .mp3 dans data/music/ sur Discloud.");
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch((err) => {
    console.error("[music] Serveur introuvable (DISCORD_GUILD_ID) :", err.message);
    return null;
  });
  if (!guild) return;
  console.log(`[music] Serveur : ${guild.name}`);

  const channel = await guild.channels.fetch(channelId).catch((err) => {
    console.error("[music] Salon introuvable (MUSIC_VOICE_CHANNEL_ID) :", err.message);
    return null;
  });
  if (!channel?.isVoiceBased()) {
    console.warn("[music] Salon vocal invalide :", channelId);
    return;
  }
  console.log(`[music] Salon cible : #${channel.name} (type ${channel.type})`);

  const connection = await connectToChannel(guild, channel, client).catch((err) => {
    console.error("[music] Connexion impossible :", err.message);
    scheduleMusicRetry(client, 60_000);
    return null;
  });
  if (!connection) return;

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
  connection.subscribe(player);

  let queue = shuffle(tracks);
  let index = -1;
  let started = false;

  async function playNext() {
    index += 1;
    if (index >= queue.length) {
      queue = shuffle(tracks);
      index = 0;
    }
    const track = queue[index];
    const label = trackLabel(track);

    try {
      const resource = fs.existsSync(track)
        ? await createResourceFromFile(track)
        : await createResourceFromUrl(track);
      player.play(resource);
      started = true;
      console.log(`[music] Lecture : ${label}`);
      updateNowPlaying(client, channel.id, label).catch(() => null);
    } catch (err) {
      console.error(`[music] Erreur piste "${label}" :`, err.message);
      setTimeout(() => playNext().catch(console.error), 2000);
    }
  }

  player.on("stateChange", (oldState, newState) => {
    console.log(`[music] Player ${oldState.status} -> ${newState.status}`);
    if (
      oldState.status === AudioPlayerStatus.Playing &&
      newState.status === AudioPlayerStatus.Idle
    ) {
      playNext().catch((err) => console.error("[music]", err));
    }
  });

  player.on("error", (err) => {
    console.error("[music] Player error :", err.message);
    setTimeout(() => playNext().catch(console.error), 3000);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      console.warn("[music] Deconnecte — retry dans 30 s.");
      clearNowPlaying(client, channel.id).catch(() => null);
      connection.destroy();
      scheduleMusicRetry(client, 30_000);
    }
  });

  await playNext();

  if (!started) {
    console.warn("[music] Aucune piste demarree — verifier ffmpeg/opus dans les logs.");
  }

  console.log(
    `[music] Radio #${channel.name} — ${tracks.length} piste(s) (${loadLocalFiles().length} locale(s)).`
  );
}

let retryTimer = null;

function scheduleMusicRetry(client, delayMs) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startMusic(client).catch((err) => console.error("[music]", err));
  }, delayMs);
}

module.exports = { startMusic, loadTracks };
