const { MessageFlags } = require("discord.js");

function getGamblingChannelId() {
  const id = process.env.GAMBLING_CHANNEL_ID?.trim();
  return id || null;
}

function checkGamblingChannel(interaction) {
  const channelId = getGamblingChannelId();
  if (!channelId) {
    return { ok: true };
  }
  if (interaction.channelId === channelId) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `L'economie et le casino sont uniquement dans <#${channelId}>.`,
  };
}

async function replyIfWrongChannel(interaction) {
  const check = checkGamblingChannel(interaction);
  if (check.ok) return true;
  await interaction.reply({
    content: check.message,
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

module.exports = { getGamblingChannelId, checkGamblingChannel, replyIfWrongChannel };
