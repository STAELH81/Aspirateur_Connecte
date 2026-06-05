const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits } = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} = require("@discordjs/voice");
const play = require("play-dl");
const profile = require("./serverProfile");

try {
  const ffmpegPath = require("ffmpeg-static");
  if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;
} catch {
  /* ffmpeg-static optionnel en local */
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
    .map((name) => path.join(MUSIC_DIR, name));
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

async function createStream(track) {
  if (fs.existsSync(track)) {
    return { local: true, path: track };
  }
  if (/\.(mp3|ogg|wav|flac|m4a)(\?|$)/i.test(track)) {
    const stream = await play.stream(track);
    return { local: false, stream: stream.stream, type: stream.type };
  }
  if (play.yt_validate(track) === "video") {
    const stream = await play.stream(track);
    return { local: false, stream: stream.stream, type: stream.type };
  }
  throw new Error(`Piste non supportee : ${track}`);
}

function trackLabel(track) {
  if (fs.existsSync(track)) return path.basename(track);
  return track.slice(0, 80);
}

async function connectToChannel(guild, channel) {
  const me = guild.members.me;
  if (!me) throw new Error("Bot introuvable sur le serveur.");

  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.Connect)) {
    throw new Error("Permission **Connecter** manquante dans ce salon vocal.");
  }
  if (!perms?.has(PermissionFlagsBits.Speak)) {
    throw new Error("Permission **Parler** manquante dans ce salon vocal.");
  }

  const existing = getVoiceConnection(guild.id);
  if (existing) existing.destroy();

  let lastErr;
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, CONNECT_TIMEOUT_MS);
      console.log(`[music] Connecte a #${channel.name} (tentative ${attempt}).`);
      return connection;
    } catch (err) {
      lastErr = err;
      connection.destroy();
      console.warn(`[music] Tentative ${attempt}/${MAX_CONNECT_ATTEMPTS} echouee : ${err.message}`);
      if (attempt < MAX_CONNECT_ATTEMPTS) await sleep(8000 * attempt);
    }
  }

  throw lastErr || new Error("Connexion vocale impossible.");
}

async function startMusic(client) {
  if (!profile.feature("music")) return;

  const channelId = process.env.MUSIC_VOICE_CHANNEL_ID?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!channelId || !guildId) {
    console.log("[music] MUSIC_VOICE_CHANNEL_ID non defini — radio desactivee.");
    return;
  }

  const tracks = loadTracks();
  if (!tracks.length) {
    console.log(
      "[music] Aucune piste — mets des .mp3 dans data/music/ ou des URLs dans data/music-playlist.json"
    );
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    console.warn("[music] Guild introuvable.");
    return;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isVoiceBased()) {
    console.warn("[music] Salon vocal introuvable ou invalide.");
    return;
  }

  const connection = await connectToChannel(guild, channel).catch((err) => {
    console.error("[music] Connexion vocale impossible :", err.message);
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

  async function playNext() {
    index += 1;
    if (index >= queue.length) {
      queue = shuffle(tracks);
      index = 0;
    }
    const track = queue[index];
    try {
      const src = await createStream(track);
      const resource = src.local
        ? createAudioResource(src.path)
        : createAudioResource(src.stream, { inputType: src.type, inlineVolume: true });
      player.play(resource);
      console.log(`[music] Lecture : ${trackLabel(track)}`);
    } catch (err) {
      console.error("[music] Erreur piste :", err.message);
      setTimeout(playNext, 2000);
    }
  }

  player.on(AudioPlayerStatus.Idle, () => {
    playNext().catch((err) => console.error("[music]", err));
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
      console.warn("[music] Deconnecte — nouvelle tentative dans 30 s.");
      connection.destroy();
      connection.destroy();
      scheduleMusicRetry(client, 30_000);
    }
  });

  await playNext();
  const localCount = loadLocalFiles().length;
  console.log(
    `[music] Radio active dans #${channel.name} (${tracks.length} piste(s), ${localCount} fichier(s) local(aux)).`
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
