const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { COLOR_UI } = require("./personality");
const { isMoneyHubChannel, getMoneyHubChannelId } = require("./gamblingChannel");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const coopGoal = require("./coopGoal");
const economyLog = require("./economyLog");

const boardStore = require("./jsonStore").createStore(
  path.join(__dirname, "..", "data", "quests-board.json"),
  { defaultData: () => ({ messages: [] }) }
);

const BOARD_REFRESH_MS = 10_000;
const SITE_URL = "aspirateurconnecte.netlify.app";

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
  if (status.goalMet && !status.eligible) return "⚫";
  if (status.played) return "🟠";
  return "🔴";
}

function dailyDot(userId) {
  return economy.hasDailyToday(userId) ? "🟢" : "🔴";
}

function workDot(userId) {
  return economy.hasWorkToday(userId) ? "🟢" : "🔴";
}

function countDots(rows) {
  const tally = (key, dot) => rows.filter((r) => r[key] === dot).length;
  return {
    quest: {
      g: tally("quest", "🟢"),
      o: tally("quest", "🟠"),
      r: tally("quest", "🔴"),
    },
    coop: {
      g: tally("coop", "🟢"),
      o: tally("coop", "🟠"),
      r: tally("coop", "🔴"),
    },
  };
}

function coopProgressBar(progress, goal, width = 8) {
  const filled = Math.min(width, Math.round((progress / goal) * width)) || 0;
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

async function streakPulseLine(guild) {
  const tops = gamblingProgress.getTopQuestStreaks(1);
  if (!tops.length) return null;
  const top = tops[0];
  let name = top.id.slice(0, 8);
  if (guild) {
    const member = await guild.members.fetch(top.id).catch(() => null);
    name = member?.displayName || member?.user?.username || name;
  }
  return `🔥 Serie : **${top.streak}j** · ${name}`;
}

async function coopTopLine(guild) {
  const top = coopGoal.getTopContributors(3);
  if (!top.length) return null;
  const medals = ["🥇", "🥈", "🥉"];
  const parts = [];
  for (const entry of top) {
    let name = entry.id.slice(0, 8);
    if (guild) {
      const member = await guild.members.fetch(entry.id).catch(() => null);
      name = member?.displayName || member?.user?.username || name;
    }
    parts.push(`${medals[entry.rank - 1] || "•"} ${name} **${entry.games}**`);
  }
  return `**Top coop** · ${parts.join(" · ")}`;
}

function checkQuestsChannel(interaction) {
  if (isMoneyHubChannel(interaction.channel)) return { ok: true };
  return {
    ok: false,
    message: `Utilise le panneau money dans <#${getMoneyHubChannelId()}>.`,
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

function graphemeWidth(g) {
  if (!g) return 0;
  if (/^\p{Extended_Pictographic}/u.test(g)) return 2;
  if (/\p{M}/u.test(g)) return 0;
  const cp = g.codePointAt(0);
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

function visualWidth(str) {
  let w = 0;
  for (const g of [...String(str)]) w += graphemeWidth(g);
  return w;
}

function truncateVisual(str, maxWidth) {
  let w = 0;
  let out = "";
  for (const g of [...String(str)]) {
    const gw = graphemeWidth(g);
    if (w + gw > maxWidth) {
      if (w + 1 <= maxWidth) out += "…";
      return out;
    }
    out += g;
    w += gw;
  }
  return out;
}

function padVisual(str, width) {
  const truncated = truncateVisual(str, width);
  const pad = width - visualWidth(truncated);
  return truncated + " ".repeat(Math.max(0, pad));
}

function tableDisplayName(member, userId) {
  const username = member?.user?.username || userId.slice(0, 8);
  const display = member?.displayName || username;
  // Code block Discord : seuls les noms ASCII s'alignent (pseudos stylés Unicode)
  if (/^[\x20-\x7E]+$/.test(display) && display.length <= 11) return display;
  if (/^[\x20-\x7E]+$/.test(username) && username.length <= 11) return username;
  return username.slice(0, 11);
}

function padTableName(str, width) {
  const s = String(str).slice(0, width);
  if (/^[\x20-\x7E]*$/.test(s)) return s.padEnd(width, " ");
  return padVisual(s, width);
}

function buildTableBlock(rows) {
  const nameCol = 12;
  const header = `${padTableName("Nom", nameCol)}  Q  C  D  W`;
  const body = rows.map(
    (r) => `${padTableName(r.name, nameCol)}  ${r.quest}  ${r.coop}  ${r.daily}  ${r.work}`
  );
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

async function prefetchMembers(guild, ids) {
  if (!guild || !ids.length) return;
  for (let i = 0; i < ids.length; i += 100) {
    await guild.members.fetch({ user: ids.slice(i, i + 100) }).catch(() => {});
  }
}

async function resolveRows(guild) {
  const ids = listTrackedUserIds();
  const rows = [];

  await prefetchMembers(guild, ids);

  for (const id of ids) {
    const member = guild?.members.cache.get(id) ?? null;
    if (guild && !member) continue;

    const name = tableDisplayName(member, id);
    const quest = gamblingProgress.getQuestStatus(id);
    const coop = coopGoal.getStatus(id);
    rows.push({
      name,
      daily: dailyDot(id),
      work: workDot(id),
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
        .setCustomId("quests:panel:daily")
        .setLabel("Daily")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("quests:panel:work")
        .setLabel("Work")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("quests:panel:claim-quest")
        .setLabel("Quetes du jour")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("quests:panel:claim-coop")
        .setLabel("Coop du jour")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("quests:panel:my-quest")
        .setLabel("Infos quotidiennes")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("quests:panel:streak-tiers")
        .setLabel("Paliers serie")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("quests:panel:refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function buildEmbeds(rows, guild) {
  const quest = gamblingProgress.getCurrentQuest();
  const recap = gamblingProgress.getDailyRecap();
  const streakLine = await streakPulseLine(guild);
  const coopTop = await coopTopLine(guild);
  const coopBar = coopProgressBar(recap.totalGames, coopGoal.GOAL_GAMES);

  const legend = [
    `**Quete** — ${quest.label} · +**${quest.reward}** coins`,
    "",
    `**Coop** — **${recap.totalGames}/${coopGoal.GOAL_GAMES}** \`${coopBar}\` · +**${coopGoal.REWARD_COINS}**`,
    coopTop,
    "",
    "Tableau : **Q** quete · **C** coop · **D** daily · **W** work",
    "Pastilles : 🟢 fait · 🟠 a claim · 🔴 pas fait · ⚫ coop trop tard",
    streakLine,
  ]
    .filter(Boolean)
    .join("\n");

  const baseEmbed = () =>
    new EmbedBuilder()
      .setColor(COLOR_UI)
      .setTitle("Money")
      .setDescription(legend)
      .setFooter({
        text: `Maj auto ~${BOARD_REFRESH_MS / 1000}s · msgs bleus ~5 min`,
      });

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
            .setTitle(`Money (suite ${Math.floor(i / chunkSize) + 1})`)
            .addFields({
              name: "Suivi membres",
              value: buildTableBlock(chunk).slice(0, 1024),
            });

    if (i === 0) {
      embed.setTimestamp();
    }
    embeds.push(embed);
  }

  return embeds.slice(0, 10);
}

async function buildBoardPayload(guild) {
  const rows = await resolveRows(guild);
  const embeds = await buildEmbeds(rows, guild);
  return { embeds, components: panelRows() };
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

  const before = economy.getBalance(userId);
  const result = gamblingProgress.claimQuest(userId);
  if (!result.ok) {
    await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
    return;
  }

  economyLog
    .logTx(interaction.client, {
      userId,
      action: "Quete du jour — claim",
      balanceBefore: before,
      balanceAfter: result.balance,
      details: [
        `**${result.questLabel}**`,
        result.streakBonus ? `Serie **${result.streak}j** · bonus **+${result.streakBonus}**` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .catch(() => {});

  const gainLines = [
    `Quete validee : **${result.questLabel}**`,
    `Gain : **+${result.reward}** coins`,
  ];
  if (result.streakBonus) {
    gainLines.push(`Serie **${result.streak}j** · bonus **+${result.streakBonus}** coins`);
  }
  gainLines.push(`Solde : **${result.balance}** coins`);

  await interaction.reply({
    content: gainLines.join("\n"),
    flags: MessageFlags.Ephemeral,
  });
  requestBoardRefresh(interaction.client);
}

async function handleQuestsPanelClaimCoop(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const userId = interaction.user.id;
  const coopStatus = coopGoal.getStatus(userId);
  const before = economy.getBalance(userId);
  const result = coopGoal.claimReward(userId);

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

  economyLog
    .logTx(interaction.client, {
      userId,
      action: "Objectif commu — claim",
      balanceBefore: before,
      balanceAfter: result.balance,
      details: [
        `Bonus coop **+${result.reward}** coins`,
        result.mvpBonus ? `Bonus MVP **+${result.mvpBonus}** coins` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .catch(() => {});

  const gainLines = [
    `Bonus coop valide ! **+${result.reward}** coins`,
    result.mvpBonus ? `bonus = **+${result.mvpBonus}** coins` : null,
    `Total : **+${result.total}** coins`,
    `Solde : **${result.balance}** coins`,
  ].filter(Boolean);

  await interaction.reply({
    content: gainLines.join("\n"),
    flags: MessageFlags.Ephemeral,
  });
  requestBoardRefresh(interaction.client);
}

async function handleQuestsPanelMyQuest(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const userId = interaction.user.id;
  const quest = gamblingProgress.getQuestStatus(userId);
  const coop = coopGoal.getStatus(userId);
  const streak = gamblingProgress.getQuestStreakInfo(userId);
  const preview = gamblingProgress.previewClaimStreakBonus(userId);

  const lines = [
    `**Quete** — ${quest.label}`,
    `Progression : **${gamblingProgress.questProgressField(quest)}** (+${quest.reward} coins)`,
    streak.streak > 0
      ? `Serie : **${streak.streak}j** en cours · record **${streak.best}j**`
      : `Serie : record **${streak.best}j**`,
    quest.completed && !quest.claimed && preview.bonus
      ? `Au claim : serie **${preview.streak}j** · bonus **+${preview.bonus}** coins`
      : null,
    "",
    `**Coop** — **${coop.progress}/${coop.goal}** parties serveur`,
    coop.claimed
      ? "Coop : deja reclamee aujourd'hui."
      :     coop.canClaim
        ? `Coop : **Coop du jour** disponible (+${coop.totalReward} coins${coop.mvpBonus ? `, bonus MVP +${coop.mvpBonus}` : ""}).`
        : coop.goalMet && !coop.eligible
          ? "Coop : objectif atteint avant ta 1re partie — trop tard (⚫)."
          : coop.goalMet
            ? "Coop : joue au casino puis **Coop du jour**."
            : `Coop : encore **${coop.left}** partie(s) serveur.`,
  ].filter(Boolean);

  await interaction.reply({
    content: lines.join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleQuestsPanelStreakTiers(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const userId = interaction.user.id;
  const streak = gamblingProgress.getQuestStreakInfo(userId);
  const tiers = gamblingProgress.getStreakTierStatus(userId);

  const lines = [
    `**Serie quetes** — **${streak.streak}j** en cours · record **${streak.best}j**`,
    "",
    ...tiers.map((t) => {
      if (t.claimed) return `• **${t.days}j** (+${t.bonus}) — deja reclame`;
      if (t.canClaim) return `• **${t.days}j** (+${t.bonus}) — **pret a claim**`;
      return `• **${t.days}j** (+${t.bonus}) — serie **${streak.streak}/${t.days}j**`;
    }),
  ];

  const claimable = tiers.filter((t) => t.canClaim);
  const components = [];
  if (claimable.length) {
    components.push(
      new ActionRowBuilder().addComponents(
        ...claimable.slice(0, 5).map((t) =>
          new ButtonBuilder()
            .setCustomId(`quests:panel:streak-claim:${t.days}`)
            .setLabel(`Claim ${t.days}j (+${t.bonus})`)
            .setStyle(ButtonStyle.Success)
        )
      )
    );
  }

  await interaction.reply({
    content: lines.join("\n"),
    components,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleQuestsPanelStreakClaim(interaction, tierDays) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const userId = interaction.user.id;
  const before = economy.getBalance(userId);
  const result = gamblingProgress.claimStreakTier(userId, tierDays);

  if (!result.ok) {
    await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
    return;
  }

  economyLog
    .logTx(interaction.client, {
      userId,
      action: "Palier serie — claim",
      balanceBefore: before,
      balanceAfter: result.balance,
      details: `Serie **${result.streak}j** · palier **${result.days}j** · **+${result.bonus}** coins`,
    })
    .catch(() => {});

  await interaction.reply({
    content: [
      `Palier **${result.days}j** reclame ! **+${result.bonus}** coins`,
      `Serie actuelle : **${result.streak}j**`,
      `Solde : **${result.balance}** coins`,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleQuestsPanelRefresh(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;

  const deferred = await interaction.deferUpdate().catch(() => false);
  if (!deferred) return;

  try {
    const payload = await buildBoardPayload(interaction.guild);
    await interaction.editReply(payload);
  } catch (err) {
    if (err.code !== 10062) {
      console.error("[quests-board] refresh", err);
    }
  }
}

async function handleQuestsPanelDaily(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;
  const { handleHubDailyWork } = require("./economyPanels");
  await handleHubDailyWork(interaction, "daily");
}

async function handleQuestsPanelWork(interaction) {
  if (!(await replyIfWrongQuestsChannel(interaction))) return;
  const { handleHubDailyWork } = require("./economyPanels");
  await handleHubDailyWork(interaction, "work");
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
  }, BOARD_REFRESH_MS);
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
  handleQuestsPanelMyQuest,
  handleQuestsPanelStreakTiers,
  handleQuestsPanelStreakClaim,
  handleQuestsPanelRefresh,
  handleQuestsPanelDaily,
  handleQuestsPanelWork,
  replyIfWrongQuestsChannel,
  questDot,
  coopDot,
  dailyDot,
  workDot,
};
