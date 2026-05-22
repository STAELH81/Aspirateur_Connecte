const fs = require("fs");
const path = require("path");
const { load: loadBirthdays } = require("./birthdays");

const STATE_FILE = path.join(__dirname, "..", "data", "birthday-announce-state.json");
const ANNOUNCE_HOUR = 9;
const ANNOUNCE_MINUTE = 0;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayBirthdayUserIds() {
  const data = loadBirthdays();
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;

  return Object.entries(data)
    .filter(([, b]) => b.day === day && b.month === month)
    .map(([userId]) => userId);
}

function formatAnnounceMessage(names) {
  if (names.length === 1) {
    return `Hey ! On souhaite tous l'anniv de **${names[0]}** aujourd'hui !`;
  }
  const last = names.pop();
  const list = names.map((n) => `**${n}**`).join(", ");
  return `Hey ! On souhaite tous l'anniv de ${list} et **${last}** aujourd'hui !`;
}

async function checkAndAnnounce(client) {
  const channelId = process.env.GENERAL_CHANNEL_ID;
  if (!channelId) return;

  const userIds = getTodayBirthdayUserIds();
  if (userIds.length === 0) return;

  const key = todayKey();
  const state = loadState();
  const announced = new Set(state[key] || []);
  const pending = userIds.filter((id) => !announced.has(id));
  if (pending.length === 0) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    console.warn("GENERAL_CHANNEL_ID invalide ou salon inaccessible.");
    return;
  }

  const names = [];
  for (const userId of pending) {
    const member = await channel.guild.members.fetch(userId).catch(() => null);
    names.push(member?.displayName || member?.user?.username || "quelqu'un");
    announced.add(userId);
  }

  await channel.send(formatAnnounceMessage(names));
  state[key] = [...announced];
  saveState(state);

  const { processTodayBirthdays } = require("./birthdayVip");
  await processTodayBirthdays(client);
}

function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(ANNOUNCE_HOUR, ANNOUNCE_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleBirthdayAnnounce(client) {
  const channelId = process.env.GENERAL_CHANNEL_ID;
  if (!channelId) return;

  const tick = async () => {
    try {
      await checkAndAnnounce(client);
    } catch (err) {
      console.error("Anniversaire (annonce):", err);
    }
    setTimeout(tick, 24 * 60 * 60 * 1000);
  };

  setTimeout(tick, msUntilNextRun());
  checkAndAnnounce(client).catch((err) => console.error("Anniversaire (annonce):", err));
}

module.exports = { checkAndAnnounce, scheduleBirthdayAnnounce, getTodayBirthdayUserIds };
