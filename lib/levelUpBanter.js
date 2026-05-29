const { MessageReferenceType, MessageType } = require("discord.js");
const personality = require("./personality");

function buildLevelUpMessage(user, level) {
  return `GG ${user} — niveau **${level}** !`;
}

function isLevelUpAnnouncement(message) {
  return /^GG .+ — niveau \*\*\d+\*\* !$/.test(message.content || "");
}

function getOwnerUserId() {
  const raw = process.env.BOT_OWNER_USER_ID?.trim();
  if (!raw) return null;
  const match = raw.match(/\d{17,20}/);
  return match ? match[0] : null;
}

function isDiscordReply(message) {
  if (!message.reference?.messageId) return false;
  if (message.reference.type === MessageReferenceType.Forward) return false;
  return message.type === MessageType.Reply;
}

async function onLevelUpReply(message, client) {
  const ownerId = getOwnerUserId();
  if (!ownerId || message.author.id !== ownerId) return false;
  if (!isDiscordReply(message)) return false;

  const ref = await message.channel.messages
    .fetch(message.reference.messageId)
    .catch(() => null);
  if (!ref || ref.author.id !== client.user.id) return false;
  if (!isLevelUpAnnouncement(ref)) return false;

  await message.reply(personality.levelUpSubmissiveReply()).catch(() => {});
  return true;
}

module.exports = {
  buildLevelUpMessage,
  onLevelUpReply,
};