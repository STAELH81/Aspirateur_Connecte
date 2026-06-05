const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { COLOR_SUCCESS, COLOR } = require("./personality");
const tickets = require("./tickets");
const coopGoal = require("./coopGoal");

/** Version affichee staff — aligner sur le drop / annonce en cours. */
const BOT_VERSION = "1.2.10";

const ENV_CORE = [
  { key: "DISCORD_TOKEN", secret: true },
  { key: "DISCORD_GUILD_ID" },
];

const ENV_SALONS = [
  { key: "GAMBLING_CHANNEL_ID", label: "casino" },
  { key: "GAMBLING_BANK_ID", label: "banque" },
  { key: "QUESTS_BOARD_CHANNEL_ID", label: "money (hub)" },
  { key: "GAMBLING_SHOP_ID", label: "shop" },
  { key: "GAMBLING_INFOS_ID", label: "infos" },
  { key: "UPDATES_CHANNEL_ID", label: "devlog (/devlog post)" },
  { key: "GENERAL_CHANNEL_ID", label: "general" },
  { key: "ECONOMY_LOG_CHANNEL_ID", label: "economy logs" },
  { key: "WELCOME_CHANNEL_ID", label: "welcome" },
  { key: "GAMBLING_TEST_CHANNEL_ID", label: "test bots", optional: true },
];

const ENV_OTHER = [
  { key: "TICKET_CATEGORY_ID" },
  { key: "TICKET_STAFF_ROLE_IDS" },
  { key: "SUGGESTIONS_CHANNEL_ID" },
  { key: "BOT_OWNER_USER_ID", optional: true },
  { key: "COOP_GOAL_GAMES", optional: true },
  { key: "DASHBOARD_PUSH", optional: true },
  { key: "GITHUB_TOKEN", secret: true, optional: true },
];

const DATA_FILES = [
  "economy.json",
  "gambling-progress.json",
  "coop-goal.json",
  "quests-board.json",
  "duels.json",
  "jackpot.json",
  "xp.json",
  "tickets-open.json",
  "warns.json",
  "giveaways.json",
];

function envLine(entry) {
  const { key, secret, optional } = entry;
  const val = process.env[key]?.trim();
  if (!val) {
    return optional
      ? `⚪ \`${key}\` — optionnel`
      : `❌ \`${key}\` — manquant`;
  }
  if (secret) return `✅ \`${key}\` — defini`;
  return `✅ \`${key}\` — \`${val.slice(0, 18)}${val.length > 18 ? "…" : ""}\``;
}

async function checkChannel(guild, id, label) {
  if (!id) return `⚪ **${label}** — non configure`;
  const ch = await guild.channels.fetch(id).catch(() => null);
  if (!ch) return `❌ **${label}** — introuvable (\`${id}\`)`;
  return `✅ **${label}** — #${ch.name} (\`${id}\`)`;
}

async function checkSalonChannels(guild) {
  const rows = [];
  for (const { key, label } of ENV_SALONS) {
    rows.push(await checkChannel(guild, process.env[key]?.trim(), label || key));
  }
  return rows;
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

const profile = require("./serverProfile");

function versionFeaturesBlock() {
  const coopCap = coopGoal.GOAL_GAMES;
  if (profile.isRockAndRoll()) {
    return [
      `**v${BOT_VERSION}** — BotQuick / Rock n Roll`,
      "Sans shop · site · gazette · devlog",
      `Coop **${coopCap}**/j · duels · radio vocale (si playlist)`,
      "Roles CS2 · Clips · Valo via `/roles`",
    ].join("\n");
  }
  return [
    `**v${BOT_VERSION}** — banque actifs · duel objectif · money fixes`,
    "Top banque = **comptes actifs** · `/duel` objectif **1–100** + **coop** (mise min 20)",
    `Coop **${coopCap}**/j · MVP · paliers serie · jalon 80 %`,
    "Pastilles daily/work = cooldown · tableau money ameliore",
  ].join("\n");
}

async function buildStatusEmbed(client) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;

  const coreLines = ENV_CORE.map((e) => envLine(e));
  const salonEnvLines = ENV_SALONS.map((e) => envLine(e));
  const otherLines = ENV_OTHER.map((e) => envLine(e));

  const channelLines = guild
    ? await checkSalonChannels(guild)
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
    .setTitle(`Bot status — v${BOT_VERSION}`)
    .setDescription(
      [
        `**Uptime** : ${uptimeMin} min · **Ping** : ${client.ws.ping} ms`,
        `**Tickets ouverts** : ${openTickets}`,
        ticketNote,
        `**Slash commands** : ${client.commands?.size ?? "?"}`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .addFields(
      { name: "Version / features", value: versionFeaturesBlock().slice(0, 1024) },
      { name: "Core .env", value: coreLines.join("\n").slice(0, 1024) },
      {
        name: "Salons (.env + check Discord)",
        value: [
          "**Variables**",
          salonEnvLines.join("\n"),
          "",
          "**Acces salon**",
          channelLines.join("\n"),
        ]
          .join("\n")
          .slice(0, 1024),
      },
      { name: "Autres .env", value: otherLines.join("\n").slice(0, 1024) },
      { name: "Permissions bot", value: permLines.join("\n").slice(0, 1024) || "—" },
      { name: "Fichiers data/", value: dataFileStatus().join("\n").slice(0, 1024) }
    )
    .setFooter({ text: "Staff · /botstatus · maj manuelle BOT_VERSION dans lib/botStatus.js" })
    .setTimestamp();
}

module.exports = { buildStatusEmbed, BOT_VERSION };
