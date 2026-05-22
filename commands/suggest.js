const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const suggestions = require("../lib/suggestions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Envoyer une suggestion au salon dedie")
    .addStringOption((opt) =>
      opt
        .setName("idee")
        .setDescription("Ta suggestion")
        .setRequired(true)
        .setMaxLength(1500)
    ),
  async execute(interaction) {
    const text = interaction.options.getString("idee");
    const result = await suggestions.postSuggestion(interaction, text);

    if (!result.ok) {
      await interaction.reply({
        content: result.reason,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `Suggestion publiee dans <#${suggestions.getChannelId()}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
