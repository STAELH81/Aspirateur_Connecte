const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const gamblingProgress = require("./gamblingProgress");
const { COLOR } = require("./personality");

const STATE_FILE = path.join(__dirname, "..", "data", "gazette-state.json");
const GAZETTE_HOUR = 23;
const GAZETTE_MINUTE = 59;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function todayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function resolveName(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  return member?.displayName || member?.user?.username || `<@${userId}>`;
}

async function buildGazetteEmbed(guild, recap) {
  const lines = [];
  if (recap.totalGames === 0) {
    lines.push("Personne n'a joue au casino aujourd'hui. Journee calme.");
  } else {
    lines.push(`**${recap.totalGames}** parties · **${recap.totalBet}** coins misés`);
    if (recap.topWinner) {
      lines.push(
        `Plus gros gain : **${await resolveName(guild, recap.topWinner.id)}** (+**${recap.topWinner.net}** coins)`
      );
    }
    if (recap.topLoser && recap.topLoser.net < 0) {
      lines.push(
        `Plus grosse perte : **${await resolveName(guild, recap.topLoser.id)}** (**${recap.topLoser.net}** coins)`
      );
    }
    if (recap.mostActive) {
      lines.push(
        `Plus actif : **${await resolveName(guild, recap.mostActive.id)}** (**${recap.mostActive.games}** parties)`
      );
    }
  }

  const key = recap.dayKey || todayKey();
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("La Gazette Du Gamblinnnnngggg")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Recap du ${key} · Les Girlsss` })
    .setTimestamp();
}

async function postGazette(client) {
  const channelId =
    process.env.GAMBLING_CHANNEL_ID?.trim() ||
    process.env.GAMBLING_TEST_CHANNEL_ID?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!channelId || !guildId) return;

  const day = todayKey();
  const state = loadState();
  if (state.lastPostedDayKey === day) return;

  const recap = gamblingProgress.getDailyRecap(day);
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!guild || !channel?.isTextBased()) {
    console.warn("[gazette] salon gambling introuvable.");
    return;
  }

  const embed = await buildGazetteEmbed(guild, recap);
  await channel.send({ embeds: [embed] });
  state.lastPostedDayKey = day;
  saveState(state);
}

function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(GAZETTE_HOUR, GAZETTE_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleGamblingGazette(client) {
  const channelId =
    process.env.GAMBLING_CHANNEL_ID?.trim() ||
    process.env.GAMBLING_TEST_CHANNEL_ID?.trim();
  if (!channelId) {
    console.log("Tip: GAMBLING_CHANNEL_ID pour La Gazette Du Gamblinnnnngggg (23h59).");
    return;
  }

  const tick = async () => {
    try {
      await postGazette(client);
    } catch (err) {
      console.error("[gazette]", err);
    }
    setTimeout(tick, 24 * 60 * 60 * 1000);
  };

  setTimeout(tick, msUntilNextRun());
}

module.exports = { scheduleGamblingGazette, postGazette };
