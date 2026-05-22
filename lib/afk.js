const path = require("path");
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "afk.json"), { defaultData: {} });

function setAfk(userId, reason) {
  const data = store.load();
  data[userId] = {
    reason: String(reason || "AFK").trim().slice(0, 120) || "AFK",
    since: Date.now(),
  };
  store.save(data);
  return data[userId];
}

function clearAfk(userId) {
  const data = store.load();
  if (!data[userId]) return false;
  delete data[userId];
  store.save(data);
  return true;
}

function getAfk(userId) {
  return store.load()[userId] || null;
}

function getMentionedAfkUsers(message) {
  const data = store.load();
  const found = [];
  for (const user of message.mentions.users.values()) {
    if (data[user.id]) found.push({ user, afk: data[user.id] });
  }
  return found;
}

module.exports = { setAfk, clearAfk, getAfk, getMentionedAfkUsers };
