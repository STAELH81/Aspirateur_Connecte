const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
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

function checkQuestsChannel(interaction) {
  const configured = process.env.QUESTS_BOARD_CHANNEL_ID?.trim();
  if (!configured) return { ok: true };
  if (interaction.channelId === configured) return { ok: true };
  const name = String(interaction.channel?.name || "").toLowerCase();
  if (name.includes("quete") || name.includes("quest")) return { ok: true };
  return {
    ok: false,
    message: `Utilise le panneau quetes dans <#${configured}>.`,
  };
}

async function replyIfWrongQuestsChannel(interaction) {
  const check = checkQuestsChannel(interaction);
  if (check.ok) return true;
  await interaction.reply({
    content: check.message,
    flags: MessageFlags.Ephemeral,
  });
  return false;
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

function activityScore(userId) {
  const quest = gamblingProgress.getQuestStatus(userId);
  const recap = gamblingProgress.getDailyRecap();
  const row = recap.entries.find((e) => e.id === userId);
  let score = 0;
  if (quest.claimed || quest.completed || (quest.progress || 0) > 0) score += 100;
  score += row?.games || 0;
  return score;
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
      activity: activityScore(id),
    });
  }

  rows.sort((a, b) => {
    if (b.activity !== a.activity) return b.activity - a.activity;
    return a.sort.localeCompare(b.sort, "fr");
  });
  return rows;
}

function panelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("quests:panel:claim-quest")
        .setLabel("Claim quete")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("quests:panel:claim-coop")
        .setLabel("Claim coop")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("quests:panel:refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function buildEmbeds(rows) {
  const quest = gamblingProgress.getCurrentQuest();
  const recap = gamblingProgress.getDailyRecap();

  const legend = [
    "**Quête** — 🟢 réclamée · 🟠 faite / à claim · 🔴 pas faite",
    "**Coop** — 🟢 réclamée · 🟠 eligible / en cours · 🔴 pas participé",
    "",
    "**Claim quete** / **Claim coop** — ephemere · **Refresh** — maj le tableau.",
  ].join("\n");

  const baseEmbed = () =>
    new EmbedBuilder()
      .setColor(COLOR_UI)
      .setTitle("Quêtes Center")
      .setDescription(legend)
      .addFields(
        {
          name: "Quête du jour",
          value: `**${quest.label}**\nRecompense : **+${quest.reward}** coins`,
          inline: true,
        },
        {
          name: "Coop serveur",
          value: `**${recap.totalGames}/${coopGoal.GOAL_GAMES}** parties casino\nBonus : **+${coopGoal.REWARD_COINS}** coins`,
          inline: true,
        },
        {
          name: "Mis a jour",
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
          inline: true,
        }
      );

  if (rows.length === 0) {
    return [
      baseEmbed().addFields({
        name: "Membres",
        value: "Aucun joueur avec des coins pour l'instant.",
      }),
    ];
  }

  const embeds = [];
  const chunkSize = 35;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const embed =
      i === 0
        ? baseEmbed().addFields({
            name: "Suivi membres",
            value: buildTableBlock(chunk).slice(0, 1024),
          })
        : new EmbedBuilder()
            .setColor(COLOR_UI)
            .setTitle(`Quêtes Center (suite ${Math.floor(i / chunkSize) + 1})`)
            .addFields({
              name: "Suivi membres",
              value: buildTableBlock(chunk).slice(0, 1024),
            });

    if (i === 0) {
      embed.setFooter({ text: "Mis à jour auto · /quests panel pour reposter" });
    }
    embeds.push(embed);
  }

  return embeds.slice(0, 10);
}

async function buildBoardPayload(guild) {
  const rows = await resolveRows(guild);
  return { embeds: buildEmbeds(rows), components: panelRows() };
}

async function handleQuestsPanelClaimQuest(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const userId = interaction.user.id;
  const questStatus = gamblingProgress.getQuestStatus(userId);

  if (!questStatus.completed || questStatus.claimed) {
    await interaction.reply({
      content: [
        `Quete : **${questStatus.label}**`,
        `Progression : **${gamblingProgress.questProgressField(questStatus)}**`,
        `Recompense : **+${questStatus.reward}** coins`,
      ].join("\n"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = gamblingProgress.claimQuest(userId);
  if (!result.ok) {
    await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: [
      `Quete validee : **${result.questLabel}**`,
      `Gain : **+${result.reward}** coins`,
      `Solde : **${result.balance}** coins`,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
  requestBoardRefresh(interaction.client);
}

async function handleQuestsPanelClaimCoop(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const coopStatus = coopGoal.getStatus(interaction.user.id);
  const result = coopGoal.claimReward(interaction.user.id);

  if (!result.ok) {
    await interaction.reply({
      content: [
        `Coop : **${coopStatus.progress}/${coopStatus.goal}** parties serveur`,
        result.reason,
      ].join("\n"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: [
      `Bonus coop valide ! **+${result.reward}** coins`,
      `Solde : **${result.balance}** coins`,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
  requestBoardRefresh(interaction.client);
}

async function handleQuestsPanelRefresh(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const payload = await buildBoardPayload(interaction.guild);
  await interaction.update(payload);
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
  handleQuestsPanelClaimQuest,
  handleQuestsPanelClaimCoop,
  handleQuestsPanelRefresh,
  replyIfWrongQuestsChannel,
  questDot,
  coopDot,
};
