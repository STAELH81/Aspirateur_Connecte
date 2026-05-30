const path = require("path");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const coopGoal = require("./coopGoal");
const gamblingGazette = require("./gamblingGazette");

const REMINDER_HOUR = 20;
const REMINDER_MINUTE = 0;

const store = createStore(path.join(__dirname, "..", "data", "quest-reminders.json"), {
  defaultData: () => ({ dayKey: "", sent: {} }),
});

function ensureToday() {
  const data = store.load();
  const today = gamblingGazette.todayKey();
  if (data.dayKey !== today) {
    data.dayKey = today;
    data.sent = {};
    store.save(data);
  }
  return data;
}

function listCandidateUserIds() {
  const ids = new Set();
  for (const row of economy.getLeaderboard(Number.POSITIVE_INFINITY)) ids.add(row.id);
  for (const id of gamblingProgress.listUserIds()) ids.add(id);
  return [...ids];
}

async function sendReminders(client) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId || !client) return { ok: false, reason: "client ou guild manquant" };

  const data = ensureToday();
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, reason: "guild introuvable" };

  let questCount = 0;
  let coopCount = 0;

  for (const userId of listCandidateUserIds()) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;

    const sent = data.sent[userId] || {};
    const user = member.user;

    const quest = gamblingProgress.getQuestStatus(userId);
    if (quest.completed && !quest.claimed && !sent.quest) {
      try {
        await user.send(
          [
            "**Rappel quete du jour** — Les Girlsss",
            "",
            `Ta quete (**${quest.label}**) est terminee mais pas encore reclamee.`,
            "Va sur le panneau **Quetes** → **Claim quete**.",
          ].join("\n")
        );
        sent.quest = true;
        questCount += 1;
      } catch {
        sent.quest = true;
      }
    }

    const coop = coopGoal.getStatus(userId);
    if (coop.canClaim && !sent.coop) {
      try {
        await user.send(
          [
            "**Rappel objectif commu** — Les Girlsss",
            "",
            `Le serveur a atteint l'objectif casino — tu peux reclamer **+${coop.reward}** coins.`,
            "Panneau **Quetes** → **Claim coop**.",
          ].join("\n")
        );
        sent.coop = true;
        coopCount += 1;
      } catch {
        sent.coop = true;
      }
    }

    data.sent[userId] = sent;
  }

  store.save(data);
  return { ok: true, questCount, coopCount };
}

function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleQuestReminders(client) {
  const tick = async () => {
    try {
      const result = await sendReminders(client);
      if (result.ok && (result.questCount || result.coopCount)) {
        console.log(
          `[quest-reminders] ${result.questCount} quete(s), ${result.coopCount} coop — DMs envoyes.`
        );
      }
    } catch (err) {
      console.error("[quest-reminders]", err);
    }
    setTimeout(tick, 24 * 60 * 60 * 1000);
  };

  setTimeout(tick, msUntilNextRun());
  console.log(`Rappels quete/coop : tous les jours a ${REMINDER_HOUR}h${String(REMINDER_MINUTE).padStart(2, "0")}.`);
}

module.exports = { scheduleQuestReminders, sendReminders };
