/** Vrai seulement si le message contient @BotQuick (pas @everyone / @here seuls). */
function isDirectBotMention(message, client) {
  const botId = client.user?.id;
  if (!botId) return false;
  return message.content.includes(`<@${botId}>`) || message.content.includes(`<@!${botId}>`);
}

module.exports = { isDirectBotMention };
