const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { COLOR_UI } = require("./personality");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const coopGoal = require("./coopGoal");

const boardStore = require("./jsonStore").createStore(
  path.join(__dirname, "..", "data", "quests-board.json"),
  { defaultData: () => ({ messages: [] }) }
);

let refreshTimer = null;
let refreshPending = false;

function questDot(status) {
  if (status.claimed) return "🟢";
  if (status.completed) return "🟠";
  return "🔴";
}

function coopDot(status) {
  if (status.claimed) return "🟢";
  if (status.canClaim) return "🟠";
  if (status.played) return "🟠";
  return "🔴";
}

function listTrackedUserIds() {
  const ids = new Set();
  for (const row of economy.getLeaderboard(Number.POSITIVE_INFINITY)) ids.add(row.id);
  for (const id of gamblingProgress.listUserIds()) ids.add(id);
  return [...ids];
}

function pad(str, width) {
  const s = String(str).slice(0, width);
  return s.padEnd(width, " ");
}

function buildTableBlock(rows) {
  const header = `${pad("Nom", 18)} Quête  Coop`;
  const body = rows.map((r) => `${pad(r.name, 18)} ${r.quest}      ${r.coop}`);
  return ["```", header, ...body, "```"].join("\n");
}

async function resolveRows(guild) {
  const ids = listTrackedUserIds();
  const rows = [];

  for (const id of ids) {
    const member = guild ? await guild.members.fetch(id).catch(() => null) : null;
    if (guild && !member) continue;

    const name =
      member?.displayName || member?.user?.username || id.slice(0, 8);
    const quest = gamblingProgress.getQuestStatus(id);
    const coop = coopGoal.getStatus(id);
    rows.push({
      name,
      quest: questDot(quest),
      coop: coopDot(coop),
      sort: name.toLowerCase(),
    });
  }

  rows.sort((a, b) => a.sort.localeCompare(b.sort, "fr"));
  return rows;
}

function buildEmbeds(rows) {
  const quest = gamblingProgress.getCurrentQuest();
  const recap = gamblingProgress.getDailyRecap();

  const legend = [
    "**Quête du jour** — 🟢 réclamée · 🟠 faite, pas réclamée · 🔴 pas faite",
    "**Coop du jour** — 🟢 réclamée · 🟠 à réclamer / en cours · 🔴 pas participé",
    "",
    `Quête : **${quest.label}** (+${quest.reward} coins)`,
    `Coop serveur : **${recap.totalGames}/${coopGoal.GOAL_GAMES}** parties casino`,
  ].join("\n");

  if (rows.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(COLOR_UI)
        .setTitle("Quêtes & Coop — tableau du jour")
        .setDescription(`${legend}\n\nAucun joueur avec des coins pour l'instant.`),
    ];
  }

  const embeds = [];
  const chunkSize = 35;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const embed = new EmbedBuilder()
      .setColor(COLOR_UI)
      .setTitle(
        i === 0
          ? "Quêtes & Coop — tableau du jour"
          : `Quêtes & Coop (suite ${Math.floor(i / chunkSize) + 1})`
      )
      .setDescription(i === 0 ? legend : "Suite du tableau.")
      .addFields({ name: "Membres", value: buildTableBlock(chunk).slice(0, 1024) });

    if (i === 0) {
      embed.setFooter({ text: "Mis à jour auto · /quests panel pour reposter" });
    }
    embeds.push(embed);
  }

  return embeds.slice(0, 10);
}

async function buildBoardPayload(guild) {
  const rows = await resolveRows(guild);
  return { embeds: buildEmbeds(rows) };
}

function registerBoardMessage(message) {
  if (!message?.id || !message.channelId || !message.guildId) return;
  const data = boardStore.load();
  const messages = (data.messages || []).filter((m) => m.messageId !== message.id);
  messages.push({
    guildId: message.guildId,
    channelId: message.channelId,
    messageId: message.id,
  });
  data.messages = messages.slice(-5);
  boardStore.save(data);
}

async function refreshBoards(client) {
  const data = boardStore.load();
  const messages = data.messages || [];
  if (!messages.length) return;

  const kept = [];
  for (const tracked of messages) {
    const guild = client.guilds.cache.get(tracked.guildId);
    if (!guild) continue;
    const channel = guild.channels.cache.get(tracked.channelId);
    if (!channel?.isTextBased()) continue;
    try {
      const msg = await channel.messages.fetch(tracked.messageId);
      const payload = await buildBoardPayload(guild);
      await msg.edit(payload);
      kept.push(tracked);
    } catch {
      /* message supprime */
    }
  }
  data.messages = kept;
  boardStore.save(data);
}

function scheduleBoardRefresh(client) {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    refreshBoards(client).catch((err) => console.error("[quests-board]", err));
  }, 60_000);
}

function requestBoardRefresh(client) {
  if (!client || refreshPending) return;
  refreshPending = true;
  refreshBoards(client)
    .catch((err) => console.error("[quests-board]", err))
    .finally(() => {
      refreshPending = false;
    });
}

module.exports = {
  buildBoardPayload,
  registerBoardMessage,
  refreshBoards,
  scheduleBoardRefresh,
  requestBoardRefresh,
  questDot,
  coopDot,
};
