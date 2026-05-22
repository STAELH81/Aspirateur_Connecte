const path = require("path");
const fs = require("fs");

const CONFIG_FILE = path.join(__dirname, "..", "data", "shop.json");

function isValidRoleId(roleId) {
  return /^\d{17,20}$/.test(String(roleId || ""));
}

function isValidItem(item) {
  if (!item?.id || !item?.label || !(item.price > 0)) return false;
  const type = item.type || "role";
  if (type === "role") return isValidRoleId(item.roleId);
  if (type === "daily_boost" || type === "work_reset") return true;
  return false;
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) return [];
    return data.items.filter(isValidItem);
  } catch {
    return [];
  }
}

function shopFileExists() {
  return fs.existsSync(CONFIG_FILE);
}

module.exports = { loadConfig, shopFileExists, CONFIG_FILE, isValidRoleId };
