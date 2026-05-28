const path = require("path");
const cfg = require("./economyConfig");
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "economy.json"), {
  defaultData: {},
  backup: true,
});

function load() {
  return store.load();
}

function save(data) {
  store.save(data);
}

function formatCoins(n) {
  return `**${n}** ${cfg.currency}`;
}

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getAccount(userId) {
  const data = load();
  if (!data[userId]) {
    data[userId] = {
      balance: cfg.startBalance,
      lastDaily: 0,
      lastWork: 0,
      dailyStreak: 0,
      lastDailyDay: "",
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

function getMaxBet(userId) {
  return maxBet(getBalance(userId));
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

function streakBonus(streak) {
  const bonus = Math.min(
    streak * cfg.dailyStreak.bonusPerDay,
    cfg.dailyStreak.maxBonus
  );
  return bonus;
}

function getDailyWait(userId) {
  const acc = getAccount(userId);
  return msUntilReady(acc.lastDaily, cfg.daily.cooldownMs);
}

function getWorkWait(userId) {
  const acc = getAccount(userId);
  return msUntilReady(acc.lastWork, cfg.work.cooldownMs);
}

function tryDaily(userId) {
  const data = load();
  const acc = getAccount(userId);
  const wait = msUntilReady(acc.lastDaily, cfg.daily.cooldownMs);
  if (wait > 0) {
    return { ok: false, waitMs: wait };
  }

  const balanceBefore = acc.balance;
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 86_400_000);
  let streak = acc.dailyStreak || 0;

  if (acc.lastDailyDay === yesterday) {
    streak += 1;
  } else if (acc.lastDailyDay !== today) {
    if (acc.streakShield) {
      streak = Math.max(acc.dailyStreak || 1, 1);
      acc.streakShield = false;
      streak += 1;
    } else {
      streak = 1;
    }
  }

  const base =
    cfg.daily.min +
    Math.floor(Math.random() * (cfg.daily.max - cfg.daily.min + 1));
  const bonus = streakBonus(streak);
  let gain = base + bonus;

  const boostMult = acc.dailyBoostMultiplier || 1;
  let boostUsed = false;
  if (boostMult > 1) {
    gain = Math.floor(gain * boostMult);
    acc.dailyBoostMultiplier = 1;
    boostUsed = true;
  }

  acc.lastDaily = Date.now();
  acc.lastDailyDay = today;
  acc.dailyStreak = streak;
  acc.balance += gain;
  data[userId] = acc;
  save(data);

  return {
    ok: true,
    gain,
    balance: acc.balance,
    balanceBefore,
    balanceAfter: acc.balance,
    streak,
    bonus,
    boostUsed,
    boostMult,
  };
}

function grantDailyBoost(userId, multiplier = 1.5) {
  const data = load();
  const acc = getAccount(userId);
  if (acc.dailyBoostMultiplier && acc.dailyBoostMultiplier > 1) {
    return { ok: false, reason: "Tu as deja un boost daily en attente. Fais `/money daily` d'abord." };
  }
  acc.dailyBoostMultiplier = Math.max(1.1, Math.min(3, multiplier));
  data[userId] = acc;
  save(data);
  return { ok: true, multiplier: acc.dailyBoostMultiplier };
}

function resetWorkCooldown(userId) {
  const data = load();
  const acc = getAccount(userId);
  const wait = msUntilReady(acc.lastWork, cfg.work.cooldownMs);
  if (wait === 0) {
    return { ok: false, reason: "Tu peux deja faire `/money work` — pas besoin de reset." };
  }
  acc.lastWork = 0;
  data[userId] = acc;
  save(data);
  return { ok: true };
}

function tryWork(userId) {
  const data = load();
  const acc = getAccount(userId);
  const wait = msUntilReady(acc.lastWork, cfg.work.cooldownMs);
  if (wait > 0) {
    return { ok: false, waitMs: wait };
  }
  const balanceBefore = acc.balance;
  let gain =
    cfg.work.min + Math.floor(Math.random() * (cfg.work.max - cfg.work.min + 1));
  const workMult = acc.workBoostMultiplier || 1;
  let workBoostUsed = false;
  if (workMult > 1) {
    gain = Math.floor(gain * workMult);
    acc.workBoostMultiplier = 1;
    workBoostUsed = true;
  }
  acc.lastWork = Date.now();
  acc.balance += gain;
  data[userId] = acc;
  save(data);
  return {
    ok: true,
    gain,
    balance: acc.balance,
    balanceBefore,
    balanceAfter: acc.balance,
    workBoostUsed,
    workMult,
  };
}

function grantWorkBoost(userId, multiplier = 2) {
  const data = load();
  const acc = getAccount(userId);
  if (acc.workBoostMultiplier && acc.workBoostMultiplier > 1) {
    return { ok: false, reason: "Tu as deja un boost work en attente. Fais `/money work` d'abord." };
  }
  acc.workBoostMultiplier = Math.max(1.1, Math.min(3, multiplier));
  data[userId] = acc;
  save(data);
  return { ok: true, multiplier: acc.workBoostMultiplier };
}

function grantStreakShield(userId) {
  const data = load();
  const acc = getAccount(userId);
  if (acc.streakShield) {
    return { ok: false, reason: "Tu as deja un bouclier streak actif." };
  }
  acc.streakShield = true;
  data[userId] = acc;
  save(data);
  return { ok: true };
}

function grantCoinPack(userId, coins) {
  const amount = Math.floor(coins);
  if (amount < 1) return { ok: false, reason: "Pack invalide." };
  const balance = addCoins(userId, amount);
  return { ok: true, amount, balance };
}

function pay(fromId, toId, amount) {
  const mise = Math.floor(amount);
  if (mise < 1) return { ok: false, reason: "Montant invalide." };
  if (fromId === toId) return { ok: false, reason: "Tu ne peux pas te payer toi-meme." };
  const fromBefore = getBalance(fromId);
  const toBefore = getBalance(toId);
  const removed = removeCoins(fromId, mise);
  if (!removed.ok) return { ok: false, reason: "Solde insuffisant." };
  addCoins(toId, mise);
  return {
    ok: true,
    amount: mise,
    fromBalance: removed.balance,
    fromBefore,
    fromAfter: removed.balance,
    toBefore,
    toAfter: getBalance(toId),
  };
}

function adminGrant(targetId, amount) {
  const n = Math.floor(amount);
  if (n < 1) return { ok: false, reason: "Montant invalide." };
  const before = getBalance(targetId);
  const balance = addCoins(targetId, n);
  return { ok: true, amount: n, balance, balanceBefore: before, balanceAfter: balance };
}

function adminRemove(targetId, amount) {
  const n = Math.floor(amount);
  if (n < 1) return { ok: false, reason: "Montant invalide." };
  const removed = removeCoins(targetId, n);
  if (!removed.ok) return { ok: false, reason: "Solde insuffisant." };
  const before = getBalance(targetId);
  return {
    ok: true,
    amount: n,
    balance: removed.balance,
    balanceBefore: before,
    balanceAfter: removed.balance,
  };
}

function getLeaderboard(limit = 10) {
  const data = load();
  const sorted = Object.entries(data)
    .map(([id, acc]) => ({ id, balance: acc.balance }))
    .sort((a, b) => b.balance - a.balance);
  if (!Number.isFinite(limit)) return sorted;
  return sorted.slice(0, Math.max(0, Math.floor(limit)));
}

function formatCooldown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function updateAccount(userId, mutator) {
  const data = load();
  const acc = getAccount(userId);
  mutator(acc);
  data[userId] = acc;
  save(data);
  return acc;
}

module.exports = {
  formatCoins,
  getAccount,
  updateAccount,
  getBalance,
  addCoins,
  removeCoins,
  getMaxBet,
  validateBet,
  getDailyWait,
  getWorkWait,
  tryDaily,
  grantDailyBoost,
  grantWorkBoost,
  grantStreakShield,
  grantCoinPack,
  resetWorkCooldown,
  tryWork,
  pay,
  adminGrant,
  adminRemove,
  getLeaderboard,
  formatCooldown,
  msUntilReady,
  cfg,
};
