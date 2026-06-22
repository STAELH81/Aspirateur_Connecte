import "./style.css";
import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const API_BASE = import.meta.env.VITE_API_BASE || "";

const app = document.getElementById("app") || ensureMount();
let sdk;
let session = null;
let roomId = null;
let ws = null;
let roomState = null;
let selectedChoice = "rouge";
let betAmount = 50;

function ensureMount() {
  const existing = document.getElementById("app");
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = "app";
  document.body.appendChild(el);
  return el;
}

function renderFatal(message, extra = "") {
  const mount = ensureMount();
  const details = extra ? `<pre>${String(extra)}</pre>` : "";
  mount.innerHTML = `
    <div class="screen center error fatal">
      <h2>Activity error</h2>
      <p>${String(message)}</p>
      ${details}
    </div>
  `;
}

window.addEventListener("error", (event) => {
  renderFatal(event.message || "Unknown window error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  renderFatal(reason?.message || "Unhandled promise rejection", reason?.stack || "");
});

function $(html) {
  const el = document.createElement("div");
  el.innerHTML = html.trim();
  return el.firstElementChild;
}

function renderLoading(msg) {
  app.innerHTML = `<div class="screen center"><div class="loader"></div><p>${msg}</p></div>`;
}

function colorClass(c) {
  if (c === "rouge") return "red";
  if (c === "noir") return "black";
  if (c === "vert") return "green";
  return "";
}

function wheelNumber(roll) {
  if (roll === null || roll === undefined) return "?";
  return roll;
}

function renderGame() {
  const phase = roomState?.phase || "betting";
  const roll = roomState?.roll;
  const color = roomState?.color;
  const timeLeft = roomState?.bettingEndsAt
    ? Math.max(0, Math.ceil((roomState.bettingEndsAt - Date.now()) / 1000))
    : 0;

  const myBet = roomState?.bets?.find((b) => b.userId === session.user.id);
  const myResult = roomState?.results?.find((r) => r.userId === session.user.id);

  app.innerHTML = "";

  const root = $(`
    <div class="casino">
      <header class="top">
        <div class="brand">
          <span class="logo">🧹</span>
          <div>
            <h1>Aspirateur Royale</h1>
            <p>Les Girlsss · coins reels</p>
          </div>
        </div>
        <div class="balance">
          <span>Solde</span>
          <strong>${session.profile.balance} coins</strong>
        </div>
      </header>

      <section class="wheel-zone">
        <div class="wheel ${phase === "spinning" ? "spinning" : ""} ${colorClass(color)}">
          <div class="wheel-inner">
            <span class="roll">${wheelNumber(roll)}</span>
          </div>
          <div class="wheel-glow"></div>
        </div>
        <p class="phase-label">${
          phase === "betting"
            ? `Paris ouverts · ${timeLeft}s`
            : phase === "spinning"
              ? "La roue tourne..."
              : `Resultat · ${color || ""}`
        }</p>
      </section>

      <section class="table" id="bet-panel"></section>
      <section class="players" id="players"></section>
      <section class="results" id="results"></section>
    </div>
  `);

  app.appendChild(root);

  const betPanel = root.querySelector("#bet-panel");
  if (phase === "betting" && !myBet?.locked) {
    betPanel.appendChild(renderBetPanel());
  } else if (myBet?.locked) {
    betPanel.innerHTML = `<div class="locked-bet">Mise <strong>${myBet.bet}</strong> sur <strong>${myBet.choice}</strong> — en attente du tirage</div>`;
  } else {
    betPanel.innerHTML = "";
  }

  const playersEl = root.querySelector("#players");
  const bets = roomState?.bets || [];
  playersEl.innerHTML =
    bets.length === 0
      ? `<p class="muted">En attente de joueurs...</p>`
      : `<h3>Table · pot ${roomState.pot || 0} coins</h3>` +
        bets
          .map(
            (b) => `
      <div class="player-row ${b.userId === session.user.id ? "me" : ""}">
        <span>${b.displayName}</span>
        <span>${b.locked ? `${b.bet} → ${b.choice}` : "..."}</span>
      </div>`
          )
          .join("");

  const resultsEl = root.querySelector("#results");
  if (phase === "results" && myResult?.result) {
    const r = myResult.result;
    resultsEl.innerHTML = `
      <div class="result-card ${r.won ? "win" : "lose"}">
        ${r.won ? `+${r.win} coins` : `-${r.bet} coins`} · solde ${r.balance}
        ${r.jackpotWin ? `<div class="jackpot">JACKPOT +${r.jackpotWin}</div>` : ""}
      </div>`;
  } else {
    resultsEl.innerHTML = "";
  }
}

function renderBetPanel() {
  const panel = $(`<div class="bet-panel"></div>`);
  panel.innerHTML = `
    <div class="choices">
      <button type="button" data-choice="rouge" class="choice red ${selectedChoice === "rouge" ? "active" : ""}">Rouge x2</button>
      <button type="button" data-choice="vert" class="choice green ${selectedChoice === "vert" ? "active" : ""}">Vert x9</button>
      <button type="button" data-choice="noir" class="choice black ${selectedChoice === "noir" ? "active" : ""}">Noir x2</button>
    </div>
    <div class="bet-row">
      <input type="number" id="bet-input" min="10" value="${betAmount}" />
      <div class="quick-bets">
        <button type="button" data-amt="25">25</button>
        <button type="button" data-amt="50">50</button>
        <button type="button" data-amt="100">100</button>
        <button type="button" data-amt="max">MAX</button>
      </div>
      <button type="button" id="place-bet" class="cta">Miser</button>
    </div>
  `;

  panel.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedChoice = btn.dataset.choice;
      renderGame();
    });
  });

  panel.querySelectorAll("[data-amt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.amt === "max") {
        betAmount = Math.min(
          Math.floor(session.profile.balance * 0.75),
          2000
        );
      } else {
        betAmount = Number(btn.dataset.amt);
      }
      renderGame();
    });
  });

  panel.querySelector("#place-bet").addEventListener("click", placeBet);
  return panel;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.reason || `HTTP ${res.status}`);
  return data;
}

async function placeBet() {
  const input = document.getElementById("bet-input");
  const amount = Math.floor(Number(input?.value || betAmount));
  try {
    const data = await api(`/api/activity/room/${encodeURIComponent(roomId)}`, {
      method: "POST",
      body: JSON.stringify({ action: "bet", bet: amount, choice: selectedChoice }),
    });
    roomState = data.room;
    session.profile.balance = (
      await api("/api/activity/me")
    ).profile.balance;
    renderGame();
  } catch (err) {
    alert(err.message);
  }
}

function connectWs() {
  if (ws) ws.close();
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const host = location.host;
  ws = new WebSocket(
    `${proto}://${host}/api/activity/ws?token=${encodeURIComponent(session.token)}&roomId=${encodeURIComponent(roomId)}`
  );
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "room") {
      roomState = msg.room;
      renderGame();
    }
  };
  ws.onclose = () => {
    setTimeout(connectWs, 2000);
  };
}

async function joinRoom() {
  const data = await api("/api/activity/room", {
    method: "POST",
    body: JSON.stringify({
      guildId: sdk.guildId,
      channelId: sdk.channelId,
    }),
  });
  roomId = data.roomId;
  roomState = data.room;
  connectWs();
  renderGame();
  setInterval(() => {
    if (roomState?.phase === "betting") renderGame();
  }, 1000);
}

async function authenticate() {
  await sdk.ready();
  const { code } = await sdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  const data = await api("/api/activity/auth", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  session = {
    token: data.token,
    user: data.user,
    profile: data.profile,
  };
}

async function boot() {
  if (!CLIENT_ID) {
    app.innerHTML = `<div class="screen center error">VITE_DISCORD_CLIENT_ID manquant (build Activity)</div>`;
    return;
  }

  renderLoading("Connexion Discord...");
  sdk = new DiscordSDK(CLIENT_ID);
  await authenticate();
  renderLoading("Ouverture de la table...");
  await joinRoom();
}

boot().catch((err) => {
  console.error(err);
  renderFatal(err.message || "Boot failed", err.stack || "");
});
