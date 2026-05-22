const path = require("path");
const fs = require("fs");
const { createStore } = require("./jsonStore");
const economy = require("./economy");

const CONFIG_FILE = path.join(__dirname, "..", "data", "shop.json");

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

module.exports = { loadConfig, CONFIG_FILE };
