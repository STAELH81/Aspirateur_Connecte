const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const economy = require("./economy");
const jackpot = require("./jackpot");
const cfg = require("./economyConfig");
const { COLOR, COLOR_SUCCESS } = require("./personality");

const games = new Map();

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function newDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) deck.push({ r, s });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(c.r)) total += 10;
    else total += parseInt(c.r, 10);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function formatHand(cards, hideFirst = false) {
  if (hideFirst && cards.length > 0) {
    return `🂠 | ${cards
      .slice(1)
      .map((c) => `${c.r}${c.s}`)
      .join(" | ")}`;
  }
  return cards.map((c) => `${c.r}${c.s}`).join(" | ");
}

function draw(deck) {
  return deck.pop();
}

function dealerPlay(deck, hand) {
  while (handValue(hand) < 17) hand.push(draw(deck));
  return hand;
}

function settle(game, outcome) {
  const { userId, bet } = game;
  let win = 0;
  let net = -bet;

  if (outcome === "blackjack") {
    win = Math.floor(bet * cfg.blackjack.blackjackMultiplier);
    net = win - bet;
  } else if (outcome === "win") {
    win = Math.floor(bet * cfg.blackjack.winMultiplier);
    net = win - bet;
  } else if (outcome === "push") {
    win = bet;
    net = 0;
  }

  if (win > 0) economy.addCoins(userId, win);

  jackpot.addFromBet(bet);
  const jp = jackpot.tryWin();
  let jackpotWin = 0;
  if (jp.won) {
    jackpotWin = jp.amount;
    economy.addCoins(userId, jackpotWin);
  }

  games.delete(game.id);

  const balanceAfter = economy.getBalance(userId);
  return {
    ok: true,
    outcome,
    win,
    net: net + jackpotWin,
    bet,
    balance: balanceAfter,
    balanceBefore: game.balanceBefore,
    balanceAfter,
    jackpotWin,
    playerHand: game.player,
    dealerHand: game.dealer,
  };
}

function startGame(userId, bet, playerName = "Joueur") {
  const check = economy.validateBet(userId, bet);
  if (!check.ok) return { ok: false, reason: check.reason };

  for (const g of games.values()) {
    if (g.userId === userId) {
      return { ok: false, reason: "Tu as deja une partie en cours. Finis-la d'abord." };
    }
  }

  const balanceBefore = economy.getBalance(userId);
  economy.removeCoins(userId, check.mise);
  const deck = newDeck();
  const player = [draw(deck), draw(deck)];
  const dealer = [draw(deck), draw(deck)];

  const id = `${userId}-${Date.now()}`;
  const game = {
    id,
    userId,
    playerName,
    bet: check.mise,
    deck,
    player,
    dealer,
    channelId: null,
    messageId: null,
    balanceBefore,
  };
  games.set(id, game);

  const pVal = handValue(player);
  if (pVal === 21) {
    const result = settle(game, handValue(dealer) === 21 ? "push" : "blackjack");
    return { ok: true, instant: true, ...result };
  }

  return {
    ok: true,
    instant: false,
    gameId: id,
    player,
    dealer,
    bet: check.mise,
    playerValue: pVal,
    dealerUp: handValue([dealer[1]]),
  };
}

function getGame(gameId, userId) {
  const game = games.get(gameId);
  if (!game || game.userId !== userId) return null;
  return game;
}

function buildButtons(gameId, disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bj:hit:${gameId}`)
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`bj:stand:${gameId}`)
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
  return row;
}

function buildEmbed(game, { reveal = false, footer, playerName } = {}) {
  const pVal = handValue(game.player);
  const dVal = reveal ? handValue(game.dealer) : handValue([game.dealer[1]]);
  const label = playerName || game.playerName || "Joueur";

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Blackjack")
    .setDescription(
      [
        `Mise : **${game.bet}** coins`,
        `${label} (${pVal}) : ${formatHand(game.player)}`,
        reveal
          ? `Croupier (${dVal}) : ${formatHand(game.dealer)}`
          : `Croupier : ${formatHand(game.dealer, true)}`,
        footer || "",
      ]
        .filter(Boolean)
        .join("\n")
    );
}

function hit(gameId, userId) {
  const game = getGame(gameId, userId);
  if (!game) return { ok: false, reason: "Partie introuvable ou expiree." };

  game.player.push(draw(game.deck));
  const pVal = handValue(game.player);

  if (pVal > 21) {
    const result = settle(game, "lose");
    return {
      ok: true,
      done: true,
      bust: true,
      ...result,
      embed: buildEmbed(
        { ...game, player: result.playerHand, dealer: result.dealerHand },
        { reveal: true, footer: "Depasse — perdu." }
      ).setColor(COLOR),
    };
  }

  return {
    ok: true,
    done: false,
    gameId,
    playerValue: pVal,
    embed: buildEmbed(game),
    row: buildButtons(gameId),
  };
}

function stand(gameId, userId) {
  const game = getGame(gameId, userId);
  if (!game) return { ok: false, reason: "Partie introuvable ou expiree." };

  dealerPlay(game.deck, game.dealer);
  const pVal = handValue(game.player);
  const dVal = handValue(game.dealer);

  let outcome = "lose";
  if (dVal > 21 || pVal > dVal) outcome = "win";
  else if (pVal === dVal) outcome = "push";

  const result = settle(game, outcome);
  const labels = { win: "Gagne !", lose: "Perdu.", push: "Egalite — mise rendue." };

  return {
    ok: true,
    done: true,
    ...result,
    embed: buildEmbed(
      { ...game, player: result.playerHand, dealer: result.dealerHand },
      { reveal: true, footer: labels[outcome] }
    ).setColor(outcome === "win" ? COLOR_SUCCESS : COLOR),
  };
}

function forfeitGame(game) {
  jackpot.addFromBet(game.bet);
  games.delete(game.id);
  return {
    gameId: game.id,
    userId: game.userId,
    playerName: game.playerName,
    bet: game.bet,
  };
}

function closeAllGames() {
  return [...games.values()].map(forfeitGame);
}

function listOpenGames() {
  return [...games.values()].map((g) => ({
    gameId: g.id,
    userId: g.userId,
    playerName: g.playerName,
    bet: g.bet,
  }));
}

module.exports = {
  startGame,
  hit,
  stand,
  buildButtons,
  buildEmbed,
  getGame,
  closeAllGames,
  listOpenGames,
};
