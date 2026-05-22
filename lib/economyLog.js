const { EmbedBuilder } = require("discord.js");
const { COLOR, COLOR_SUCCESS } = require("./personality");

function getChannelId() {
  return process.env.ECONOMY_LOG_CHANNEL_ID?.trim() || null;
}

async function log(client, { title, description, userId, net, color }) {
  const channelId = getChannelId();
  if (!channelId || !client) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(color ?? (net > 0 ? COLOR_SUCCESS : COLOR))
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  if (userId) embed.setFooter({ text: `Joueur: ${userId}` });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logCasino(client, userId, game, result) {
  const threshold = 50;
  const absNet = Math.abs(result.net ?? 0);
  if (absNet < threshold && !(result.jackpotWin > 0)) return;

  const user = `<@${userId}>`;
  const lines = [
    `Joueur : ${user}`,
    `Jeu : **${game}**`,
    `Mise : **${result.bet}** coins`,
  ];
  if (result.jackpotWin > 0) {
    lines.push(`**JACKPOT : +${result.jackpotWin} coins**`);
  }
  if (result.net !== undefined) {
    lines.push(result.net >= 0 ? `Net : **+${result.net}**` : `Net : **${result.net}**`);
  }
  lines.push(`Solde : **${result.balance}** coins`);

  await log(client, {
    title: result.net > 0 || result.jackpotWin ? "Casino — gain" : "Casino — perte",
    description: lines.join("\n"),
    userId,
    net: result.net,
  });
}

module.exports = { log, logCasino, getChannelId };
