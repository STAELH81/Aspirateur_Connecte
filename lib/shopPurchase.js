const path = require("path");
const { PermissionFlagsBits } = require("discord.js");
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const economyLog = require("./economyLog");
const { loadConfig } = require("./shop");

const durationStore = createStore(
  path.join(__dirname, "..", "data", "shop-roles.json"),
  { defaultData: {} }
);
const stockStore = createStore(
  path.join(__dirname, "..", "data", "shop-stock.json"),
  { defaultData: { byItem: {} } }
);

function listItems() {
  return loadConfig();
}

function itemType(item) {
  return item.type || "role";
}

function hasPersistentStock(item) {
  return item.id.startsWith("vip_") || item.stock != null;
}

function getItemStock(item) {
  if (!hasPersistentStock(item)) return null;
  const data = stockStore.load();
  data.byItem = data.byItem || {};
  if (data.byItem[item.id] == null) {
    data.byItem[item.id] = Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
    stockStore.save(data);
  }
  return data.byItem[item.id];
}

function consumeItemStock(item) {
  if (!hasPersistentStock(item)) return { ok: true, remaining: null };
  const data = stockStore.load();
  data.byItem = data.byItem || {};
  if (data.byItem[item.id] == null) {
    data.byItem[item.id] = Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
  }
  if (data.byItem[item.id] <= 0) return { ok: false, remaining: 0 };
  data.byItem[item.id] -= 1;
  stockStore.save(data);
  return { ok: true, remaining: data.byItem[item.id] };
}

function restoreItemStock(item) {
  if (!hasPersistentStock(item)) return;
  const data = stockStore.load();
  data.byItem = data.byItem || {};
  data.byItem[item.id] = Math.max(0, (data.byItem[item.id] || 0) + 1);
  stockStore.save(data);
}

function resetPersistentStock() {
  const items = loadConfig();
  const next = { byItem: {} };
  for (const item of items) {
    if (!hasPersistentStock(item)) continue;
    next.byItem[item.id] = Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
  }
  stockStore.save(next);
  return next.byItem;
}

async function buyRole(interaction, item, price) {
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
    kind: "role",
    item,
    price,
    balance: economy.getBalance(interaction.user.id),
    expires,
    days,
  };
}

async function buy(interaction, itemId) {
  const items = loadConfig();
  const item = items.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "Article introuvable." };
  const stockCheck = consumeItemStock(item);
  if (!stockCheck.ok) {
    return { ok: false, reason: `Stock epuise pour **${item.label}**.` };
  }

  const price = Math.floor(item.price);
  const balanceBefore = economy.getBalance(interaction.user.id);
  const removed = economy.removeCoins(interaction.user.id, price);
  if (!removed.ok) {
    restoreItemStock(item);
    return { ok: false, reason: `Il te faut **${price}** coins.` };
  }

  const type = itemType(item);

  if (type === "daily_boost") {
    const mult = item.multiplier || 1.5;
    const result = economy.grantDailyBoost(interaction.user.id, mult);
    if (!result.ok) {
      economy.addCoins(interaction.user.id, price);
      restoreItemStock(item);
      return result;
    }
    const payload = {
      ok: true,
      kind: "daily_boost",
      item,
      price,
      balance: removed.balance,
      multiplier: result.multiplier,
    };
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      payload.balance,
      `Boost daily x${result.multiplier} (prochain /money daily)`
    );
    return payload;
  }

  if (type === "work_reset") {
    const result = economy.resetWorkCooldown(interaction.user.id);
    if (!result.ok) {
      economy.addCoins(interaction.user.id, price);
      restoreItemStock(item);
      return result;
    }
    const payload = {
      ok: true,
      kind: "work_reset",
      item,
      price,
      balance: removed.balance,
    };
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      payload.balance,
      "Cooldown /money work remis a zero"
    );
    return payload;
  }

  if (type === "work_boost") {
    const mult = item.multiplier || 2;
    const result = economy.grantWorkBoost(interaction.user.id, mult);
    if (!result.ok) {
      economy.addCoins(interaction.user.id, price);
      restoreItemStock(item);
      return result;
    }
    const payload = {
      ok: true,
      kind: "work_boost",
      item,
      price,
      balance: removed.balance,
      multiplier: result.multiplier,
    };
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      payload.balance,
      `Boost work x${result.multiplier}`
    );
    return payload;
  }

  if (type === "streak_shield") {
    const result = economy.grantStreakShield(interaction.user.id);
    if (!result.ok) {
      economy.addCoins(interaction.user.id, price);
      restoreItemStock(item);
      return result;
    }
    const payload = {
      ok: true,
      kind: "streak_shield",
      item,
      price,
      balance: removed.balance,
    };
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      payload.balance,
      "Bouclier streak active"
    );
    return payload;
  }

  if (type === "coin_pack") {
    const coins = Math.floor(item.coins);
    const result = economy.grantCoinPack(interaction.user.id, coins);
    if (!result.ok) {
      economy.addCoins(interaction.user.id, price);
      restoreItemStock(item);
      return result;
    }
    const payload = {
      ok: true,
      kind: "coin_pack",
      item,
      price,
      balance: result.balance,
      coinsGranted: result.amount,
    };
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      payload.balance,
      `Recu **+${result.amount}** coins`
    );
    return payload;
  }

  const roleResult = await buyRole(interaction, item, price);
  if (!roleResult.ok) {
    restoreItemStock(item);
  }
  if (roleResult.ok) {
    await logShopBuy(
      interaction.client,
      interaction.user.id,
      item,
      price,
      balanceBefore,
      roleResult.balance,
      (item.durationDays || 1) === 1
        ? "Role **1 jour**"
        : `Role **${item.durationDays} jours**`
    );
  }
  return roleResult;
}

async function logShopBuy(client, userId, item, price, balanceBefore, balanceAfter, extra) {
  await economyLog.logTx(client, {
    userId,
    action: `Boutique · ${item.label}`,
    balanceBefore,
    balanceAfter,
    details: [`Prix : **${price}** coins`, extra].filter(Boolean).join("\n"),
  });
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

module.exports = {
  listItems,
  buy,
  applyPurchasedRoles,
  scheduleShopRoleCleanup,
  getItemStock,
  resetPersistentStock,
};
