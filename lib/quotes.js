const fs = require("fs");
const path = require("path");
const profile = require("./serverProfile");

const APPROVED = path.join(__dirname, "..", "data", "quotes.json");
const pendingStore = createStore(path.join(__dirname, "..", "data", "quotes-pending.json"), {
  defaultData: [],
});

function loadApproved() {
  try {
    const list = JSON.parse(fs.readFileSync(APPROVED, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveApproved(list) {
  fs.mkdirSync(path.dirname(APPROVED), { recursive: true });
  fs.writeFileSync(APPROVED, JSON.stringify(list, null, 2));
}

function randomQuote() {
  const list = loadApproved();
  if (list.length === 0) return profile.isRockAndRoll() ? "Rock n Roll" : "Les Girlsss";
  return list[Math.floor(Math.random() * list.length)];
}

function addPending(userId, text) {
  const quote = String(text).trim().slice(0, 300);
  if (quote.length < 3) return { ok: false, reason: "Citation trop courte (3 caracteres min)." };

  const list = pendingStore.load();
  const entry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    quote,
    userId,
    at: Date.now(),
  };
  list.push(entry);
  pendingStore.save(list);
  return { ok: true, entry };
}

function listPending() {
  return pendingStore.load();
}

function approve(id) {
  const list = pendingStore.load();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, reason: "ID introuvable." };

  const [entry] = list.splice(idx, 1);
  pendingStore.save(list);

  const approved = loadApproved();
  approved.push(entry.quote);
  saveApproved(approved);

  return { ok: true, quote: entry.quote };
}

function reject(id) {
  const list = pendingStore.load();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, reason: "ID introuvable." };
  list.splice(idx, 1);
  pendingStore.save(list);
  return { ok: true };
}

module.exports = {
  randomQuote,
  addPending,
  listPending,
  approve,
  reject,
  loadApproved,
};
