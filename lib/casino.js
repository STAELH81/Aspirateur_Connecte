const cfg = require("./economyConfig");
const economy = require("./economy");

function spinSymbol() {
  const pool = cfg.slots.symbols;
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of pool) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return pool[0];
}

function spinReels() {
  return [spinSymbol(), spinSymbol(), spinSymbol()];
}

function slotsResult(reels, bet) {
  const [a, b, c] = reels;
  const display = reels.map((s) => s.emoji).join(" | ");
  const threePay = cfg.slots.payouts.three;

  if (a.id === b.id && b.id === c.id) {
    const mult = threePay[a.id] ?? 1.5;
    const win = Math.floor(bet * mult);
    return { display, win, net: win - bet, label: `Triple ${a.emoji}` };
  }

  const counts = {};
  for (const s of reels) counts[s.id] = (counts[s.id] || 0) + 1;
  const pair = Object.entries(counts).find(([, n]) => n === 2);
  if (pair) {
    const mult = cfg.slots.payouts.pair;
    const win = Math.floor(bet * mult);
    return { display, win, net: win - bet, label: "Paire" };
  }

  return { display, win: 0, net: -bet, label: "Perdu" };
}

function playSlots(userId, bet) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  economy.removeCoins(userId, check.mise);
  const reels = spinReels();
  const result = slotsResult(reels, check.mise);

  if (result.win > 0) economy.addCoins(userId, result.win);

  return {
    ok: true,
    ...result,
    balance: economy.getBalance(userId),
    bet: check.mise,
  };
}

function playCoinflip(userId, bet, choice) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  const faces = ["pile", "face"];
  const pick = choice.toLowerCase();
  if (!faces.includes(pick)) {
    return { ok: false, reason: "Choisis **pile** ou **face**." };
  }

  economy.removeCoins(userId, check.mise);
  const result = Math.random() < 0.5 ? "pile" : "face";
  const won = result === pick;
  const win = won ? Math.floor(check.mise * cfg.coinflip.multiplier) : 0;

  if (win > 0) economy.addCoins(userId, win);

  return {
    ok: true,
    won,
    result,
    choice: pick,
    win,
    net: win - check.mise,
    balance: economy.getBalance(userId),
    bet: check.mise,
  };
}

module.exports = { playSlots, playCoinflip };
