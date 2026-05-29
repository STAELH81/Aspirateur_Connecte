const fs = require("fs");
const path = require("path");
const economy = require("./economy");
const xp = require("./xp");
const gamblingProgress = require("./gamblingProgress");
const gamblingGazette = require("./gamblingGazette");
const coopGoal = require("./coopGoal");

const PUBLIC_DIR = path.join(__dirname, "..", "dashboard", "public");
const SITE_TOML = path.join(__dirname, "..", "dashboard", "site", "netlify.toml");
const SNAPSHOT_PATH = path.join(PUBLIC_DIR, "stats.json");
const DATA_SNAPSHOT = path.join(__dirname, "..", "data", "dashboard-snapshot.json");

function siteBranch() {
  return process.env.GITHUB_SITE_BRANCH?.trim() || "site";
}

function syncIntervalMs() {
  const raw = Number(process.env.DASHBOARD_SYNC_MINUTES);
  const minutes = Number.isFinite(raw) && raw >= 5 ? raw : 60;
  return minutes * 60 * 1000;
}

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
    coopGoal: {
      target: coopGoal.GOAL_GAMES,
      progress: recap.totalGames,
      reward: coopGoal.REWARD_COINS,
    },
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

async function resolveMemberName(guild, userId) {
  if (!guild || !userId) return null;
  const member = await guild.members.fetch(userId).catch(() => null);
  return member?.displayName || member?.user?.username || null;
}

async function enrichSnapshot(client, snapshot) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId || !client) return snapshot;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return snapshot;

  const nameCache = new Map();
  async function nameFor(id) {
    if (!id) return null;
    if (nameCache.has(id)) return nameCache.get(id);
    const n = await resolveMemberName(guild, id);
    nameCache.set(id, n);
    return n;
  }

  for (const row of snapshot.leaderboard) {
    row.name = (await nameFor(row.id)) || row.id;
  }
  for (const row of snapshot.xpTop) {
    row.name = (await nameFor(row.id)) || row.id;
  }

  const c = snapshot.todayCasino;
  for (const key of ["topWinner", "topLoser", "mostActive"]) {
    const entry = c[key];
    if (entry?.id) entry.name = (await nameFor(entry.id)) || entry.id;
  }

  return snapshot;
}

function writeSnapshotFiles(snapshot) {
  const json = JSON.stringify(snapshot, null, 2);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(DATA_SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, json);
  fs.writeFileSync(DATA_SNAPSHOT, json);
  return { snapshotPath: SNAPSHOT_PATH, dataPath: DATA_SNAPSHOT };
}

function siteFiles(snapshot) {
  const files = [
    { path: "stats.json", content: JSON.stringify(snapshot, null, 2) },
    { path: "index.html", content: fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8") },
  ];
  if (fs.existsSync(SITE_TOML)) {
    files.push({ path: "netlify.toml", content: fs.readFileSync(SITE_TOML, "utf8") });
  }
  return files;
}

async function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Aspirateur-Connecte-Bot",
    "Content-Type": "application/json",
  };
}

async function getFileSha(owner, repo, branch, filePath, headers) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, { headers }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function ensureBranchExists(owner, repo, branch, headers) {
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const existing = await fetch(refUrl, { headers });
  if (existing.ok) return { ok: true };

  return {
    ok: false,
    reason:
      `Branche **${branch}** absente. Lance **scripts/init-site-branch.ps1** une fois, puis reessaie.`,
  };
}

async function putGitHubFile(owner, repo, branch, filePath, content, headers, message) {
  const sha = await getFileSha(owner, repo, branch, filePath, headers);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    return { ok: false, reason: `${filePath} : ${putRes.status} ${err.slice(0, 120)}` };
  }
  return { ok: true };
}

async function pushToGitHub(snapshot) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = siteBranch();

  if (!token || !owner || !repo) {
    return { ok: false, reason: "GITHUB_TOKEN / GITHUB_REPO_OWNER / GITHUB_REPO non configures." };
  }

  const headers = await githubHeaders(token);
  const branchCheck = await ensureBranchExists(owner, repo, branch, headers);
  if (!branchCheck.ok) return branchCheck;

  const files = siteFiles(snapshot);
  for (const file of files) {
    const result = await putGitHubFile(
      owner,
      repo,
      branch,
      file.path,
      file.content,
      headers,
      `chore(site): update ${file.path}`
    );
    if (!result.ok) return result;
  }

  return {
    ok: true,
    branch,
    files: files.map((f) => f.path),
    hint: `Netlify : branche **${branch}**, publish **/** (racine)`,
  };
}

async function syncDashboard(options = {}) {
  let snapshot = buildSnapshot();
  if (options.client) {
    snapshot = await enrichSnapshot(options.client, snapshot);
  }
  const files = writeSnapshotFiles(snapshot);

  if (!options.pushGitHub) {
    return { ok: true, snapshot, files, github: null };
  }

  const github = await pushToGitHub(snapshot);
  return { ok: true, snapshot, files, github };
}

module.exports = {
  buildSnapshot,
  writeSnapshotFiles,
  syncDashboard,
  pushToGitHub,
  siteBranch,
  syncIntervalMs,
};
