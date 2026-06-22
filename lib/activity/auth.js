const crypto = require("crypto");

const SESSION_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

function clientCredentials() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET requis pour l'Activity.");
  }
  return { clientId, clientSecret };
}

async function exchangeCode(code) {
  const { clientId, clientSecret } = clientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
  });

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth token: ${res.status} ${text.slice(0, 120)}`);
  }

  return res.json();
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Profil Discord: ${res.status}`);
  return res.json();
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    globalName: user.global_name || user.username,
    avatar: user.avatar,
    expiresAt: Date.now() + SESSION_MS,
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const row = sessions.get(token);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return row;
}

function bearerToken(req) {
  const raw = req.headers.authorization || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireSession(req) {
  const session = getSession(bearerToken(req));
  if (!session) return { ok: false, status: 401, error: "Session invalide ou expiree." };
  return { ok: true, session };
}

async function loginWithCode(code) {
  const tokens = await exchangeCode(code);
  const user = await fetchDiscordUser(tokens.access_token);
  const sessionToken = createSession(user);
  return { sessionToken, user };
}

module.exports = {
  loginWithCode,
  getSession,
  requireSession,
  bearerToken,
};
