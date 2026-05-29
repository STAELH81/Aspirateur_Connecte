const fs = require("fs");
const path = require("path");
const economy = require("./economy");
const xp = require("./xp");
const gamblingProgress = require("./gamblingProgress");
const gamblingGazette = require("./gamblingGazette");

const SNAPSHOT_PATH = path.join(__dirname, "..", "dashboard", "public", "stats.json");
const DATA_SNAPSHOT = path.join(__dirname, "..", "data", "dashboard-snapshot.json");

function buildSnapshot() {
  const leaderboard = economy.getLeaderboard(25).map((row, i) => ({
    rank: i + 1,
    id: row.id,
    balance: row.balance,
  }));

  const xpBoard = xp.getLeaderboard(15).map((row, i) => ({
    rank: i + 1,
    id: row.id,
    level: row.level,
    totalXp: row.totalXp,
  }));

  const recap = gamblingProgress.getDailyRecap(gamblingGazette.todayKey());

  return {
    updatedAt: new Date().toISOString(),
    server: "Les Girlsss",
    leaderboard,
    xpTop: xpBoard,
    todayCasino: {
      dayKey: recap.dayKey,
      totalGames: recap.totalGames,
      totalBet: recap.totalBet,
      topWinner: recap.topWinner,
      topLoser: recap.topLoser,
      mostActive: recap.mostActive,
    },
  };
}

function writeSnapshotFiles(snapshot) {
  const json = JSON.stringify(snapshot, null, 2);
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(DATA_SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, json);
  fs.writeFileSync(DATA_SNAPSHOT, json);
  return { snapshotPath: SNAPSHOT_PATH, dataPath: DATA_SNAPSHOT };
}

async function pushToGitHub(snapshot) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_REPO_BRANCH?.trim() || "main";
  const filePath = process.env.GITHUB_STATS_PATH?.trim() || "dashboard/public/stats.json";

  if (!token || !owner || !repo) {
    return { ok: false, reason: "GITHUB_TOKEN / GITHUB_REPO_OWNER / GITHUB_REPO non configures." };
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const content = Buffer.from(JSON.stringify(snapshot, null, 2)).toString("base64");

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Aspirateur-Connecte-Bot",
    "Content-Type": "application/json",
  };

  let sha;
  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers }).catch(() => null);
  if (getRes?.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "chore: update dashboard stats",
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    return { ok: false, reason: `GitHub API : ${putRes.status} ${err.slice(0, 200)}` };
  }

  return { ok: true, url: `https://${owner}.github.io/${repo}/` };
}

async function syncDashboard(options = {}) {
  const snapshot = buildSnapshot();
  const files = writeSnapshotFiles(snapshot);

  if (!options.pushGitHub) {
    return { ok: true, snapshot, files, github: null };
  }

  const github = await pushToGitHub(snapshot);
  return { ok: true, snapshot, files, github };
}

module.exports = { buildSnapshot, writeSnapshotFiles, syncDashboard, pushToGitHub };
