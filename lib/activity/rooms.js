const { EventEmitter } = require("events");
const casino = require("../casino");
const activityCasino = require("./casinoRound");

const BETTING_MS = 22_000;
const RESULTS_MS = 8_000;
const MIN_PLAYERS_TO_SPIN = 1;

const rooms = new Map();

function publicBet(bet) {
  return {
    userId: bet.userId,
    displayName: bet.displayName,
    bet: bet.bet,
    choice: bet.choice,
  };
}

function publicRoom(room) {
  return {
    id: room.id,
    phase: room.phase,
    bettingEndsAt: room.bettingEndsAt,
    roll: room.roll,
    color: room.color,
    bets: [...room.bets.values()].map(publicBet),
    results: room.results,
    pot: [...room.bets.values()].reduce((s, b) => s + b.bet, 0),
  };
}

class RouletteRoom extends EventEmitter {
  constructor(id, client) {
    super();
    this.id = id;
    this.client = client;
    this.phase = "betting";
    this.bets = new Map();
    this.results = [];
    this.roll = null;
    this.color = null;
    this.bettingEndsAt = Date.now() + BETTING_MS;
    this.timers = [];
    this.scheduleBettingEnd();
  }

  scheduleBettingEnd() {
    const t = setTimeout(() => this.resolveRound().catch((err) => {
      console.error("[activity] resolve:", err);
    }), BETTING_MS);
    this.timers.push(t);
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  join(userId, displayName) {
    if (!this.bets.has(userId)) {
      this.bets.set(userId, { userId, displayName, bet: 0, choice: null, locked: false });
    } else {
      const row = this.bets.get(userId);
      row.displayName = displayName;
    }
    this.emit("update", publicRoom(this));
    return publicRoom(this);
  }

  placeBet(userId, displayName, bet, choice) {
    if (this.phase !== "betting") {
      return { ok: false, reason: "Les paris sont fermes — la roue tourne." };
    }

    const normalized = activityCasino.normalizeChoice(choice);
    if (!normalized) return { ok: false, reason: "Choix invalide." };

    const amount = Math.floor(bet);
    if (amount < 10) return { ok: false, reason: "Mise minimum : 10 coins." };

    this.bets.set(userId, {
      userId,
      displayName: displayName || userId,
      bet: amount,
      choice: normalized,
      locked: true,
    });

    this.emit("update", publicRoom(this));
    return { ok: true, room: publicRoom(this) };
  }

  async resolveRound() {
    if (this.phase !== "betting") return;
    this.clearTimers();

    const active = [...this.bets.values()].filter((b) => b.locked && b.bet > 0);
    if (active.length < MIN_PLAYERS_TO_SPIN) {
      this.phase = "betting";
      this.bettingEndsAt = Date.now() + BETTING_MS;
      this.bets.forEach((b) => {
        b.locked = false;
      });
      this.scheduleBettingEnd();
      this.emit("update", publicRoom(this));
      return;
    }

    this.phase = "spinning";
    this.roll = casino.spinRoulette();
    const resolved = casino.resolveRouletteRoll(this.roll, "rouge", null);
    this.color = resolved.color;
    this.emit("update", publicRoom(this));

    await new Promise((r) => setTimeout(r, 3500));

    this.phase = "results";
    this.results = [];

    for (const bet of active) {
      const outcome = await activityCasino.playActivityRouletteShared(
        this.client,
        bet.userId,
        bet.bet,
        bet.choice,
        this.roll
      );
      this.results.push({
        userId: bet.userId,
        displayName: bet.displayName,
        choice: bet.choice,
        bet: bet.bet,
        ok: outcome.ok,
        reason: outcome.reason || null,
        result: outcome.result || null,
      });
    }

    this.emit("update", publicRoom(this));

    const t = setTimeout(() => this.resetForNextRound(), RESULTS_MS);
    this.timers.push(t);
  }

  resetForNextRound() {
    this.clearTimers();
    this.phase = "betting";
    this.roll = null;
    this.color = null;
    this.results = [];
    this.bets.clear();
    this.bettingEndsAt = Date.now() + BETTING_MS;
    this.scheduleBettingEnd();
    this.emit("update", publicRoom(this));
  }

  destroy() {
    this.clearTimers();
    this.removeAllListeners();
  }
}

function getOrCreateRoom(roomId, client) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new RouletteRoom(roomId, client);
    rooms.set(roomId, room);
    room.on("update", (state) => {
      room.emit("broadcast", state);
    });
  } else if (client && !room.client) {
    room.client = client;
  }
  return room;
}

function subscribeRoom(roomId, listener) {
  const room = rooms.get(roomId);
  if (!room) return () => {};
  room.on("broadcast", listener);
  return () => room.off("broadcast", listener);
}

module.exports = {
  getOrCreateRoom,
  subscribeRoom,
  publicRoom,
  BETTING_MS,
};
