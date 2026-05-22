const { SlashCommandBuilder } = require("discord.js");
const { helpEmbeds } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Liste complete des commandes du bot"),
  async execute(interaction) {
    await interaction.reply({ embeds: helpEmbeds() });
  },
};
