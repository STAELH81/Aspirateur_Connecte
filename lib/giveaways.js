const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

const FILE = path.join(__dirname, "..", "data", "giveaways.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function parseDuration(input) {
  const match = String(input).trim().match(/^(\d+)\s*(s|m|h|d|j)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    j: 86_400_000,
  };
  if (n < 1) return null;
  const ms = n * multipliers[unit];
  if (ms < 10_000) return null;
  return ms;
}

function sanitizePrize(prize) {
  const text = String(prize).trim().slice(0, 200);
  return text || "Lot mystere";
}

/** Extrait l'ID d'un role si le lot est une mention <@&123> */
function parseRoleIdFromPrize(prize) {
  const match = String(prize).match(/<@&(\d+)>/);
  return match ? match[1] : null;
}

async function awardPrizeRoles(client, giveaway) {
  const roleId = giveaway.prizeRoleId || parseRoleIdFromPrize(giveaway.prize);
  if (!roleId || !giveaway.winners?.length) {
    return { awarded: [], failed: [] };
  }

  const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
  if (!guild) return { awarded: [], failed: giveaway.winners, error: "guild" };

  const role = guild.roles.cache.get(roleId);
  if (!role) return { awarded: [], failed: giveaway.winners, error: "role" };

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { awarded: [], failed: giveaway.winners, error: "permission" };
  }
  if (role.position >= me.roles.highest.position) {
    return { awarded: [], failed: giveaway.winners, error: "hierarchy" };
  }

  const awarded = [];
  const failed = [];

  for (const userId of giveaway.winners) {
    try {
      const member = await guild.members.fetch(userId);
      if (member.roles.cache.has(roleId)) {
        awarded.push(userId);
        continue;
      }
      await member.roles.add(role);
      awarded.push(userId);
    } catch {
      failed.push(userId);
    }
  }

  return { awarded, failed, roleName: role.name };
}

function buildEmbed(giveaway) {
  const ended = giveaway.ended;
  const prize = sanitizePrize(giveaway.prize);
  const embed = new EmbedBuilder()
    .setTitle(ended ? "Giveaway termine" : "Giveaway")
    .setColor(ended ? 0x57f287 : 0xfee75c)
    .addFields(
      { name: "Lot", value: prize, inline: true },
      { name: "Gagnants", value: `${giveaway.winnerCount}`, inline: true },
      {
        name: "Participants",
        value: `${giveaway.entrants.length}`,
        inline: true,
      },
      {
        name: "Organise par",
        value: `<@${giveaway.hostId}>`,
        inline: true,
      }
    );

  if (!ended) {
    embed.addFields({
      name: "Fin",
      value: `<t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
      inline: true,
    });
    if (giveaway.messageId) {
      embed.setFooter({ text: `ID: ${giveaway.messageId}` });
    }
  } else if (giveaway.winners?.length) {
    embed.addFields({
      name: "Resultat",
      value: giveaway.winners.map((id) => `<@${id}>`).join(", "),
      inline: false,
    });
  } else {
    embed.setDescription("Aucun participant — pas de gagnant.");
  }

  return embed;
}

function buildRow(messageId, ended) {
  if (ended) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway:enter:${messageId}`)
        .setLabel("Participer")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎉")
    ),
  ];
}

function pickWinners(entrants, count) {
  const pool = [...new Set(entrants)];
  if (pool.length === 0) return [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function updateMessage(client, messageId) {
  const data = load();
  const giveaway = data[messageId];
  if (!giveaway) return null;

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return null;

  await message.edit({
    embeds: [buildEmbed(giveaway)],
    components: buildRow(messageId, giveaway.ended),
  });
  return { message, channel, giveaway };
}

async function endGiveaway(client, messageId, { reroll = false } = {}) {
  const data = load();
  const giveaway = data[messageId];
  if (!giveaway) return { ok: false, reason: "not_found" };
  if (giveaway.ended && !reroll) return { ok: false, reason: "already_ended" };
  if (reroll && !giveaway.ended) return { ok: false, reason: "not_ended" };

  if (!reroll) giveaway.ended = true;
  giveaway.winners = pickWinners(giveaway.entrants, giveaway.winnerCount);
  save(data);

  const updated = await updateMessage(client, messageId);
  if (!updated) return { ok: false, reason: "message_missing" };

  const { message, giveaway: g } = updated;
  const roleResult = await awardPrizeRoles(client, g);

  let content = null;
  if (g.winners.length > 0) {
    const winnersText = g.winners.map((id) => `<@${id}>`).join(", ");
    content = reroll
      ? `Nouveau tirage pour **${sanitizePrize(g.prize)}** : ${winnersText}`
      : `Felicitation ${winnersText} ! Tu gagnes **${sanitizePrize(g.prize)}**`;

    if (g.prizeRoleId || parseRoleIdFromPrize(g.prize)) {
      if (roleResult.error === "hierarchy") {
        content += `\n⚠️ Role **${roleResult.roleName || "VIP"}** non donne : mets le role du bot **au-dessus** de ce role dans les parametres du serveur.`;
      } else if (roleResult.error === "permission") {
        content += "\n⚠️ Role non donne : le bot n'a pas la permission **Gerer les roles**.";
      } else if (roleResult.error === "role") {
        content += "\n⚠️ Role introuvable sur le serveur.";
      } else if (roleResult.awarded.length > 0) {
        content += `\n✅ Role **${roleResult.roleName}** attribue.`;
      } else if (roleResult.failed.length > 0) {
        content += "\n⚠️ Impossible d'attribuer le role (verifie les permissions).";
      }
    }
  } else if (!reroll) {
    content = `Giveaway **${sanitizePrize(g.prize)}** termine sans participant.`;
  }

  if (content) await message.reply(content);
  return { ok: true, giveaway: g, roleResult };
}

function create({ messageId, guildId, channelId, prize, winnerCount, hostId, durationMs }) {
  const prizeRoleId = parseRoleIdFromPrize(prize);
  const data = load();
  data[messageId] = {
    messageId,
    guildId,
    channelId,
    prize,
    prizeRoleId: prizeRoleId || null,
    winnerCount,
    hostId,
    endsAt: Date.now() + durationMs,
    entrants: [],
    ended: false,
    winners: [],
  };
  save(data);
  return data[messageId];
}

function addEntrant(messageId, userId) {
  const data = load();
  const giveaway = data[messageId];
  if (!giveaway || giveaway.ended) return { ok: false, reason: "ended" };
  if (giveaway.entrants.includes(userId)) return { ok: false, reason: "already" };
  giveaway.entrants.push(userId);
  save(data);
  return { ok: true, giveaway };
}

function getActiveInGuild(guildId) {
  return Object.entries(load()).filter(
    ([, g]) => g.guildId === guildId && !g.ended
  );
}

function scheduleAll(client) {
  const data = load();
  for (const [messageId, g] of Object.entries(data)) {
    if (g.ended) continue;
    const delay = g.endsAt - Date.now();
    if (delay <= 0) {
      endGiveaway(client, messageId);
    } else {
      setTimeout(() => endGiveaway(client, messageId), delay);
    }
  }
}

module.exports = {
  parseDuration,
  buildEmbed,
  buildRow,
  create,
  addEntrant,
  endGiveaway,
  updateMessage,
  getActiveInGuild,
  scheduleAll,
  load,
};
