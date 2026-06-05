const path = require("path");
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { COLOR } = require("./personality");
const { isModerator } = require("./permissions");
const { createStore } = require("./jsonStore");
const economyLog = require("./economyLog");
const ticketTranscript = require("./ticketTranscript");

const openStore = createStore(
  path.join(__dirname, "..", "data", "tickets-open.json"),
  { defaultData: {} }
);

const metaStore = createStore(
  path.join(__dirname, "..", "data", "tickets-meta.json"),
  { defaultData: {} }
);

const INACTIVE_WARN_MS = 48 * 60 * 60 * 1000;
const INACTIVE_CLOSE_MS = 72 * 60 * 60 * 1000;

function getCategoryId() {
  const raw = process.env.TICKET_CATEGORY_ID?.trim();
  if (!raw) return null;
  const match = raw.match(/\d{17,20}/);
  return match ? match[0] : null;
}

async function resolveCategory(guild, categoryId) {
  let channel = guild.channels.cache.get(categoryId);
  if (!channel) {
    channel = await guild.channels.fetch(categoryId).catch(() => null);
  }
  return channel;
}

function categoryValidationError(channel, categoryId) {
  if (!channel) {
    return (
      `ID **${categoryId}** introuvable sur ce serveur. Verifie TICKET_CATEGORY_ID dans .env ` +
      "(Discloud aussi) et que le bot est bien sur le serveur configure (`DISCORD_GUILD_ID`)."
    );
  }
  if (channel.type === ChannelType.GuildText) {
    return (
      "Tu as mis l'ID du **salon** #ticket, pas de la **categorie**. " +
      "Clic droit sur le titre **Tickets** (la barre du dossier) → Copier l'ID de la categorie — pas sur #ticket."
    );
  }
  if (channel.type !== ChannelType.GuildCategory) {
    return `TICKET_CATEGORY_ID pointe vers un type de salon invalide (type ${channel.type}).`;
  }
  return null;
}

function getStaffRoleIds() {
  const raw = process.env.TICKET_STAFF_ROLE_IDS?.trim();
  if (!raw) return [];
  return raw.split(",").map((id) => id.trim()).filter(/^\d{17,20}$/.test);
}

function formatOpenError(err, categoryId) {
  if (!err) return "Impossible d'ouvrir le ticket.";
  console.error("[tickets] openTicket:", err);

  if (err.code === 50013) {
    return (
      "Le bot n'a pas les permissions. Categorie **Tickets** : autorise **Gerer les salons** pour le role du bot. " +
      "Le role du bot doit etre **au-dessus** du role STAFF dans la liste des roles."
    );
  }
  if (err.code === 30013) {
    return "Trop de salons dans cette categorie (limite Discord). Supprime d'anciens tickets.";
  }
  if (err.code === 30007) {
    return "Limite de salons du serveur atteinte.";
  }
  if (err.code === 50035) {
    const parentErr = err.rawError?.errors?.parent_id;
    if (parentErr) {
      return (
        `TICKET_CATEGORY_ID (**${categoryId}**) n'est pas une categorie valide. ` +
        "Clic droit sur le **titre** du dossier Tickets → Copier l'ID de la categorie."
      );
    }
    return (
      "Permissions du ticket invalides (souvent role STAFF mal configure). " +
      "Verifie TICKET_STAFF_ROLE_IDS ou retire-le du .env pour tester."
    );
  }

  const detail = err.rawError?.message || err.message;
  return `Impossible de creer le ticket (${err.code || "erreur"} : ${detail}).`;
}

async function assertBotCanCreateInCategory(guild, category) {
  const me = guild.members.me;
  if (!me) return "Bot introuvable sur le serveur.";

  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return "Le bot n'a pas **Gerer les salons** sur le serveur.";
  }

  const inCategory = category.permissionsFor(me);
  if (!inCategory?.has(PermissionFlagsBits.ManageChannels)) {
    return (
      "Le bot ne peut pas creer de salon dans la categorie **Tickets**. " +
      "Parametres serveur → Categorie Tickets → permissions : active **Gerer les salons** pour le role du bot."
    );
  }
  if (!inCategory.has(PermissionFlagsBits.ViewChannel)) {
    return "Le bot ne voit pas la categorie Tickets (permission **Voir les salons**).";
  }
  return null;
}

/** Categorie tickets : .env, sinon parent du salon ou le panel a ete poste */
async function resolveTicketCategory(interaction) {
  const guild = interaction.guild;
  const fromEnv = getCategoryId();

  if (fromEnv) {
    const ch = await resolveCategory(guild, fromEnv);
    const err = categoryValidationError(ch, fromEnv);
    if (!err) return { categoryId: fromEnv, category: ch };
  }

  const parentId = interaction.channel.parentId;
  if (parentId) {
    const parent = await resolveCategory(guild, parentId);
    const err = categoryValidationError(parent, parentId);
    if (!err) {
      return { categoryId: parentId, category: parent, usedFallback: true };
    }
  }

  if (fromEnv) {
    const ch = await resolveCategory(guild, fromEnv);
    return {
      categoryId: null,
      error: categoryValidationError(ch, fromEnv) || `ID **${fromEnv}** invalide.`,
    };
  }

  return {
    categoryId: null,
    error:
      "TICKET_CATEGORY_ID manquant ou invalide. Mets l'ID de la categorie dans .env (Discloud), " +
      "ou poste le panel dans un salon sous la categorie Tickets.",
  };
}

function buildPanelPayload() {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Support — ticket")
    .setDescription(
      "Un probleme, une question pour le staff ?\n" +
        "Clique sur **Ouvrir un ticket** : un salon prive sera cree."
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel("Ouvrir un ticket")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

function buildTicketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCorePermissionOverwrites(guild, userId, clientUserId) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: clientUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
}

async function applyStaffTicketAccess(channel, guild) {
  const allow = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
  ];
  for (const roleId of getStaffRoleIds()) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    await channel.permissionOverwrites
      .edit(role, { allow })
      .catch((err) => console.warn(`[tickets] staff role ${roleId}:`, err.message));
  }
}

async function openTicket(interaction) {
  const resolved = await resolveTicketCategory(interaction);
  if (!resolved.categoryId) {
    return { ok: false, reason: resolved.error };
  }

  const categoryId = resolved.categoryId;
  const guild = interaction.guild;
  const category =
    resolved.category || (await resolveCategory(guild, categoryId));

  const permErr = await assertBotCanCreateInCategory(guild, category);
  if (permErr) {
    return { ok: false, reason: permErr };
  }

  const open = openStore.load();
  const existingId = open[interaction.user.id];
  if (existingId) {
    const ch = guild.channels.cache.get(existingId);
    if (ch) return { ok: false, reason: `Tu as deja un ticket : ${ch}` };
    delete open[interaction.user.id];
    openStore.save(open);
  }

  const safeName = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12) || "user";

  const overwrites = buildCorePermissionOverwrites(
    guild,
    interaction.user.id,
    interaction.client.user.id
  );

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `Ticket ${interaction.user.id}`,
      permissionOverwrites: overwrites,
    });
  } catch (err) {
    try {
      channel = await guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        parent: categoryId,
        topic: `Ticket ${interaction.user.id}`,
      });
      await channel.permissionOverwrites.set(overwrites);
    } catch (err2) {
      return { ok: false, reason: formatOpenError(err2, categoryId) };
    }
  }

  await applyStaffTicketAccess(channel, guild).catch((err) =>
    console.warn("[tickets] staff access:", err)
  );

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Ticket ouvert")
    .setDescription(
      `<@${interaction.user.id}>, decrivez votre demande.\n` +
        "Le staff vous repondra ici. **Fermer le ticket** quand c'est regle."
    );

  try {
    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [buildTicketControls()],
    });
  } catch (err) {
    console.error("[tickets] message accueil:", err);
    return {
      ok: true,
      channel,
      channelId: channel.id,
      warn: `Salon cree (<#${channel.id}>) mais message d'accueil impossible.`,
    };
  }

  open[interaction.user.id] = channel.id;
  openStore.save(open);

  const meta = metaStore.load();
  meta[channel.id] = {
    ownerId: interaction.user.id,
    openedAt: Date.now(),
    lastActivityAt: Date.now(),
    warned: false,
  };
  metaStore.save(meta);

  await economyLog
    .logEvent(interaction.client, {
      title: "Ticket — ouvert",
      lines: [
        `Membre : <@${interaction.user.id}>`,
        `Salon : <#${channel.id}>`,
      ],
      color: 0x57f287,
    })
    .catch((err) => console.warn("[tickets] log:", err));

  return { ok: true, channel, channelId: channel.id };
}

function getTicketOwnerId(channelId) {
  const open = openStore.load();
  for (const [uid, cid] of Object.entries(open)) {
    if (cid === channelId) return uid;
  }
  return null;
}

function getOpenTicketCount() {
  return Object.keys(openStore.load()).length;
}

function touchTicketActivity(channelId) {
  const meta = metaStore.load();
  const row = meta[channelId];
  if (!row) return;
  row.lastActivityAt = Date.now();
  row.warned = false;
  metaStore.save(meta);
}

function trackTicketMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.channel.name?.startsWith("ticket-")) return;
  touchTicketActivity(message.channel.id);
}

async function finalizeTicketClose(client, channel, closedById, options = {}) {
  const ownerId = getTicketOwnerId(channel.id) || options.ownerId || null;
  const open = openStore.load();
  if (ownerId) {
    delete open[ownerId];
    openStore.save(open);
  }

  const meta = metaStore.load();
  delete meta[channel.id];
  metaStore.save(meta);

  await ticketTranscript
    .sendTranscript(client, channel, {
      ownerId,
      closedById,
      auto: options.auto,
      reason: options.reason,
    })
    .catch(() => {});

  await economyLog.logEvent(client, {
    title: options.auto ? "Ticket — ferme (auto)" : "Ticket — ferme",
    lines: [
      ownerId ? `Membre : <@${ownerId}>` : "Membre : inconnu",
      closedById ? `Ferme par : <@${closedById}>` : "Ferme par : systeme",
      `Salon : #${channel.name}`,
      options.reason ? `Note : ${options.reason}` : null,
    ].filter(Boolean),
    color: 0xed4245,
  });

  await channel.delete().catch(() => {});
}

async function closeTicket(interaction) {
  if (!interaction.channel.name.startsWith("ticket-")) {
    return { ok: false, reason: "Ce salon n'est pas un ticket." };
  }

  const ownerId = getTicketOwnerId(interaction.channel.id);
  const isOwner = ownerId === interaction.user.id;

  if (!isModerator(interaction.member) && !isOwner) {
    return { ok: false, reason: "Seul le createur du ticket ou un modo peut fermer." };
  }

  await interaction.reply({ content: "Ticket ferme dans 3 secondes…" });
  setTimeout(() => {
    finalizeTicketClose(interaction.client, interaction.channel, interaction.user.id).catch(
      () => {}
    );
  }, 3000);
  return { ok: true };
}

async function tickInactiveTickets(client) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const meta = metaStore.load();
  const now = Date.now();

  for (const [channelId, row] of Object.entries(meta)) {
    const inactiveFor = now - (row.lastActivityAt || row.openedAt || now);
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      delete meta[channelId];
      continue;
    }

    if (inactiveFor >= INACTIVE_CLOSE_MS) {
      await channel
        .send("Ticket ferme automatiquement apres 72 h sans activite.")
        .catch(() => {});
      await finalizeTicketClose(client, channel, client.user.id, {
        auto: true,
        ownerId: row.ownerId,
        reason: "Inactivite 72 h",
      });
      continue;
    }

    if (inactiveFor >= INACTIVE_WARN_MS && !row.warned) {
      row.warned = true;
      metaStore.save(meta);
      await channel
        .send(
          `<@${row.ownerId}> Ce ticket sera **ferme automatiquement** dans 24 h sans message. ` +
            "Envoie un message ici pour le garder ouvert."
        )
        .catch(() => {});
    }
  }
}

function scheduleInactiveTicketSweep(client) {
  const tick = () => {
    tickInactiveTickets(client).catch((err) => console.error("[tickets] inactive:", err));
    setTimeout(tick, 30 * 60 * 1000);
  };
  setTimeout(tick, 60 * 1000);
}

module.exports = {
  getCategoryId,
  buildPanelPayload,
  openTicket,
  closeTicket,
  trackTicketMessage,
  scheduleInactiveTicketSweep,
  getOpenTicketCount,
};
