const path = require("path");
const { PermissionFlagsBits } = require("discord.js");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const { loadConfig } = require("./shop");

const durationStore = createStore(
  path.join(__dirname, "..", "data", "shop-roles.json"),
  { defaultData: {} }
);

function listItems() {
  return loadConfig();
}

async function buy(interaction, itemId) {
  const items = loadConfig();
  const item = items.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "Article introuvable." };

  const price = Math.floor(item.price);
  const removed = economy.removeCoins(interaction.user.id, price);
  if (!removed.ok) {
    return { ok: false, reason: `Il te faut **${price}** coins.` };
  }

  const role = interaction.guild.roles.cache.get(item.roleId);
  if (!role) {
    economy.addCoins(interaction.user.id, price);
    return { ok: false, reason: "Role configure introuvable (shop.json)." };
  }

  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    economy.addCoins(interaction.user.id, price);
    return { ok: false, reason: "Le bot ne peut pas gerer les roles." };
  }
  if (role.position >= me.roles.highest.position) {
    economy.addCoins(interaction.user.id, price);
    return { ok: false, reason: "Role trop haut — monte le role du bot." };
  }

  const days = Math.max(1, Math.floor(item.durationDays || 1));
  const expires = Date.now() + days * 86_400_000;
  const data = durationStore.load();
  data[interaction.user.id] = data[interaction.user.id] || [];
  data[interaction.user.id].push({ roleId: item.roleId, expires, label: item.label });
  durationStore.save(data);
  await interaction.member.roles.add(role).catch(() => null);

  return {
    ok: true,
    item,
    price,
    balance: removed.balance,
    expires,
    days,
  };
}

async function applyPurchasedRoles(member) {
  const data = durationStore.load();
  const list = data[member.id];
  if (!list?.length) return;

  const now = Date.now();
  const kept = [];
  for (const entry of list) {
    if (entry.expires <= now) {
      const role = member.guild.roles.cache.get(entry.roleId);
      if (role) await member.roles.remove(role).catch(() => {});
    } else {
      kept.push(entry);
    }
  }

  if (kept.length) data[member.id] = kept;
  else delete data[member.id];
  durationStore.save(data);
}

function scheduleShopRoleCleanup(client) {
  const tick = async () => {
    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return;
    for (const member of members.values()) {
      await applyPurchasedRoles(member);
    }
  };
  setInterval(() => tick().catch(() => {}), 60 * 60 * 1000);
}

module.exports = { listItems, buy, applyPurchasedRoles, scheduleShopRoleCleanup };
