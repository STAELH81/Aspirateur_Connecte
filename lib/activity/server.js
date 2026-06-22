const http = require("http");
const { WebSocketServer } = require("ws");
const auth = require("./auth");
const activityCasino = require("./casinoRound");
const rooms = require("./rooms");

const PORT = Number(process.env.ACTIVITY_API_PORT || 3848);

function corsHeaders(origin) {
  const allowed = process.env.ACTIVITY_CORS_ORIGIN?.trim() || "*";
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? origin || "*" : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function sendJson(res, status, data, origin) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(origin),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function roomIdFromParts(guildId, channelId) {
  if (!guildId || !channelId) return null;
  return `${guildId}:${channelId}`;
}

function createActivityServer(client) {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(origin));
      res.end();
      return;
    }

    try {
      if (req.method === "POST" && url.pathname === "/api/activity/auth") {
        const body = await readJson(req);
        if (!body.code) {
          sendJson(res, 400, { ok: false, error: "code manquant" }, origin);
          return;
        }
        const login = await auth.loginWithCode(body.code);
        const profile = activityCasino.getPlayerProfile(login.user.id);
        sendJson(
          res,
          200,
          {
            ok: true,
            token: login.sessionToken,
            user: {
              id: login.user.id,
              username: login.user.username,
              globalName: login.user.global_name || login.user.username,
            },
            profile,
          },
          origin
        );
        return;
      }

      const sessionCheck = auth.requireSession(req);
      if (!sessionCheck.ok && url.pathname.startsWith("/api/activity/")) {
        sendJson(res, sessionCheck.status, { ok: false, error: sessionCheck.error }, origin);
        return;
      }
      const { session } = sessionCheck;

      if (req.method === "GET" && url.pathname === "/api/activity/me") {
        sendJson(res, 200, { ok: true, profile: activityCasino.getPlayerProfile(session.userId) }, origin);
        return;
      }

      const roomMatch = url.pathname.match(/^\/api\/activity\/room\/([^/]+)$/);
      if (roomMatch) {
        const roomId = decodeURIComponent(roomMatch[1]);

        if (req.method === "GET") {
          const room = rooms.getOrCreateRoom(roomId, client);
          room.join(session.userId, session.globalName || session.username);
          sendJson(res, 200, { ok: true, room: rooms.publicRoom(room) }, origin);
          return;
        }

        if (req.method === "POST") {
          const body = await readJson(req);
          const room = rooms.getOrCreateRoom(roomId, client);
          room.join(session.userId, session.globalName || session.username);

          if (body.action === "bet") {
            const outcome = room.placeBet(
              session.userId,
              session.globalName || session.username,
              body.bet,
              body.choice
            );
            if (!outcome.ok) {
              sendJson(res, 400, outcome, origin);
              return;
            }
            sendJson(res, 200, { ok: true, room: outcome.room }, origin);
            return;
          }

          sendJson(res, 400, { ok: false, error: "action inconnue" }, origin);
          return;
        }
      }

      if (req.method === "POST" && url.pathname === "/api/activity/room") {
        const body = await readJson(req);
        const roomId = roomIdFromParts(body.guildId, body.channelId);
        if (!roomId) {
          sendJson(res, 400, { ok: false, error: "guildId et channelId requis" }, origin);
          return;
        }
        const room = rooms.getOrCreateRoom(roomId, client);
        room.join(session.userId, session.globalName || session.username);
        sendJson(res, 200, { ok: true, roomId, room: rooms.publicRoom(room) }, origin);
        return;
      }

      sendJson(res, 404, { ok: false, error: "not found" }, origin);
    } catch (err) {
      console.error("[activity-api]", err);
      sendJson(res, 500, { ok: false, error: err.message || "erreur serveur" }, origin);
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/api/activity/ws") {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token");
    const roomId = url.searchParams.get("roomId");
    const session = auth.getSession(token);
    if (!session || !roomId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const room = rooms.getOrCreateRoom(roomId, client);
      room.join(session.userId, session.globalName || session.username);

      const push = (state) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "room", room: state }));
        }
      };

      ws.send(JSON.stringify({ type: "room", room: rooms.publicRoom(room) }));
      const unsub = rooms.subscribeRoom(roomId, push);

      ws.on("close", () => unsub());
      ws.on("error", () => unsub());
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[activity-api] Ecoute sur 0.0.0.0:${PORT}`);
  });

  return server;
}

function startActivityServer(client) {
  if (process.env.ACTIVITY_ENABLED !== "1") {
    console.log("[activity-api] Desactive (ACTIVITY_ENABLED!=1).");
    return null;
  }
  return createActivityServer(client);
}

module.exports = { startActivityServer, PORT };
