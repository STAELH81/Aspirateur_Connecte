const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "birthdays.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function setBirthday(userId, day, month) {
  const data = load();
  data[userId] = { day, month };
  save(data);
  return data[userId];
}

function getUpcoming(withinDays = 30) {
  const data = load();
  const today = new Date();
  const results = [];

  for (const [userId, { day, month }] of Object.entries(data)) {
    let next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) {
      next = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    if (diff <= withinDays) {
      results.push({ userId, day, month, daysUntil: diff });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

module.exports = { setBirthday, getUpcoming, load };
