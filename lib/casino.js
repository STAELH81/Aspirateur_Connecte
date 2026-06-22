const cfg = require("./economyConfig");
const economy = require("./economy");
const jackpot = require("./jackpot");

function afterBet(userId, bet, result) {
  jackpot.addFromBet(bet);
  const jp = jackpot.tryWin();
  let jackpotWin = 0;
  if (jp.won) {
    jackpotWin = jp.amount;
    economy.addCoins(userId, jackpotWin);
    result.jackpotWin = jackpotWin;
    result.balance = economy.getBalance(userId);
    if (result.net !== undefined) result.net += jackpotWin;
  }
  return result;
}

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

  const balanceBefore = economy.getBalance(userId);
  economy.removeCoins(userId, check.mise);
  const reels = spinReels();
  const result = slotsResult(reels, check.mise);

  if (result.win > 0) economy.addCoins(userId, result.win);

  const balanceAfter = economy.getBalance(userId);
  return afterBet(userId, check.mise, {
    ok: true,
    ...result,
    balance: balanceAfter,
    balanceBefore,
    balanceAfter,
    bet: check.mise,
  });
}

function playCoinflip(userId, bet, choice) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  const faces = ["pile", "face"];
  const pick = choice.toLowerCase();
  if (!faces.includes(pick)) {
    return { ok: false, reason: "Choisis **pile** ou **face**." };
  }

  const balanceBefore = economy.getBalance(userId);
  economy.removeCoins(userId, check.mise);
  const result = Math.random() < 0.5 ? "pile" : "face";
  const won = result === pick;
  const win = won ? Math.floor(check.mise * cfg.coinflip.multiplier) : 0;

  if (win > 0) economy.addCoins(userId, win);

  const balanceAfter = economy.getBalance(userId);
  return afterBet(userId, check.mise, {
    ok: true,
    won,
    result,
    choice: pick,
    win,
    net: win - check.mise,
    balance: balanceAfter,
    balanceBefore,
    balanceAfter,
    bet: check.mise,
  });
}

function playDice(userId, bet, guess) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  const n = Math.floor(guess);
  if (n < 1 || n > 6) {
    return { ok: false, reason: "Nombre entre **1** et **6**." };
  }

  const balanceBefore = economy.getBalance(userId);
  economy.removeCoins(userId, check.mise);
  const roll = 1 + Math.floor(Math.random() * 6);
  const won = roll === n;
  const win = won ? Math.floor(check.mise * cfg.dice.multiplier) : 0;
  if (win > 0) economy.addCoins(userId, win);

  const balanceAfter = economy.getBalance(userId);
  return afterBet(userId, check.mise, {
    ok: true,
    won,
    roll,
    guess: n,
    win,
    net: win - check.mise,
    balance: balanceAfter,
    balanceBefore,
    balanceAfter,
    bet: check.mise,
  });
}

function spinRoulette() {
  return Math.floor(Math.random() * 10);
}

function resolveRouletteRoll(roll, choiceType, straightNumber) {
  const type = String(choiceType).toLowerCase();
  const red = cfg.roulette.red.numbers;
  const black = cfg.roulette.black.numbers;
  const green = cfg.roulette.green.numbers;

  let won = false;
  let mult = 0;
  let label = "";

  if (type === "rouge" && red.includes(roll)) {
    won = true;
    mult = cfg.roulette.red.multiplier;
    label = "Rouge";
  } else if (type === "noir" && black.includes(roll)) {
    won = true;
    mult = cfg.roulette.black.multiplier;
    label = "Noir";
  } else if (type === "vert" && green.includes(roll)) {
    won = true;
    mult = cfg.roulette.green.multiplier;
    label = "Vert (0)";
  } else if (type === "numero") {
    const targetNum = Math.floor(straightNumber);
    if (roll === targetNum) {
      won = true;
      mult = cfg.roulette.straight.multiplier;
      label = `Numero ${targetNum}`;
    }
  }

  const color = green.includes(roll) ? "vert" : red.includes(roll) ? "rouge" : "noir";
  return { won, mult, label: label || "Perdu", color, roll };
}

function playRouletteWithRoll(userId, bet, choiceType, straightNumber, roll) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  const type = choiceType.toLowerCase();
  const valid = ["rouge", "noir", "vert", "numero"];
  if (!valid.includes(type)) {
    return { ok: false, reason: "Choix : **rouge**, **noir**, **vert** ou **numero**." };
  }

  let targetNum = null;
  if (type === "numero") {
    targetNum = Math.floor(straightNumber);
    if (targetNum < 0 || targetNum > 9) {
      return { ok: false, reason: "Numero entre **0** et **9**." };
    }
  }

  const balanceBefore = economy.getBalance(userId);
  economy.removeCoins(userId, check.mise);
  const resolved = resolveRouletteRoll(roll, type, targetNum);
  const win = resolved.won ? Math.floor(check.mise * resolved.mult) : 0;
  if (win > 0) economy.addCoins(userId, win);

  const balanceAfter = economy.getBalance(userId);
  return afterBet(userId, check.mise, {
    ok: true,
    won: resolved.won,
    roll: resolved.roll,
    color: resolved.color,
    label: resolved.label,
    win,
    net: win - check.mise,
    balance: balanceAfter,
    balanceBefore,
    balanceAfter,
    bet: check.mise,
  });
}

function playRoulette(userId, bet, choiceType, straightNumber) {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  const type = choiceType.toLowerCase();
  const valid = ["rouge", "noir", "vert", "numero"];
  if (!valid.includes(type)) {
    return { ok: false, reason: "Choix : **rouge**, **noir**, **vert** ou **numero**." };
  }

  let targetNum = null;
  if (type === "numero") {
    targetNum = Math.floor(straightNumber);
    if (targetNum < 0 || targetNum > 9) {
      return { ok: false, reason: "Numero entre **0** et **9**." };
    }
  }

  const roll = spinRoulette();
  return playRouletteWithRoll(userId, bet, type, targetNum, roll);
}

function duelCoinflipRound(choiceA, choiceB) {
  const faces = ["pile", "face"];
  const pickA = String(choiceA).toLowerCase();
  const pickB = String(choiceB).toLowerCase();
  if (!faces.includes(pickA) || !faces.includes(pickB)) {
    return { ok: false, reason: "Choix invalides (pile ou face)." };
  }
  const flip = Math.random() < 0.5 ? "pile" : "face";
  const hitA = flip === pickA;
  const hitB = flip === pickB;
  let winner = "tie";
  if (hitA && !hitB) winner = "a";
  else if (hitB && !hitA) winner = "b";
  return {
    ok: true,
    flip,
    choiceA: pickA,
    choiceB: pickB,
    winner,
  };
}

function duelDiceRound(guessA, guessB) {
  const ga = Math.floor(guessA);
  const gb = Math.floor(guessB);
  if (ga < 1 || ga > 6 || gb < 1 || gb > 6) {
    return { ok: false, reason: "Choix entre **1** et **6**." };
  }
  const roll = 1 + Math.floor(Math.random() * 6);
  const distA = Math.abs(roll - ga);
  const distB = Math.abs(roll - gb);
  let winner = "tie";
  if (distA < distB) winner = "a";
  else if (distB < distA) winner = "b";
  return {
    ok: true,
    roll,
    guessA: ga,
    guessB: gb,
    winner,
    summary: `De **${roll}** — ecarts **${distA}** vs **${distB}**`,
  };
}

function duelSlotsRound(bet) {
  const reelsA = spinReels();
  const reelsB = spinReels();
  const resA = slotsResult(reelsA, bet);
  const resB = slotsResult(reelsB, bet);
  let winner = "tie";
  if (resA.net > resB.net) winner = "a";
  else if (resB.net > resA.net) winner = "b";
  return {
    ok: true,
    resA,
    resB,
    winner,
    summary: `Net **${resA.net}** vs **${resB.net}**`,
  };
}

module.exports = {
  playSlots,
  playCoinflip,
  playDice,
  playRoulette,
  playRouletteWithRoll,
  spinRoulette,
  resolveRouletteRoll,
  duelCoinflipRound,
  duelDiceRound,
  duelSlotsRound,
};
