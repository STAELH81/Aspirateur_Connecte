const fs = require("fs");
const path = require("path");

function createStore(filePath, { defaultData = {}, backup = true } = {}) {
  const backupPath = `${filePath}.backup.json`;

  function load() {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) throw new Error("empty");
      return JSON.parse(raw);
    } catch {
      if (backup) {
        try {
          const data = JSON.parse(fs.readFileSync(backupPath, "utf8"));
          save(data);
          console.log(`[jsonStore] Restaure depuis backup: ${path.basename(filePath)}`);
          return data;
        } catch {
          /* no backup */
        }
      }
      return typeof defaultData === "function" ? defaultData() : structuredClone(defaultData);
    }
  }

  function save(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (backup && fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupPath);
      } catch (err) {
        console.warn(`[jsonStore] Backup echoue (${path.basename(filePath)}):`, err.message);
      }
    }
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, filePath);
  }

  return { load, save, filePath, backupPath };
}

module.exports = { createStore };
