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

async function openTicket(interaction) {
  const categoryId = getCategoryId();
  if (!categoryId) {
    return { ok: false, reason: "TICKET_CATEGORY_ID manquant dans la config du bot." };
  }

  const guild = interaction.guild;
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

  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

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

async function closeTicket(interaction) {
  if (!interaction.channel.name.startsWith("ticket-")) {
    return { ok: false, reason: "Ce salon n'est pas un ticket." };
  }

  const member = interaction.member;
  const ownerMatch = interaction.channel.name.includes(
    interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)
  );

  if (!isModerator(member) && !ownerMatch) {
    return { ok: false, reason: "Seul le createur du ticket ou un modo peut fermer." };
  }

  const open = openStore.load();
  for (const [uid, cid] of Object.entries(open)) {
    if (cid === interaction.channel.id) {
      delete open[uid];
      openStore.save(open);
      break;
    }
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
