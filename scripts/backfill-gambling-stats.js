require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "gambling-progress.json");

function parseUserId(line) {
  const m = line.match(/<@!?(\d{17,20})>/);
  return m?.[1] || null;
}

function parseAction(line) {
  const m = line.match(/Action\s*:\s*\*\*Casino\s*·\s*([a-z0-9_ -]+)\*\*/i);
  return (m?.[1] || "").trim().toLowerCase();
}

function parseNumber(line) {
  const m = line.match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function ensureUser(map, userId) {
  if (!map[userId]) {
    map[userId] = {
      quest: { dayKey: "", progress: 0, claimed: false },
      stats: {
        casinoGames: 0,
        casinoWins: 0,
        casinoNet: 0,
        totalBet: 0,
        byGame: {},
        biggestWin: 0,
        biggestLoss: 0,
      },
    };
  }
  return map[userId];
}

function applyCasinoLog(user, game, bet, net) {
  const stats = user.stats;
  stats.casinoGames += 1;
  if (net > 0) stats.casinoWins += 1;
  stats.casinoNet += net;
  if (Number.isFinite(bet) && bet > 0) stats.totalBet += bet;
  stats.byGame[game] = (stats.byGame[game] || 0) + 1;
  if (net > stats.biggestWin) stats.biggestWin = net;
  if (net < stats.biggestLoss) stats.biggestLoss = net;
}

async function fetchAllLogMessages(channel) {
  const all = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return all;
}

function parseCasinoEmbed(embed) {
  const description = embed?.description || "";
  if (!description.includes("Action : **Casino ·")) return null;
  const lines = description.split("\n").map((x) => x.trim());
  const userId = parseUserId(lines.find((x) => x.startsWith("Joueur")) || "");
  const game = parseAction(lines.find((x) => x.startsWith("Action")) || "");
  const betLine = lines.find((x) => x.startsWith("Mise"));
  const netLine = lines.find((x) => x.startsWith("Variation"));
  const bet = betLine ? parseNumber(betLine) : 0;
  const net = netLine ? parseNumber(netLine) : null;
  if (!userId || !game || net == null) return null;
  return { userId, game, bet: bet || 0, net };
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  } catch {
    return { users: {}, quest: {} };
  }
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const channelId = process.env.ECONOMY_LOG_CHANNEL_ID;
  if (!token || !channelId) {
    throw new Error("DISCORD_TOKEN et ECONOMY_LOG_CHANNEL_ID sont obligatoires.");
  }

  const dryRun = process.argv.includes("--dry-run");
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  await client.login(token);

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    throw new Error("ECONOMY_LOG_CHANNEL_ID ne pointe pas vers un salon texte.");
  }

  const messages = await fetchAllLogMessages(channel);
  const existing = loadExisting();
  existing.users = existing.users || {};
  existing.quest = existing.quest || {};

  let parsedCount = 0;
  for (const msg of messages) {
    for (const embed of msg.embeds || []) {
      const parsed = parseCasinoEmbed(embed);
      if (!parsed) continue;
      const user = ensureUser(existing.users, parsed.userId);
      applyCasinoLog(user, parsed.game, parsed.bet, parsed.net);
      parsedCount += 1;
    }
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2));
  }

  console.log(
    `[backfill-gambling-stats] casino logs: ${parsedCount}, users: ${Object.keys(existing.users).length}, mode: ${
      dryRun ? "dry-run" : "write"
    }`
  );
  await client.destroy();
}

main().catch((err) => {
  console.error("[backfill-gambling-stats] error:", err.message);
  process.exit(1);
});

