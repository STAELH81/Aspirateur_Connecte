const casino = require("../casino");
const economy = require("../economy");
const bankLoans = require("../bankLoans");
const gamblingProgress = require("../gamblingProgress");
const coopGoal = require("../coopGoal");
const economyLog = require("../economyLog");

const CHOICE_MAP = {
  red: "rouge",
  rouge: "rouge",
  black: "noir",
  noir: "noir",
  green: "vert",
  vert: "vert",
};

function normalizeChoice(choice) {
  return CHOICE_MAP[String(choice || "").toLowerCase()] || null;
}

async function recordRound(client, userId, result) {
  gamblingProgress.recordCasinoRound(userId, "roulette", result);
  if (client) {
    await economyLog.logCasino(client, userId, "roulette", result).catch(() => {});
    coopGoal.afterCasinoRound(userId, client);
  }
}

async function playActivityRoulette(client, userId, bet, choice) {
  const casinoBan = bankLoans.casinoBlockReason(userId);
  if (casinoBan) return { ok: false, reason: casinoBan };

  const choiceType = normalizeChoice(choice);
  if (!choiceType) return { ok: false, reason: "Choix invalide (rouge, noir, vert)." };

  const result = casino.playRoulette(userId, Math.floor(bet), choiceType);
  if (!result.ok) return result;

  await recordRound(client, userId, result);
  return {
    ok: true,
    result: {
      roll: result.roll,
      color: result.color,
      won: result.won,
      win: result.win,
      net: result.net,
      bet: result.bet,
      balance: result.balance,
      jackpotWin: result.jackpotWin || 0,
      label: result.label,
    },
  };
}

async function playActivityRouletteShared(client, userId, bet, choice, roll) {
  const casinoBan = bankLoans.casinoBlockReason(userId);
  if (casinoBan) return { ok: false, reason: casinoBan };

  const choiceType = normalizeChoice(choice);
  if (!choiceType) return { ok: false, reason: "Choix invalide (rouge, noir, vert)." };

  const result = casino.playRouletteWithRoll(userId, Math.floor(bet), choiceType, null, roll);
  if (!result.ok) return result;

  await recordRound(client, userId, result);
  return {
    ok: true,
    result: {
      roll: result.roll,
      color: result.color,
      won: result.won,
      win: result.win,
      net: result.net,
      bet: result.bet,
      balance: result.balance,
      jackpotWin: result.jackpotWin || 0,
      label: result.label,
    },
  };
}

function getPlayerProfile(userId) {
  const casinoBan = bankLoans.casinoBlockReason(userId);
  return {
    userId,
    balance: economy.getBalance(userId),
    betMin: require("../economyConfig").bet.min,
    betMaxRatio: require("../economyConfig").bet.maxBalanceRatio,
    blocked: casinoBan || null,
  };
}

module.exports = {
  playActivityRoulette,
  playActivityRouletteShared,
  getPlayerProfile,
  normalizeChoice,
};
