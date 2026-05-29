const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { COLOR_SUCCESS, COLOR } = require("./personality");
const tickets = require("./tickets");

const ENV_CHECKS = [
  { key: "DISCORD_TOKEN", secret: true },
  { key: "DISCORD_GUILD_ID" },
  { key: "WELCOME_CHANNEL_ID" },
  { key: "GAMBLING_CHANNEL_ID" },
  { key: "GAMBLING_MONEY_ID" },
  { key: "GAMBLING_SHOP_ID" },
  { key: "GAMBLING_INFOS_ID" },
  { key: "ECONOMY_LOG_CHANNEL_ID" },
  { key: "GENERAL_CHANNEL_ID" },
  { key: "TICKET_CATEGORY_ID" },
  { key: "TICKET_STAFF_ROLE_IDS" },
  { key: "SUGGESTIONS_CHANNEL_ID" },
  { key: "BOT_OWNER_USER_ID" },
];

const DATA_FILES = [
  "economy.json",
  "gambling-progress.json",
  "xp.json",
  "tickets-open.json",
  "warns.json",
  "giveaways.json",
];

function envLine(key, secret) {
  const val = process.env[key]?.trim();
  if (!val) return `❌ \`${key}\` — manquant`;
  if (secret) return `✅ \`${key}\` — defini`;
  return `✅ \`${key}\` — \`${val.slice(0, 8)}…\``;
}

async function checkChannel(guild, id, label) {
  if (!id) return `⚪ \`${label}\` — non configure`;
  const ch = await guild.channels.fetch(id).catch(() => null);
  if (!ch) return `❌ \`${label}\` — introuvable (${id})`;
  return `✅ \`${label}\` — #${ch.name}`;
}

async function checkBotPerms(guild) {
  const me = guild.members.me;
  if (!me) return ["❌ Bot introuvable sur le serveur"];
  const lines = [];
  const need = [
    ["ManageChannels", PermissionFlagsBits.ManageChannels],
    ["ManageRoles", PermissionFlagsBits.ManageRoles],
    ["SendMessages", PermissionFlagsBits.SendMessages],
    ["ViewChannel", PermissionFlagsBits.ViewChannel],
  ];
  for (const [name, flag] of need) {
    lines.push(
      me.permissions.has(flag)
        ? `✅ Permission **${name}**`
        : `❌ Permission **${name}** manquante`
    );
  }
  return lines;
}

function dataFileStatus() {
  const dir = path.join(__dirname, "..", "data");
  return DATA_FILES.map((file) => {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) return `⚪ \`${file}\` — absent (cree au besoin)`;
    const stat = fs.statSync(full);
    const kb = Math.round(stat.size / 1024);
    return `✅ \`${file}\` — ${kb} Ko`;
  });
}

async function buildStatusEmbed(client) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;

  const envLines = ENV_CHECKS.map(({ key, secret }) => envLine(key, secret));
  const channelLines = guild
    ? await Promise.all([
        checkChannel(guild, process.env.GAMBLING_CHANNEL_ID, "GAMBLING_CHANNEL"),
        checkChannel(guild, process.env.GAMBLING_MONEY_ID, "GAMBLING_MONEY"),
        checkChannel(guild, process.env.ECONOMY_LOG_CHANNEL_ID, "ECONOMY_LOG"),
        checkChannel(guild, process.env.TICKET_CATEGORY_ID?.match(/\d{17,20}/)?.[0], "TICKET_CATEGORY"),
      ])
    : ["❌ Serveur (DISCORD_GUILD_ID) inaccessible"];

  const ticketCatId = process.env.TICKET_CATEGORY_ID?.match(/\d{17,20}/)?.[0];
  let ticketNote = "";
  if (guild && ticketCatId) {
    const cat = await guild.channels.fetch(ticketCatId).catch(() => null);
    ticketNote =
      cat?.type === ChannelType.GuildCategory
        ? "Categorie tickets OK"
        : "TICKET_CATEGORY_ID n'est pas une categorie";
  }

  const openTickets = tickets.getOpenTicketCount();

  const uptimeMin = Math.floor(client.uptime / 60_000);
  const permLines = guild ? await checkBotPerms(guild) : [];

  return new EmbedBuilder()
    .setColor(guild ? COLOR_SUCCESS : COLOR)
    .setTitle("Bot status — Aspirateur Connecte")
    .setDescription(
      [
        `**Uptime** : ${uptimeMin} min`,
        `**Ping** : ${client.ws.ping} ms`,
        `**Tickets ouverts** : ${openTickets}`,
        ticketNote,
        `**Commandes** : ${client.commands?.size ?? "?"}`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .addFields(
      { name: "Variables .env", value: envLines.join("\n").slice(0, 1024) },
      { name: "Salons", value: channelLines.join("\n").slice(0, 1024) },
      { name: "Permissions bot", value: permLines.join("\n").slice(0, 1024) || "—" },
      { name: "Fichiers data/", value: dataFileStatus().join("\n").slice(0, 1024) }
    )
    .setFooter({ text: "Staff · /botstatus" })
    .setTimestamp();
}

module.exports = { buildStatusEmbed };
