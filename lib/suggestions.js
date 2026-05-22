const { EmbedBuilder } = require("discord.js");
const { COLOR } = require("./personality");

function getChannelId() {
  return process.env.SUGGESTIONS_CHANNEL_ID?.trim() || null;
}

function isSuggestionsChannel(channelId) {
  const id = getChannelId();
  return id && channelId === id;
}

async function onSuggestionMessage(message) {
  if (!isSuggestionsChannel(message.channelId)) return;
  if (message.author.bot) return;
  if (message.system) return;

  await message.react("✅").catch(() => {});
  await message.react("💡").catch(() => {});
}

async function postSuggestion(interaction, text) {
  const channelId = getChannelId();
  if (!channelId) {
    return { ok: false, reason: "SUGGESTIONS_CHANNEL_ID manquant dans .env." };
  }

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return { ok: false, reason: "Salon suggestions introuvable." };
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setDescription(text.slice(0, 4000))
    .setFooter({ text: "Suggestion" })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.react("✅").catch(() => {});
  await msg.react("💡").catch(() => {});

  return { ok: true, message: msg };
}

module.exports = { onSuggestionMessage, postSuggestion, getChannelId, isSuggestionsChannel };
