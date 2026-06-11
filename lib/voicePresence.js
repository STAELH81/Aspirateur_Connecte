const path = require("path");
const fs = require("fs");
const { PermissionFlagsBits, ChannelType } = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  generateDependencyReport,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} = require("@discordjs/voice");

const CONNECT_TIMEOUT_MS = 60_000;
const MAX_CONNECT_ATTEMPTS = 4;
const VACUUM_SOUND_PATH = path.join(__dirname, "..", "assets", "sounds", "vacuum.wav");

let voiceCryptoReady = null;
let depsLogged = false;
let retryTimer = null;
let vacuumTimer = null;
let audioPlayer = null;
let vacuumPlaying = false;
let voiceClient = null;
let voiceGuildId = null;

function logVoiceDepsOnce() {
  if (depsLogged) return;
  depsLogged = true;
  console.log("[voice] Deps :\n", generateDependencyReport());
}

function ensureVoiceCrypto() {
  if (!voiceCryptoReady) {
    voiceCryptoReady = (async () => {
      try {
        const sodium = require("libsodium-wrappers");
        await sodium.ready;
        console.log("[voice] Chiffrement vocal (libsodium) pret.");
      } catch (err) {
        console.warn("[voice] libsodium indisponible :", err.message);
      }
    })();
  }
  return voiceCryptoReady;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVoicePresenceEnabled() {
  const channelId = process.env.VOICE_CHANNEL_ID?.trim();
  if (!channelId) return false;

  try {
    const profile = require("./serverProfile");
    return profile.feature("voicePresence");
  } catch {
    return true;
  }
}

function getVacuumConfig() {
  const minMs = Math.max(60_000, parseInt(process.env.VOICE_VACUUM_MIN_MS || "180000", 10) || 180_000);
  const maxMs = Math.max(
    minMs + 60_000,
    parseInt(process.env.VOICE_VACUUM_MAX_MS || "600000", 10) || 600_000
  );
  return {
    enabled: process.env.VOICE_VACUUM_ENABLED !== "0",
    minIntervalMs: minMs,
    maxIntervalMs: maxMs,
    volume: Math.min(0.5, Math.max(0.05, parseFloat(process.env.VOICE_VACUUM_VOLUME || "0.18") || 0.18)),
    durationMs: Math.min(10_000, Math.max(1000, parseInt(process.env.VOICE_VACUUM_DURATION_MS || "3000", 10) || 3000)),
  };
}

function randomInterval(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function stopVacuumRandomizer() {
  if (vacuumTimer) {
    clearTimeout(vacuumTimer);
    vacuumTimer = null;
  }
  if (audioPlayer) {
    audioPlayer.stop();
    audioPlayer = null;
  }
  vacuumPlaying = false;
}

function getAudioPlayer() {
  if (!audioPlayer) {
    audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    audioPlayer.on("error", (err) => console.warn("[voice] Player:", err.message));
  }
  return audioPlayer;
}

async function playVacuumBurst(connection, guild, channel) {
  const cfg = getVacuumConfig();
  if (!cfg.enabled || vacuumPlaying) return;
  if (!fs.existsSync(VACUUM_SOUND_PATH)) {
    console.warn("[voice] vacuum.wav introuvable — node scripts/generate-vacuum-sound.js");
    return;
  }

  const me = guild.members.me;
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.Speak)) {
    console.warn("[voice] Permission Parler manquante — son aspirateur desactive.");
    return;
  }

  vacuumPlaying = true;
  try {
    const player = getAudioPlayer();
    connection.subscribe(player);

    const resource = createAudioResource(VACUUM_SOUND_PATH, { inlineVolume: true });
    if (resource.volume) resource.volume.setVolume(cfg.volume);

    player.play(resource);
    console.log(`[voice] Aspirateur ${cfg.durationMs}ms (vol ${cfg.volume}).`);

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, cfg.durationMs);
      const onIdle = () => {
        clearTimeout(timeout);
        player.off(AudioPlayerStatus.Idle, onIdle);
        resolve();
      };
      player.once(AudioPlayerStatus.Idle, onIdle);
    });

    player.stop();
  } catch (err) {
    console.warn("[voice] Aspirateur:", err.message);
  } finally {
    vacuumPlaying = false;
  }
}

function startVacuumRandomizer(connection, guild, channel) {
  const cfg = getVacuumConfig();
  stopVacuumRandomizer();
  if (!cfg.enabled) return;

  const scheduleNext = () => {
    const delay = randomInterval(cfg.minIntervalMs, cfg.maxIntervalMs);
    vacuumTimer = setTimeout(async () => {
      try {
        const conn = getVoiceConnection(guild.id);
        if (conn) await playVacuumBurst(conn, guild, channel);
      } catch (err) {
        console.warn("[voice] Random aspirateur:", err.message);
      }
      scheduleNext();
    }, delay);
  };

  const firstDelay = randomInterval(cfg.minIntervalMs, cfg.maxIntervalMs);
  console.log(
    `[voice] Random aspirateur : ${cfg.durationMs / 1000}s, vol ${cfg.volume}, toutes les ${Math.round(cfg.minIntervalMs / 60_000)}–${Math.round(cfg.maxIntervalMs / 60_000)} min.`
  );

  vacuumTimer = setTimeout(async () => {
    try {
      await playVacuumBurst(connection, guild, channel);
    } catch (err) {
      console.warn("[voice] Random aspirateur:", err.message);
    }
    scheduleNext();
  }, firstDelay);
}

function handleVoiceFailure(client, reason, delayMs = 120_000) {
  console.warn(`[voice] ${reason} — retry dans ${Math.round(delayMs / 1000)} s.`);
  stopVacuumRandomizer();
  const guildId = voiceGuildId;
  if (guildId) {
    getVoiceConnection(guildId)?.destroy();
  }
  if (client) scheduleRetry(client, delayMs);
}

function bindConnectionSafeguards(connection, client, guild) {
  voiceClient = client;
  voiceGuildId = guild.id;

  connection.removeAllListeners("error");
  connection.removeAllListeners(VoiceConnectionStatus.Disconnected);

  connection.on("error", (err) => {
    handleVoiceFailure(client, `Erreur reseau vocal (${err.message})`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    stopVacuumRandomizer();
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      handleVoiceFailure(client, "Deconnecte du salon vocal", 30_000);
    }
  });
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
  if (getVacuumConfig().enabled && !perms.has(PermissionFlagsBits.Speak)) {
    console.warn("[voice] Permission Parler manquante — presence sans son.");
  }

  const existing = getVoiceConnection(guild.id);
  if (existing) existing.destroy();

  let lastErr;
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    console.log(`[voice] Connexion #${channel.name} (tentative ${attempt}/${MAX_CONNECT_ATTEMPTS})...`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(`[voice] ${oldState.status} -> ${newState.status}`);
    });
    connection.on("error", (err) => {
      console.warn(`[voice] Erreur pendant connexion: ${err.message}`);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, CONNECT_TIMEOUT_MS);
      if (channel.type === ChannelType.GuildStageVoice) {
        await me.voice.setSuppressed(false).catch(() => null);
      }
      console.log(`[voice] Present dans #${channel.name}.`);
      return connection;
    } catch (err) {
      lastErr = err;
      connection.destroy();
      console.warn(`[voice] Tentative ${attempt}/${MAX_CONNECT_ATTEMPTS} : ${err.message}`);
      if (attempt < MAX_CONNECT_ATTEMPTS) await sleep(8000 * attempt);
    }
  }

  throw lastErr || new Error("Connexion vocale impossible.");
}

function scheduleRetry(client, delayMs) {
  if (retryTimer) return;
  stopVacuumRandomizer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startVoicePresence(client).catch((err) => console.error("[voice]", err));
  }, delayMs);
}

async function startVoicePresence(client) {
  if (!isVoicePresenceEnabled()) return;

  logVoiceDepsOnce();

  const channelId = process.env.VOICE_CHANNEL_ID?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!channelId || !guildId) {
    console.warn("[voice] VOICE_CHANNEL_ID ou DISCORD_GUILD_ID manquant.");
    return;
  }

  console.log("[voice] Demarrage presence vocale...");
  await ensureVoiceCrypto();

  const guild = await client.guilds.fetch(guildId).catch((err) => {
    console.error("[voice] Serveur introuvable :", err.message);
    return null;
  });
  if (!guild) return;

  const channel = await guild.channels.fetch(channelId).catch((err) => {
    console.error("[voice] Salon introuvable :", err.message);
    return null;
  });
  if (!channel?.isVoiceBased()) {
    console.warn("[voice] Salon vocal invalide :", channelId);
    return;
  }

  const connection = await connectToChannel(guild, channel, client).catch((err) => {
    console.error("[voice] Connexion impossible :", err.message);
    scheduleRetry(client, 60_000);
    return null;
  });
  if (!connection) return;

  bindConnectionSafeguards(connection, client, guild);
  startVacuumRandomizer(connection, guild, channel);
}

module.exports = { startVoicePresence };
