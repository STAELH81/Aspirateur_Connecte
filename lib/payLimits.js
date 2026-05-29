const path = require("path");
const cfg = require("./economyConfig").pay;
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "pay-daily.json"), {
  defaultData: () => ({ dayKey: "", users: {} }),
});

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureToday() {
  const data = store.load();
  const today = dayKey();
  if (data.dayKey !== today) {
    data.dayKey = today;
    data.users = {};
    store.save(data);
  }
  return data;
}

function getUserRow(data, userId) {
  data.users[userId] = data.users[userId] || { totalSent: 0, byRecipient: {} };
  return data.users[userId];
}

function checkPay(fromId, toId, amount) {
  const mise = Math.floor(amount);
  if (!cfg) return { ok: true, mise };

  const data = ensureToday();
  const row = getUserRow(data, fromId);
  const toSame = row.byRecipient[toId] || 0;

  if (row.totalSent + mise > cfg.dailyLimitPerUser) {
    const left = Math.max(0, cfg.dailyLimitPerUser - row.totalSent);
    return {
      ok: false,
      reason: `Plafond Pay du jour atteint (${cfg.dailyLimitPerUser} coins). Reste : **${left}** coins.`,
    };
  }
  if (toSame + mise > cfg.dailyLimitToSameUser) {
    const left = Math.max(0, cfg.dailyLimitToSameUser - toSame);
    return {
      ok: false,
      reason: `Plafond vers ce membre aujourd'hui : **${cfg.dailyLimitToSameUser}** coins. Reste : **${left}** coins.`,
    };
  }
  return { ok: true, mise };
}

function recordPay(fromId, toId, amount) {
  const data = ensureToday();
  const row = getUserRow(data, fromId);
  const mise = Math.floor(amount);
  row.totalSent += mise;
  row.byRecipient[toId] = (row.byRecipient[toId] || 0) + mise;
  store.save(data);
}

function shouldAlert(amount) {
  return cfg && Math.floor(amount) >= cfg.alertThreshold;
}

module.exports = { checkPay, recordPay, shouldAlert };
