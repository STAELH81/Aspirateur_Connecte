const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const gamblingGazette = require("./gamblingGazette");
const { COLOR_SUCCESS } = require("./personality");

const store = createStore(path.join(__dirname, "..", "data", "coop-goal.json"), {
  defaultData: () => ({
    dayKey: "",
    claims: {},
    goalMetAt: null,
    eligibleUserIds: [],
    announced: false,
  }),
});

const GOAL_GAMES = 30;
const REWARD_COINS = 25;

function ensureToday() {
  const data = store.load();
  const today = gamblingGazette.todayKey();
  if (data.dayKey !== today) {
    data.dayKey = today;
    data.claims = {};
    data.goalMetAt = null;
    data.eligibleUserIds = [];
    data.announced = false;
    store.save(data);
  }
  return data;
}

function isEligible(data, userId) {
  if (!data.goalMetAt) return true;
  return (data.eligibleUserIds || []).includes(userId);
}

function getStatus(userId) {
  const data = ensureToday();
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  const totalGames = recap.totalGames;
  const userRow = recap.entries.find((e) => e.id === userId);
  const played = (userRow?.games || 0) > 0;
  const claimed = Boolean(data.claims[userId]);
  const goalMet = Boolean(data.goalMetAt) || totalGames >= GOAL_GAMES;
  const eligible = isEligible(data, userId);
  const canClaim = goalMet && played && eligible && !claimed;

  return {
    dayKey: data.dayKey,
    goal: GOAL_GAMES,
    progress: totalGames,
    reward: REWARD_COINS,
    played,
    claimed,
    goalMet,
    eligible,
    canClaim,
    left: Math.max(0, GOAL_GAMES - totalGames),
    goalMetAt: data.goalMetAt,
    eligibleCount: (data.eligibleUserIds || []).length,
  };
}

async function announceGoalMet(client, data) {
  if (data.announced) return;
  const channelId =
    process.env.GAMBLING_CHANNEL_ID?.trim() ||
    process.env.GAMBLING_TEST_CHANNEL_ID?.trim();
  if (!channelId || !client) {
    data.announced = true;
    store.save(data);
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    data.announced = true;
    store.save(data);
    return;
  }

  const questsChannelId = process.env.QUESTS_BOARD_CHANNEL_ID?.trim();
  const questsHint = questsChannelId
    ? `Reclame sur <#${questsChannelId}> : **Claim coop** — ta colonne Coop passe au 🟢.`
    : "Reclame sur le panneau quetes : **Claim coop** — ta colonne Coop passe au 🟢.";

  const eligibleCount = (data.eligibleUserIds || []).length;
  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle("Objectif commu atteint !")
    .setDescription(
      [
        `Le serveur a cumule **${GOAL_GAMES}** parties casino aujourd'hui.`,
        "",
        `**${eligibleCount}** joueur(s) eligibles — bonus **+${REWARD_COINS}** coins chacun.`,
        "Seuls ceux qui avaient deja joue **avant** le cap peuvent claim.",
        "",
        questsHint,
      ].join("\n")
    )
    .setFooter({ text: "Les Girlsss · objectif commu" });

  await channel.send({ embeds: [embed] });
  data.announced = true;
  store.save(data);
}

function lockEligibilityIfGoalReached(client) {
  const data = ensureToday();
  if (data.goalMetAt) return false;

  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  if (recap.totalGames < GOAL_GAMES) return false;

  data.goalMetAt = Date.now();
  data.eligibleUserIds = recap.entries.filter((e) => (e.games || 0) > 0).map((e) => e.id);
  store.save(data);

  announceGoalMet(client, data).catch((err) => console.error("[coop-goal]", err));
  if (client) {
    require("./questsBoard").requestBoardRefresh(client);
  }
  return true;
}

function afterCasinoRound(userId, client) {
  ensureToday();
  lockEligibilityIfGoalReached(client);
}

function claimReward(userId) {
  const status = getStatus(userId);
  if (!status.goalMet) {
    return {
      ok: false,
      reason: `Objectif commu : **${status.progress}/${status.goal}** parties casino aujourd'hui.`,
    };
  }
  if (!status.played) {
    return { ok: false, reason: "Tu dois avoir joue au moins **1** partie casino aujourd'hui." };
  }
  if (!status.eligible) {
    return {
      ok: false,
      reason:
        "L'objectif a ete atteint avant que tu joues — tu n'es pas eligible au bonus d'aujourd'hui.",
    };
  }
  if (status.claimed) {
    return { ok: false, reason: "Bonus deja reclame aujourd'hui." };
  }

  const data = ensureToday();
  data.claims[userId] = Date.now();
  store.save(data);
  const balance = economy.addCoins(userId, REWARD_COINS);
  return { ok: true, reward: REWARD_COINS, balance };
}

module.exports = {
  getStatus,
  claimReward,
  afterCasinoRound,
  lockEligibilityIfGoalReached,
  GOAL_GAMES,
  REWARD_COINS,
};
