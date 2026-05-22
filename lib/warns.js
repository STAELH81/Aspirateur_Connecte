const path = require("path");
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "warns.json"), {
  defaultData: {},
});

function list(userId) {
  const data = store.load();
  return data[userId] || [];
}

function add(userId, modId, reason) {
  const data = store.load();
  const entry = {
    id: Date.now(),
    modId,
    reason: String(reason).trim().slice(0, 300) || "Avertissement",
    at: new Date().toISOString(),
  };
  data[userId] = data[userId] || [];
  data[userId].push(entry);
  store.save(data);
  return { entry, total: data[userId].length };
}

function clear(userId) {
  const data = store.load();
  const count = (data[userId] || []).length;
  delete data[userId];
  store.save(data);
  return count;
}

function removeLast(userId) {
  const data = store.load();
  const list = data[userId];
  if (!list?.length) return null;
  const removed = list.pop();
  if (list.length) data[userId] = list;
  else delete data[userId];
  store.save(data);
  return removed;
}

module.exports = { list, add, clear, removeLast };
