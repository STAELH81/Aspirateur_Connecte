const path = require("path");
const { createStore } = require("./jsonStore");
const economy = require("./economy");

const store = createStore(path.join(__dirname, "..", "data", "gambling-progress.json"), {
  defaultData: () => ({ users: {}, quest: {} }),
});

const QUESTS = [
  { id: "daily_once", label: "Faire ton Daily", type: "daily", target: 1, reward: 35 },
  { id: "work_twice", label: "Faire 2 Work", type: "work", target: 2, reward: 45 },
  { id: "casino_play_3", label: "Jouer 3 parties casino", type: "casino_play", target: 3, reward: 50 },
  { id: "casino_win_1", label: "Gagner 1 partie casino", type: "casino_win", target: 1, reward: 60 },
  { id: "casino_bet_150", label: "Miser 150 coins au casino", type: "casino_bet_total", target: 150, reward: 55 },
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

function ensureDaily(data) {
  const today = dayKey();
  if (!data.daily || data.daily.dayKey !== today) {
    data.daily = { dayKey: today, users: {} };
  }
  return data.daily;
}

function bumpDailyStats(daily, userId, result) {
  daily.users[userId] = daily.users[userId] || {
    games: 0,
    net: 0,
    wins: 0,
    bet: 0,
  };
  const row = daily.users[userId];
  row.games += 1;
  row.bet += Number(result.bet || 0);
  row.net += Number(result.net || 0);
  if (result.won || result.net > 0) row.wins += 1;
}

function getDailyRecap(forDay = dayKey()) {
  const data = store.load();
  const daily = data.daily;
  if (!daily || daily.dayKey !== forDay) {
    return { dayKey: forDay, totalGames: 0, totalBet: 0, entries: [] };
  }
  const entries = Object.entries(daily.users || {}).map(([id, row]) => ({
    id,
    games: row.games || 0,
    net: row.net || 0,
    bet: row.bet || 0,
    wins: row.wins || 0,
  }));
  const totalGames = entries.reduce((s, e) => s + e.games, 0);
  const totalBet = entries.reduce((s, e) => s + e.bet, 0);
  const withNet = entries.filter((e) => e.net !== 0);
  const topWinner = withNet.length
    ? withNet.reduce((a, b) => (b.net > a.net ? b : a))
    : null;
  const topLoser = withNet.length
    ? withNet.reduce((a, b) => (b.net < a.net ? b : a))
    : null;
  const mostActive = entries.length
    ? entries.reduce((a, b) => (b.games > a.games ? b : a))
    : null;
  return { dayKey: forDay, totalGames, totalBet, topWinner, topLoser, mostActive, entries };
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
  u.questMeta = u.questMeta || { streak: 0, best: 0, lastClaimDay: "" };
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

const STREAK_BONUS_PER_DAY = 3;
const STREAK_BONUS_MAX = 21;

function yesterdayKey(ts = Date.now()) {
  return dayKey(ts - 86_400_000);
}

function streakBonusCoins(streak) {
  if (!streak || streak < 2) return 0;
  return Math.min(STREAK_BONUS_MAX, (streak - 1) * STREAK_BONUS_PER_DAY);
}

function getQuestStreakInfo(userId) {
  const data = ensureData();
  const user = getUser(data, userId);
  const meta = user.questMeta || { streak: 0, best: 0, lastClaimDay: "" };
  const today = dayKey();
  let active = meta.streak || 0;
  if (meta.lastClaimDay !== today && meta.lastClaimDay !== yesterdayKey()) {
    active = 0;
  }
  return {
    streak: active,
    best: meta.best || 0,
    lastClaimDay: meta.lastClaimDay || "",
    nextBonus: streakBonusCoins(active + 1),
  };
}

function bumpQuestStreak(user, today) {
  user.questMeta = user.questMeta || { streak: 0, best: 0, lastClaimDay: "" };
  const meta = user.questMeta;
  if (meta.lastClaimDay === today) return meta;

  if (meta.lastClaimDay === yesterdayKey()) {
    meta.streak = (meta.streak || 0) + 1;
  } else {
    meta.streak = 1;
  }
  meta.lastClaimDay = today;
  if (meta.streak > (meta.best || 0)) meta.best = meta.streak;
  return meta;
}

function getTopQuestStreaks(limit = 3) {
  const data = ensureData();
  const today = dayKey();
  const yesterday = yesterdayKey();
  const rows = [];

  for (const [id, user] of Object.entries(data.users || {})) {
    const meta = user.questMeta;
    if (!meta?.lastClaimDay) continue;
    let active = meta.streak || 0;
    if (meta.lastClaimDay !== today && meta.lastClaimDay !== yesterday) active = 0;
    if (active < 2) continue;
    rows.push({ id, streak: active, best: meta.best || active });
  }

  rows.sort((a, b) => b.streak - a.streak || b.best - a.best);
  return rows.slice(0, limit);
}

function previewClaimStreakBonus(userId) {
  const data = ensureData();
  const user = getUser(data, userId);
  const meta = user.questMeta || { streak: 0, lastClaimDay: "" };
  const today = dayKey();
  if (meta.lastClaimDay === today) {
    return { streak: meta.streak || 0, bonus: 0 };
  }
  let next = 1;
  if (meta.lastClaimDay === yesterdayKey()) next = (meta.streak || 0) + 1;
  return { streak: next, bonus: streakBonusCoins(next) };
}

function questProgressField(status) {
  const p = Math.min(status.progress, status.target);
  if (status.claimed) return "Reclamee";
  if (status.completed) return "Terminee (Quetes du jour sur panneau Quetes)";
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

  const daily = ensureDaily(data);
  bumpDailyStats(daily, userId, result);

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
  const meta = bumpQuestStreak(user, quest.dayKey);
  const bonus = streakBonusCoins(meta.streak);
  const balance = economy.addCoins(userId, quest.reward + bonus);
  store.save(data);
  return {
    ok: true,
    reward: quest.reward,
    streakBonus: bonus,
    streak: meta.streak,
    balance,
    questLabel: quest.label,
  };
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

function listUserIds() {
  const data = ensureData();
  return Object.keys(data.users || {});
}

module.exports = {
  getCurrentQuest,
  getQuestStatus,
  questProgressField,
  recordDaily,
  recordWork,
  recordCasinoRound,
  claimQuest,
  getQuestStreakInfo,
  getTopQuestStreaks,
  previewClaimStreakBonus,
  streakBonusCoins,
  getProfile,
  getDailyRecap,
  listUserIds,
};
