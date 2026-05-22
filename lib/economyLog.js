const { EmbedBuilder } = require("discord.js");
const { COLOR, COLOR_SUCCESS } = require("./personality");

function getChannelId() {
  return process.env.ECONOMY_LOG_CHANNEL_ID?.trim() || null;
}

/**
 * Mention dans un embed = pseudo colore, pas de notification ping.
 */
function playerLine(userId) {
  return `<@${userId}>`;
}

function formatDelta(delta) {
  if (delta > 0) return `**+${delta}**`;
  if (delta < 0) return `**${delta}**`;
  return "**0**";
}

async function logTx(client, { userId, action, balanceBefore, balanceAfter, details }) {
  const channelId = getChannelId();
  if (!channelId || !client || userId == null) return;

  const before = Math.floor(balanceBefore);
  const after = Math.floor(balanceAfter);
  const delta = after - before;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const lines = [
    `Joueur : ${playerLine(userId)}`,
    `Action : **${action}**`,
  ];
  if (details) lines.push(details);
  lines.push(`Variation : ${formatDelta(delta)} coins`);
  lines.push(`Solde : **${before}** → **${after}**`);

  const embed = new EmbedBuilder()
    .setColor(delta > 0 ? COLOR_SUCCESS : delta < 0 ? 0xed4245 : COLOR)
    .setTitle(delta > 0 ? "Economie — gain" : delta < 0 ? "Economie — depense" : "Economie")
    .setDescription(lines.join("\n"))
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logCasino(client, userId, game, result) {
  const after = result.balanceAfter ?? result.balance ?? 0;
  const before =
    result.balanceBefore ??
    after - (result.net ?? 0);

  const parts = [];
  if (result.bet != null) parts.push(`Mise : **${result.bet}** coins`);
  if (result.net !== undefined) {
    parts.push(`Net partie : ${formatDelta(result.net)} coins`);
  }
  if (result.jackpotWin > 0) parts.push(`Jackpot : **+${result.jackpotWin}**`);

  await logTx(client, {
    userId,
    action: `Casino · ${game}`,
    balanceBefore: before,
    balanceAfter: after,
    details: parts.length ? parts.join("\n") : null,
  });
}

async function logPay(client, fromId, toId, amount, fromBefore, fromAfter, toBefore, toAfter) {
  await logTx(client, {
    userId: fromId,
    action: "Transfert — envoi",
    balanceBefore: fromBefore,
    balanceAfter: fromAfter,
    details: `Vers ${playerLine(toId)} · montant **${amount}** coins`,
  });
  await logTx(client, {
    userId: toId,
    action: "Transfert — reception",
    balanceBefore: toBefore,
    balanceAfter: toAfter,
    details: `De ${playerLine(fromId)} · montant **+${amount}** coins`,
  });
}

module.exports = { logTx, logCasino, logPay, getChannelId };
