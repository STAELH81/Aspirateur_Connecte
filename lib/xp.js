const path = require("path");
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "xp.json"), { defaultData: {} });

const XP_MIN = 15;
const XP_MAX = 25;
const COOLDOWN_MS = 60_000;

const cooldowns = new Map();

function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

function levelFromXp(xp) {
  let level = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
  }
  return { level, xpInLevel: xp, xpNeeded: xpForLevel(level) };
}

function getProfile(userId) {
  const data = store.load();
  if (!data[userId]) {
    data[userId] = { totalXp: 0 };
    store.save(data);
  }
  const totalXp = data[userId].totalXp || 0;
  const { level, xpInLevel, xpNeeded } = levelFromXp(totalXp);
  return { totalXp, level, xpInLevel, xpNeeded };
}

function addXp(userId, amount) {
  const data = store.load();
  const before = getProfile(userId);
  if (!data[userId]) data[userId] = { totalXp: 0 };
  data[userId].totalXp += Math.floor(amount);
  store.save(data);
  const after = getProfile(userId);
  return {
    gained: Math.floor(amount),
    leveledUp: after.level > before.level,
    before,
    after,
  };
}

function tryMessageXp(userId) {
  const last = cooldowns.get(userId) || 0;
  if (Date.now() - last < COOLDOWN_MS) return null;
  cooldowns.set(userId, Date.now());

  const amount =
    XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
  return addXp(userId, amount);
}

function getLeaderboard(limit = 10) {
  const data = store.load();
  return Object.entries(data)
    .map(([id, row]) => {
      const { level, totalXp } = getProfile(id);
      return { id, level, totalXp };
    })
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, limit);
}

module.exports = {
  getProfile,
  tryMessageXp,
  getLeaderboard,
  xpForLevel,
};
