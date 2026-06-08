const { PermissionFlagsBits, ChannelType } = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  generateDependencyReport,
} = require("@discordjs/voice");

const CONNECT_TIMEOUT_MS = 60_000;
const MAX_CONNECT_ATTEMPTS = 4;

let voiceCryptoReady = null;
let depsLogged = false;

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
      selfMute: true,
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(`[voice] ${oldState.status} -> ${newState.status}`);
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

let retryTimer = null;

function scheduleRetry(client, delayMs) {
  if (retryTimer) return;
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

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      console.warn("[voice] Deconnecte — retry dans 30 s.");
      connection.destroy();
      scheduleRetry(client, 30_000);
    }
  });
}

module.exports = { startVoicePresence };
