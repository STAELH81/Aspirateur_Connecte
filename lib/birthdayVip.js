const path = require("path");
const { PermissionFlagsBits } = require("discord.js");
const { createStore } = require("./jsonStore");
const { getTodayBirthdayUserIds } = require("./birthdayAnnounce");

const VIP_DAYS = 5;
const VIP_MS = VIP_DAYS * 24 * 60 * 60 * 1000;

const store = createStore(path.join(__dirname, "..", "data", "birthday-vip.json"), {
  defaultData: {},
});

function getRoleId() {
  return process.env.BIRTHDAY_VIP_ROLE_ID?.trim() || null;
}

function grant(userId) {
  const data = store.load();
  const expires = Date.now() + VIP_MS;
  data[userId] = expires;
  store.save(data);
  return expires;
}

function getExpiry(userId) {
  return store.load()[userId] || 0;
}

async function applyRole(member, roleId) {
  const role = member.guild.roles.cache.get(roleId);
  if (!role) return { ok: false, error: "role" };

  const me = member.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, error: "permission" };
  }
  if (role.position >= me.roles.highest.position) {
    return { ok: false, error: "hierarchy" };
  }

  await member.roles.add(role).catch(() => null);
  return { ok: true };
}

async function removeRole(member, roleId) {
  const role = member.guild.roles.cache.get(roleId);
  if (!role) return;
  await member.roles.remove(role).catch(() => {});
}

async function processTodayBirthdays(client) {
  const roleId = getRoleId();
  if (!roleId) return;

  const userIds = getTodayBirthdayUserIds();
  if (userIds.length === 0) return;

  const guildId = process.env.DISCORD_GUILD_ID;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  for (const userId of userIds) {
    const expires = getExpiry(userId);
    if (expires > Date.now()) continue;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;

    grant(userId);
    await applyRole(member, roleId);
    console.log(`VIP anniv 5j : ${member.user.tag}`);
  }
}

async function cleanupExpired(client) {
  const roleId = getRoleId();
  if (!roleId) return;

  const guildId = process.env.DISCORD_GUILD_ID;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const data = store.load();
  const now = Date.now();
  let changed = false;

  for (const [userId, expires] of Object.entries(data)) {
    if (expires > now) continue;
    delete data[userId];
    changed = true;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await removeRole(member, roleId);
  }

  if (changed) store.save(data);
}

function scheduleBirthdayVip(client) {
  const roleId = getRoleId();
  if (!roleId) return;

  const tick = async () => {
    try {
      await processTodayBirthdays(client);
      await cleanupExpired(client);
    } catch (err) {
      console.error("VIP anniv:", err);
    }
  };

  tick();
  setInterval(tick, 60 * 60 * 1000);
}

module.exports = { scheduleBirthdayVip, processTodayBirthdays, VIP_DAYS };
