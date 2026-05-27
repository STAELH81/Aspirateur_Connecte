const path = require("path");
const { createStore } = require("./jsonStore");
const economy = require("./economy");

const store = createStore(path.join(__dirname, "..", "data", "gambling-progress.json"), {
  defaultData: () => ({ users: {}, quest: {} }),
});

const QUESTS = [
  { id: "daily_once", label: "Faire ton Daily", type: "daily", target: 1, reward: 120 },
  { id: "work_twice", label: "Faire 2 Work", type: "work", target: 2, reward: 120 },
  { id: "casino_play_3", label: "Jouer 3 parties casino", type: "casino_play", target: 3, reward: 120 },
  { id: "casino_win_1", label: "Gagner 1 partie casino", type: "casino_win", target: 1, reward: 140 },
  { id: "casino_bet_150", label: "Miser 150 coins au casino", type: "casino_bet_total", target: 150, reward: 160 },
];

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashDay(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function getQuestForDay(key) {
  const idx = hashDay(key) % QUESTS.length;
  return QUESTS[idx];
}

function ensureData() {
  const data = store.load();
  data.users = data.users || {};
  data.quest = data.quest || {};
  const today = dayKey();
  if (data.quest.dayKey !== today || !data.quest.questId) {
    data.quest.dayKey = today;
    data.quest.questId = getQuestForDay(today).id;
  }
  return data;
}

function getUser(data, userId) {
  data.users[userId] = data.users[userId] || {};
  const u = data.users[userId];
  u.quest = u.quest || {};
  u.stats = u.stats || {
    casinoGames: 0,
    casinoWins: 0,
    casinoNet: 0,
    totalBet: 0,
    byGame: {},
    biggestWin: 0,
    biggestLoss: 0,
  };
  return u;
}

function getCurrentQuest() {
  const data = ensureData();
  const quest = QUESTS.find((q) => q.id === data.quest.questId) || getQuestForDay(data.quest.dayKey);
  return { ...quest, dayKey: data.quest.dayKey };
}

function getQuestStatus(userId) {
  const data = ensureData();
  const quest = getCurrentQuest();
  const user = getUser(data, userId);
  if (user.quest.dayKey !== quest.dayKey) {
    user.quest = { dayKey: quest.dayKey, progress: 0, claimed: false };
    store.save(data);
  }
  const progress = Math.max(0, Math.floor(user.quest.progress || 0));
  const completed = progress >= quest.target;
  return {
    ...quest,
    progress,
    completed,
    claimed: Boolean(user.quest.claimed),
  };
}

function questProgressField(status) {
  const p = Math.min(status.progress, status.target);
  if (status.claimed) return "Reclamee";
  if (status.completed) return "Terminee (clique sur Quete)";
  return `${p}/${status.target}`;
}

function recordDaily(userId) {
  const data = ensureData();
  const quest = getCurrentQuest();
  const user = getUser(data, userId);
  if (user.quest.dayKey !== quest.dayKey) user.quest = { dayKey: quest.dayKey, progress: 0, claimed: false };
  if (!user.quest.claimed && quest.type === "daily") user.quest.progress += 1;
  store.save(data);
}

function recordWork(userId) {
  const data = ensureData();
  const quest = getCurrentQuest();
  const user = getUser(data, userId);
  if (user.quest.dayKey !== quest.dayKey) user.quest = { dayKey: quest.dayKey, progress: 0, claimed: false };
  if (!user.quest.claimed && quest.type === "work") user.quest.progress += 1;
  store.save(data);
}

function recordCasinoRound(userId, game, result) {
  const data = ensureData();
  const quest = getCurrentQuest();
  const user = getUser(data, userId);
  if (user.quest.dayKey !== quest.dayKey) user.quest = { dayKey: quest.dayKey, progress: 0, claimed: false };

  const stats = user.stats;
  stats.casinoGames += 1;
  if (result.won || result.net > 0) stats.casinoWins += 1;
  stats.casinoNet += Number(result.net || 0);
  stats.totalBet += Number(result.bet || 0);
  stats.byGame[game] = (stats.byGame[game] || 0) + 1;
  if (Number(result.net || 0) > stats.biggestWin) stats.biggestWin = Number(result.net || 0);
  if (Number(result.net || 0) < stats.biggestLoss) stats.biggestLoss = Number(result.net || 0);

  if (!user.quest.claimed) {
    if (quest.type === "casino_play") user.quest.progress += 1;
    if (quest.type === "casino_win" && (result.won || result.net > 0)) user.quest.progress += 1;
    if (quest.type === "casino_bet_total") user.quest.progress += Number(result.bet || 0);
  }

  store.save(data);
}

function claimQuest(userId) {
  const data = ensureData();
  const quest = getCurrentQuest();
  const user = getUser(data, userId);
  if (user.quest.dayKey !== quest.dayKey) user.quest = { dayKey: quest.dayKey, progress: 0, claimed: false };
  const progress = Math.floor(user.quest.progress || 0);
  if (user.quest.claimed) return { ok: false, reason: "Quete deja reclamee aujourd'hui." };
  if (progress < quest.target) {
    return { ok: false, reason: `Quete non terminee (${Math.min(progress, quest.target)}/${quest.target}).` };
  }
  user.quest.claimed = true;
  const balance = economy.addCoins(userId, quest.reward);
  store.save(data);
  return { ok: true, reward: quest.reward, balance, questLabel: quest.label };
}

function getProfile(userId) {
  const data = ensureData();
  const user = getUser(data, userId);
  const stats = user.stats;
  const games = Math.max(1, stats.casinoGames);
  const winrate = Math.round((stats.casinoWins / games) * 100);
  const favoriteGame =
    Object.entries(stats.byGame || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "aucun";
  return {
    balance: economy.getBalance(userId),
    casinoGames: stats.casinoGames || 0,
    casinoWins: stats.casinoWins || 0,
    winrate,
    casinoNet: stats.casinoNet || 0,
    totalBet: stats.totalBet || 0,
    favoriteGame,
    biggestWin: stats.biggestWin || 0,
    biggestLoss: stats.biggestLoss || 0,
  };
}

module.exports = {
  getCurrentQuest,
  getQuestStatus,
  questProgressField,
  recordDaily,
  recordWork,
  recordCasinoRound,
  claimQuest,
  getProfile,
};
