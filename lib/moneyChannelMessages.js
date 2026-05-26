/** Dernier message public par utilisateur / salon / action (daily, work, balance). */
const lastMessages = new Map();

function key(channelId, userId, action) {
  return `${channelId}:${userId}:${action}`;
}

async function deletePrevious(client, channelId, userId, action) {
  const messageId = lastMessages.get(key(channelId, userId, action));
  if (!messageId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;
    const msg = await channel.messages.fetch(messageId);
    await msg.delete();
  } catch {
    // message deja supprime ou introuvable
  }
}

function remember(channelId, userId, action, messageId) {
  lastMessages.set(key(channelId, userId, action), messageId);
}

/**
 * Supprime l'ancien message de cette action, envoie le nouveau, memorise son id.
 * @param {Function} send - async () => Message (ex. channel.send ou interaction reply fetchReply)
 */
async function replaceUserActionMessage(client, channelId, userId, action, send) {
  await deletePrevious(client, channelId, userId, action);
  const message = await send();
  if (message?.id) remember(channelId, userId, action, message.id);
  return message;
}

module.exports = {
  deletePrevious,
  remember,
  replaceUserActionMessage,
};
