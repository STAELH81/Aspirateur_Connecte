require("dotenv").config({ quiet: true });
const http = require("http");
const fs = require("fs");
const path = require("path");
const economy = require("../lib/economy");
const xp = require("../lib/xp");
const gamblingProgress = require("../lib/gamblingProgress");
const bankLoans = require("../lib/bankLoans");

const PORT = Number(process.env.DASHBOARD_PORT || 3847);
const SECRET = process.env.DASHBOARD_SECRET?.trim();
const PUBLIC = path.join(__dirname, "public");

function unauthorized(res) {
  res.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Unauthorized — mauvais DASHBOARD_SECRET");
}

function json(res, data) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function checkAuth(url) {
  if (!SECRET) return false;
  return url.searchParams.get("token") === SECRET;
}

function readUserProfile(userId) {
  const xpProfile = xp.getProfile(userId);
  const gamble = gamblingProgress.getProfile(userId);
  const loan = bankLoans.getStatus(userId);
  const quest = gamblingProgress.getQuestStatus(userId);
  return {
    userId,
    balance: gamble.balance,
    level: xpProfile.level,
    xp: `${xpProfile.xpInLevel}/${xpProfile.xpNeeded}`,
    casino: {
      games: gamble.casinoGames,
      wins: gamble.casinoWins,
      winrate: gamble.winrate,
      net: gamble.casinoNet,
      favoriteGame: gamble.favoriteGame,
    },
    bankDebt: loan.hasDebt ? loan.owed : 0,
    quest: {
      label: quest.label,
      progress: gamblingProgress.questProgressField(quest),
      reward: quest.reward,
    },
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const file = path.join(PUBLIC, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
    return;
  }

  if (!checkAuth(url)) {
    unauthorized(res);
    return;
  }

  if (url.pathname === "/api/leaderboard") {
    json(
      res,
      economy.getLeaderboard(25).map((row, i) => ({
        rank: i + 1,
        id: row.id,
        balance: row.balance,
      }))
    );
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/user\/(\d{17,20})$/);
  if (userMatch) {
    json(res, readUserProfile(userMatch[1]));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

if (!SECRET) {
  console.error("DASHBOARD_SECRET manquant dans .env — dashboard non demarre.");
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Dashboard local : http://127.0.0.1:${PORT}`);
  console.log("Lecture seule · ne pas exposer sur Internet sans HTTPS + auth forte.");
});
