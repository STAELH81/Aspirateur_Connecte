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

const openStore = createStore(
  path.join(__dirname, "..", "data", "tickets-open.json"),
  { defaultData: {} }
);

function getCategoryId() {
  return process.env.TICKET_CATEGORY_ID?.trim() || null;
}

function getStaffRoleIds() {
  const raw = process.env.TICKET_STAFF_ROLE_IDS?.trim();
  if (!raw) return [];
  return raw.split(",").map((id) => id.trim()).filter(/^\d{17,20}$/.test);
}

function formatOpenError(err) {
  if (!err) return "Impossible d'ouvrir le ticket.";
  if (err.code === 50013) {
    return (
      "Le bot n'a pas les permissions (il lui faut **Gerer les salons** / Manage Channels, " +
      "et le role du bot doit etre **au-dessus** des roles a attribuer)."
    );
  }
  if (err.code === 30013) {
    return "Trop de salons dans cette categorie (limite Discord). Supprime d'anciens tickets.";
  }
  console.error("[tickets] openTicket:", err);
  return "Erreur Discord a l'ouverture du ticket. Verifie TICKET_CATEGORY_ID et les permissions du bot.";
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

function buildPermissionOverwrites(guild, userId, clientUserId) {
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
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

  for (const roleId of getStaffRoleIds()) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  return overwrites;
}

async function openTicket(interaction) {
  const categoryId = getCategoryId();
  if (!categoryId) {
    return {
      ok: false,
      reason:
        "TICKET_CATEGORY_ID manquant. Ajoute l'ID de la **categorie** tickets dans .env (Discloud + local).",
    };
  }

  const guild = interaction.guild;
  const category = guild.channels.cache.get(categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return {
      ok: false,
      reason:
        "TICKET_CATEGORY_ID invalide : ce n'est pas une categorie Discord. Clic droit sur la categorie → Copier l'identifiant.",
    };
  }

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return {
      ok: false,
      reason: "Le bot n'a pas la permission **Gerer les salons** sur ce serveur.",
    };
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

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `Ticket de ${interaction.user.tag} (${interaction.user.id})`,
      permissionOverwrites: buildPermissionOverwrites(
        guild,
        interaction.user.id,
        interaction.client.user.id
      ),
    });
  } catch (err) {
    return { ok: false, reason: formatOpenError(err) };
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Ticket ouvert")
    .setDescription(
      `${interaction.user}, decrivez votre demande.\n` +
        "Le staff vous repondra ici. **Fermer le ticket** quand c'est regle."
    );

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [buildTicketControls()],
  });

  open[interaction.user.id] = channel.id;
  openStore.save(open);

  return { ok: true, channel };
}

function getTicketOwnerId(channelId) {
  const open = openStore.load();
  for (const [uid, cid] of Object.entries(open)) {
    if (cid === channelId) return uid;
  }
  return null;
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

  const open = openStore.load();
  if (ownerId) {
    delete open[ownerId];
    openStore.save(open);
  }

  await interaction.reply({ content: "Ticket ferme dans 3 secondes…" });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  return { ok: true };
}

module.exports = {
  getCategoryId,
  buildPanelPayload,
  openTicket,
  closeTicket,
};
