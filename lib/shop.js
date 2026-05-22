const path = require("path");
const fs = require("fs");

const CONFIG_FILE = path.join(__dirname, "..", "data", "shop.json");

function isValidRoleId(roleId) {
  return /^\d{17,20}$/.test(String(roleId || ""));
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) return [];

    return data.items.filter(
      (item) =>
        item?.id &&
        item?.label &&
        item?.price > 0 &&
        isValidRoleId(item.roleId)
    );
  } catch {
    return [];
  }
}

function shopFileExists() {
  return fs.existsSync(CONFIG_FILE);
}

module.exports = { loadConfig, shopFileExists, CONFIG_FILE, isValidRoleId };
