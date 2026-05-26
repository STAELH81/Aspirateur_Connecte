/** Dernier message public par utilisateur / salon / action (daily, work, balance). */
const lastMessages = new Map();
const MONEY_MSG_TTL_MS = 2 * 60 * 1000;

function key(channelId, userId, action) {
  return `${channelId}:${userId}:${action}`;
}

async function deleteMessage(client, channelId, messageId) {
  if (!messageId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;
    const msg = await channel.messages.fetch(messageId);
    await msg.delete();
  } catch {
    // deja supprime
  }
}

async function deletePrevious(client, channelId, userId, action) {
  const messageId = lastMessages.get(key(channelId, userId, action));
  if (!messageId) return;
  await deleteMessage(client, channelId, messageId);
}

function remember(channelId, userId, action, messageId) {
  lastMessages.set(key(channelId, userId, action), messageId);
}

function scheduleMoneyMessageDeletion(client, channelId, messageId) {
  setTimeout(() => {
    deleteMessage(client, channelId, messageId).catch(() => {});
  }, MONEY_MSG_TTL_MS);
}

/**
 * Supprime l'ancien message de cette action, envoie le nouveau, memorise son id.
 * Auto-suppression apres 2 minutes.
 */
async function replaceUserActionMessage(client, channelId, userId, action, send) {
  await deletePrevious(client, channelId, userId, action);
  const message = await send();
  if (message?.id) {
    remember(channelId, userId, action, message.id);
    scheduleMoneyMessageDeletion(client, channelId, message.id);
  }
  return message;
}

module.exports = {
  deletePrevious,
  remember,
  replaceUserActionMessage,
  scheduleMoneyMessageDeletion,
};
