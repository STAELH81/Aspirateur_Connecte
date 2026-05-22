const fs = require("fs");
const path = require("path");
const { load: loadBirthdays } = require("./birthdays");

const STATE_FILE = path.join(
  __dirname,
  "..",
  "data",
  "birthday-remind-state.json"
);

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

function getTomorrowBirthdayUserIds() {
  const data = loadBirthdays();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDate();
  const month = tomorrow.getMonth() + 1;

  return Object.entries(data)
    .filter(([, b]) => b.day === day && b.month === month)
    .map(([userId]) => userId);
}

function formatReminderMessage(names) {
  if (names.length === 1) {
    return `Demain c'est l'anniversaire de **${names[0]}** !`;
  }
  const last = names.pop();
  const list = names.map((n) => `**${n}**`).join(", ");
  return `Demain c'est l'anniversaire de ${list} et **${last}** !`;
}

async function checkTomorrowReminder(client) {
  const channelId = process.env.GENERAL_CHANNEL_ID;
  if (!channelId) return;

  const userIds = getTomorrowBirthdayUserIds();
  if (userIds.length === 0) return;

  const key = todayKey();
  const state = loadState();
  const reminded = new Set(state[key] || []);
  const pending = userIds.filter((id) => !reminded.has(id));
  if (pending.length === 0) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const names = [];
  for (const userId of pending) {
    const member = await channel.guild.members.fetch(userId).catch(() => null);
    names.push(member?.displayName || member?.user?.username || "quelqu'un");
    reminded.add(userId);
  }

  await channel.send(formatReminderMessage(names));
  state[key] = [...reminded];
  saveState(state);
}

module.exports = { checkTomorrowReminder, getTomorrowBirthdayUserIds };
