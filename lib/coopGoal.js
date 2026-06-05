const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const gamblingGazette = require("./gamblingGazette");
const { COLOR_SUCCESS } = require("./personality");
const profile = require("./serverProfile");

const store = createStore(path.join(__dirname, "..", "data", "coop-goal.json"), {
  defaultData: () => ({
    dayKey: "",
    claims: {},
    goalMetAt: null,
    eligibleUserIds: [],
    announced: false,
    milestone80Announced: false,
    mvpBonuses: {},
  }),
});

const GOAL_GAMES = Math.max(
  1,
  parseInt(process.env.COOP_GOAL_GAMES || "250", 10) || 250
);
const REWARD_COINS = 25;
const MVP_BONUS = [15, 10, 5];
const MILESTONE_RATIO = 0.8;
/** Mise min duel pour compter dans l'objectif coop (anti-farm). */
const DUEL_COOP_MIN_BET = 20;
/** Max de manches duel comptabilisees coop par duel (pas l'objectif en victoires). */
const DUEL_COOP_MAX_ROUNDS_PER_DUEL = 100;

function claimTotal(claim) {
  if (!claim) return 0;
  if (typeof claim === "number") return REWARD_COINS;
  return (claim.base ?? REWARD_COINS) + (claim.mvp ?? 0);
}

function ensureToday() {
  const data = store.load();
  const today = gamblingGazette.todayKey();
  if (data.dayKey !== today) {
    data.dayKey = today;
    data.claims = {};
    data.goalMetAt = null;
    data.eligibleUserIds = [];
    data.announced = false;
    data.milestone80Announced = false;
    data.mvpBonuses = {};
    store.save(data);
  } else {
    reconcileGoalLock(data);
  }
  return data;
}

function computeMvpBonuses(recap) {
  const bonuses = {};
  const top = [...(recap.entries || [])]
    .filter((e) => (e.games || 0) > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, MVP_BONUS.length);
  top.forEach((entry, i) => {
    bonuses[entry.id] = MVP_BONUS[i] || 0;
  });
  return bonuses;
}

function getTopContributors(limit = 3) {
  const data = ensureToday();
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  return [...recap.entries]
    .filter((e) => (e.games || 0) > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((entry, i) => ({
      id: entry.id,
      games: entry.games,
      rank: i + 1,
      mvpBonus: MVP_BONUS[i] || 0,
    }));
}

function getMvpBonus(userId) {
  const data = ensureToday();
  return data.mvpBonuses?.[userId] || 0;
}

/** Cap releve ou progress sous le cap actuel : degel + annule les claims invalides. */
function reconcileGoalLock(data) {
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  const totalGames = recap.totalGames;
  if (totalGames >= GOAL_GAMES) return false;

  let changed = false;

  if (data.goalMetAt) {
    data.goalMetAt = null;
    data.eligibleUserIds = [];
    data.announced = false;
    data.mvpBonuses = {};
    changed = true;
  }

  if (data.milestone80Announced && totalGames < Math.floor(GOAL_GAMES * MILESTONE_RATIO)) {
    data.milestone80Announced = false;
    changed = true;
  }

  const claimIds = Object.keys(data.claims || {});
  if (claimIds.length) {
    for (const userId of claimIds) {
      const amount = claimTotal(data.claims[userId]);
      const removed = economy.removeCoins(userId, amount);
      if (!removed.ok) {
        console.warn(`[coop-goal] claim annule ${userId} — solde insuffisant pour -${amount}`);
      }
    }
    data.claims = {};
    changed = true;
  }

  if (changed) {
    store.save(data);
    console.log(
      `[coop-goal] reconcile ${totalGames}/${GOAL_GAMES} — gel/claims annules (${claimIds.length} claim(s))`
    );
  }
  return changed;
}

function reconcileToday() {
  const data = store.load();
  const today = gamblingGazette.todayKey();
  if (data.dayKey !== today) return false;
  return reconcileGoalLock(data);
}

function isEligible(data, userId) {
  if (!data.goalMetAt) return true;
  return (data.eligibleUserIds || []).includes(userId);
}

function getStatus(userId) {
  const data = ensureToday();
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  const totalGames = recap.totalGames;
  const userRow = recap.entries.find((e) => e.id === userId);
  const played = (userRow?.games || 0) > 0;
  const claimed = Boolean(data.claims[userId]);
  const goalMet = totalGames >= GOAL_GAMES;
  const eligible = isEligible(data, userId);
  const canClaim = goalMet && played && eligible && !claimed;
  const mvpBonus = getMvpBonus(userId);

  return {
    dayKey: data.dayKey,
    goal: GOAL_GAMES,
    progress: totalGames,
    reward: REWARD_COINS,
    mvpBonus,
    totalReward: REWARD_COINS + mvpBonus,
    played,
    claimed,
    goalMet,
    eligible,
    canClaim,
    left: Math.max(0, GOAL_GAMES - totalGames),
    goalMetAt: data.goalMetAt,
    eligibleCount: (data.eligibleUserIds || []).length,
    userGames: userRow?.games || 0,
  };
}

function casinoChannelId() {
  return (
    process.env.GAMBLING_CHANNEL_ID?.trim() ||
    process.env.GAMBLING_TEST_CHANNEL_ID?.trim() ||
    null
  );
}

async function announceMilestone80(client, data) {
  if (data.milestone80Announced) return;

  const threshold = Math.floor(GOAL_GAMES * MILESTONE_RATIO);
  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  if (recap.totalGames < threshold || recap.totalGames >= GOAL_GAMES) return;

  const channelId = casinoChannelId();
  if (!channelId || !client) {
    data.milestone80Announced = true;
    store.save(data);
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    data.milestone80Announced = true;
    store.save(data);
    return;
  }

  const left = GOAL_GAMES - recap.totalGames;
  const pct = Math.round((recap.totalGames / GOAL_GAMES) * 100);
  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle("Objectif coop — bientot la !")
    .setDescription(
      [
        `Le serveur est a **${recap.totalGames}/${GOAL_GAMES}** parties casino (**${pct}%**).`,
        "",
        `Plus que **${left}** partie(s) — bonus **+${REWARD_COINS}** coins pour les contributeurs au cap.`,
        "Top MVP du jour : **+15** / **+10** / **+5** en plus du bonus coop.",
      ].join("\n")
    )
    .setFooter({ text: `${profile.footerText()} · objectif commu` });

  await channel.send({ embeds: [embed] });
  data.milestone80Announced = true;
  store.save(data);
}

async function announceGoalMet(client, data) {
  if (data.announced) return;
  const channelId = casinoChannelId();
  if (!channelId || !client) {
    data.announced = true;
    store.save(data);
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    data.announced = true;
    store.save(data);
    return;
  }

  const moneyChannelId = process.env.QUESTS_BOARD_CHANNEL_ID?.trim();
  const questsHint = moneyChannelId
    ? `Reclame sur <#${moneyChannelId}> : **Coop du jour** — ta colonne Coop passe au 🟢.`
    : "Reclame sur le panneau money : **Coop du jour** — ta colonne Coop passe au 🟢.";

  const eligibleCount = (data.eligibleUserIds || []).length;
  const top = getTopContributors(3);
  const medals = ["🥇", "🥈", "🥉"];
  const mvpLine = top.length
    ? top
        .map((t) => `${medals[t.rank - 1] || "•"} <@${t.id}> · **${t.games}** parties (+${t.mvpBonus})`)
        .join("\n")
    : null;

  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle("Objectif commu atteint !")
    .setDescription(
      [
        `Le serveur a cumule **${GOAL_GAMES}** parties casino aujourd'hui.`,
        "",
        `**${eligibleCount}** joueur(s) eligibles — bonus **+${REWARD_COINS}** coins chacun.`,
        "Seuls ceux qui avaient deja joue **avant** le cap peuvent claim.",
        mvpLine ? `\n**MVP coop**\n${mvpLine}` : null,
        "",
        questsHint,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({ text: `${profile.footerText()} · objectif commu` });

  await channel.send({ embeds: [embed] });
  data.announced = true;
  store.save(data);
}

function lockEligibilityIfGoalReached(client) {
  const data = ensureToday();
  reconcileGoalLock(data);
  if (data.goalMetAt) return false;

  const recap = gamblingProgress.getDailyRecap(data.dayKey);
  if (recap.totalGames < GOAL_GAMES) return false;

  data.goalMetAt = Date.now();
  data.eligibleUserIds = recap.entries.filter((e) => (e.games || 0) > 0).map((e) => e.id);
  data.mvpBonuses = computeMvpBonuses(recap);
  store.save(data);

  announceGoalMet(client, data).catch((err) => console.error("[coop-goal]", err));
  if (client) {
    require("./questsBoard").requestBoardRefresh(client);
  }
  return true;
}

function afterCasinoRound(userId, client) {
  const data = ensureToday();
  announceMilestone80(client, data).catch((err) => console.error("[coop-goal]", err));
  lockEligibilityIfGoalReached(client);
}

function duelRoundResult(duel, slot, roundResult) {
  const winner = roundResult?.winner;
  let net = 0;
  if (duel.game === "slots") {
    const res = slot === "a" ? roundResult?.resA : roundResult?.resB;
    net = Number(res?.net || 0);
  }
  return {
    bet: duel.bet,
    net,
    won: winner === slot,
  };
}

/** Chaque manche resolue compte pour les 2 joueurs ; plafond par duel. */
function recordDuelRoundForCoop(client, duel, roundResult) {
  if (!duel || duel.bet < DUEL_COOP_MIN_BET) return false;
  const recorded = duel.coopRoundsRecorded || 0;
  if (recorded >= DUEL_COOP_MAX_ROUNDS_PER_DUEL) return false;

  duel.coopRoundsRecorded = recorded + 1;
  gamblingProgress.recordCasinoRound(duel.challengerId, "duel", duelRoundResult(duel, "a", roundResult));
  gamblingProgress.recordCasinoRound(duel.defenderId, "duel", duelRoundResult(duel, "b", roundResult));
  afterCasinoRound(duel.challengerId, client);
  return true;
}

function claimReward(userId) {
  const status = getStatus(userId);
  if (!status.goalMet) {
    return {
      ok: false,
      reason: `Objectif commu : **${status.progress}/${status.goal}** parties casino aujourd'hui.`,
    };
  }
  if (!status.played) {
    return { ok: false, reason: "Tu dois avoir joue au moins **1** partie casino aujourd'hui." };
  }
  if (!status.eligible) {
    return {
      ok: false,
      reason:
        "L'objectif a ete atteint avant que tu joues — tu n'es pas eligible au bonus d'aujourd'hui.",
    };
  }
  if (status.claimed) {
    return { ok: false, reason: "Bonus deja reclame aujourd'hui." };
  }

  const mvpBonus = status.mvpBonus;
  const total = REWARD_COINS + mvpBonus;

  const data = ensureToday();
  data.claims[userId] = { at: Date.now(), base: REWARD_COINS, mvp: mvpBonus };
  store.save(data);
  const balance = economy.addCoins(userId, total);
  return {
    ok: true,
    reward: REWARD_COINS,
    mvpBonus,
    total,
    balance,
  };
}

module.exports = {
  getStatus,
  claimReward,
  afterCasinoRound,
  recordDuelRoundForCoop,
  lockEligibilityIfGoalReached,
  reconcileToday,
  getTopContributors,
  getMvpBonus,
  GOAL_GAMES,
  REWARD_COINS,
  MVP_BONUS,
  DUEL_COOP_MIN_BET,
  DUEL_COOP_MAX_ROUNDS_PER_DUEL,
};
