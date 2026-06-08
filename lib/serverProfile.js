const PROFILE = (process.env.BOT_PROFILE || "girlsss").trim().toLowerCase();

const ROCK = PROFILE === "rock-and-roll";

const DISABLED_COMMANDS = ROCK
  ? new Set(["girlsss", "gazette", "dashboard", "devlog"])
  : new Set();

function isRockAndRoll() {
  return ROCK;
}

function brandName() {
  return ROCK ? "Rock n Roll" : "Les Girlsss";
}

function botDisplayName() {
  return ROCK ? "BotQuick" : "Aspirateur Connecte";
}

function footerText() {
  return ROCK ? "Rock n Roll · BotQuick" : "Les Girlsss";
}

function feature(name) {
  const flags = {
    shop: !ROCK,
    gazette: !ROCK,
    dashboard: !ROCK,
    devlog: !ROCK,
    siteLinks: !ROCK,
    music: ROCK,
    voicePresence: !ROCK,
    shopCleanup: !ROCK,
  };
  return flags[name] ?? true;
}

function isCommandEnabled(name) {
  return !DISABLED_COMMANDS.has(name);
}

function coopGoalDefault() {
  return ROCK ? 100 : 250;
}

module.exports = {
  isRockAndRoll,
  brandName,
  botDisplayName,
  footerText,
  feature,
  isCommandEnabled,
  coopGoalDefault,
  PROFILE,
};
