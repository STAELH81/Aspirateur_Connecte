const path = require("path");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const gamblingGazette = require("./gamblingGazette");

const store = createStore(path.join(__dirname, "..", "data", "coop-goal.json"), {
  defaultData: () => ({ dayKey: "", claims: {} }),
});

const GOAL_GAMES = 30;
const REWARD_COINS = 25;

function ensureToday() {
  const data = store.load();
  const today = gamblingGazette.todayKey();
  if (data.dayKey !== today) {
    data.dayKey = today;
    data.claims = {};
    store.save(data);
  }
  return data;
}

function getStatus(userId) {
  const data = ensureToday();
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  const totalGames = recap.totalGames;
  const userRow = recap.entries.find((e) => e.id === userId);
  const played = (userRow?.games || 0) > 0;
  const claimed = Boolean(data.claims[userId]);
  const goalMet = totalGames >= GOAL_GAMES;
  const canClaim = goalMet && played && !claimed;

  return {
    dayKey: data.dayKey,
    goal: GOAL_GAMES,
    progress: totalGames,
    reward: REWARD_COINS,
    played,
    claimed,
    goalMet,
    canClaim,
    left: Math.max(0, GOAL_GAMES - totalGames),
  };
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
  if (status.claimed) {
    return { ok: false, reason: "Bonus deja reclame aujourd'hui." };
  }

  const data = ensureToday();
  data.claims[userId] = Date.now();
  store.save(data);
  const balance = economy.addCoins(userId, REWARD_COINS);
  return { ok: true, reward: REWARD_COINS, balance };
}

module.exports = { getStatus, claimReward, GOAL_GAMES, REWARD_COINS };
