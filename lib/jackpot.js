const path = require("path");
const { createStore } = require("./jsonStore");
const cfg = require("./economyConfig");

const store = createStore(path.join(__dirname, "..", "data", "jackpot.json"), {
  defaultData: { pool: 0 },
});

function getPool() {
  return store.load().pool || 0;
}

function addFromBet(bet) {
  const data = store.load();
  data.pool = Math.floor((data.pool || 0) + bet * cfg.jackpot.taxRate);
  store.save(data);
  return data.pool;
}

function tryWin() {
  if (Math.random() >= cfg.jackpot.winChance) return { won: false, amount: 0 };
  const data = store.load();
  const amount = data.pool || 0;
  if (amount < 1) return { won: false, amount: 0 };
  data.pool = 0;
  store.save(data);
  return { won: true, amount };
}

module.exports = { getPool, addFromBet, tryWin };
