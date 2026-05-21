const fs = require("fs");
const path = require("path");
const cfg = require("./economyConfig");

const FILE = path.join(__dirname, "..", "data", "economy.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function formatCoins(n) {
  return `**${n}** ${cfg.currency}`;
}

function getAccount(userId) {
  const data = load();
  if (!data[userId]) {
    data[userId] = {
      balance: cfg.startBalance,
      lastDaily: 0,
      lastWork: 0,
    };
    save(data);
  }
  return data[userId];
}

function getBalance(userId) {
  return getAccount(userId).balance;
}

function setBalance(userId, balance) {
  const data = load();
  const acc = getAccount(userId);
  acc.balance = Math.max(0, Math.floor(balance));
  data[userId] = acc;
  save(data);
  return acc.balance;
}

function addCoins(userId, amount) {
  return setBalance(userId, getBalance(userId) + Math.floor(amount));
}

function removeCoins(userId, amount) {
  const bal = getBalance(userId);
  const take = Math.floor(amount);
  if (bal < take) return { ok: false, balance: bal };
  return { ok: true, balance: setBalance(userId, bal - take) };
}

function maxBet(balance) {
  const fromRatio = Math.floor(balance * cfg.bet.maxBalanceRatio);
  return Math.min(cfg.bet.maxAbsolute, Math.max(cfg.bet.min, fromRatio));
}

function validateBet(userId, amount) {
  const bal = getBalance(userId);
  const mise = Math.floor(amount);
  if (mise < cfg.bet.min) {
    return { ok: false, reason: `Mise minimum : ${cfg.bet.min} ${cfg.currency}.` };
  }
  const cap = maxBet(bal);
  if (mise > cap) {
    return {
      ok: false,
      reason: `Mise max : ${cap} ${cfg.currency} (${Math.round(cfg.bet.maxBalanceRatio * 100)}% de ton solde).`,
    };
  }
  if (bal < mise) {
    return { ok: false, reason: `Solde : ${bal} ${cfg.currency}.` };
  }
  return { ok: true, mise, balance: bal };
}

function msUntilReady(lastTime, cooldownMs) {
  const left = lastTime + cooldownMs - Date.now();
  return left > 0 ? left : 0;
}

function tryDaily(userId) {
  const data = load();
  const acc = getAccount(userId);
  const wait = msUntilReady(acc.lastDaily, cfg.daily.cooldownMs);
  if (wait > 0) {
    return { ok: false, waitMs: wait };
  }
  const gain =
    cfg.daily.min +
    Math.floor(Math.random() * (cfg.daily.max - cfg.daily.min + 1));
  acc.lastDaily = Date.now();
  acc.balance += gain;
  data[userId] = acc;
  save(data);
  return { ok: true, gain, balance: acc.balance };
}

function tryWork(userId) {
  const data = load();
  const acc = getAccount(userId);
  const wait = msUntilReady(acc.lastWork, cfg.work.cooldownMs);
  if (wait > 0) {
    return { ok: false, waitMs: wait };
  }
  const gain =
    cfg.work.min + Math.floor(Math.random() * (cfg.work.max - cfg.work.min + 1));
  acc.lastWork = Date.now();
  acc.balance += gain;
  data[userId] = acc;
  save(data);
  return { ok: true, gain, balance: acc.balance };
}

function pay(fromId, toId, amount) {
  const mise = Math.floor(amount);
  if (mise < 1) return { ok: false, reason: "Montant invalide." };
  if (fromId === toId) return { ok: false, reason: "Tu ne peux pas te payer toi-meme." };
  const removed = removeCoins(fromId, mise);
  if (!removed.ok) return { ok: false, reason: "Solde insuffisant." };
  addCoins(toId, mise);
  return { ok: true, amount: mise, fromBalance: removed.balance };
}

function getLeaderboard(limit = 10) {
  const data = load();
  return Object.entries(data)
    .map(([id, acc]) => ({ id, balance: acc.balance }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

function formatCooldown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

module.exports = {
  formatCoins,
  getBalance,
  addCoins,
  removeCoins,
  validateBet,
  tryDaily,
  tryWork,
  pay,
  getLeaderboard,
  formatCooldown,
  cfg,
};
