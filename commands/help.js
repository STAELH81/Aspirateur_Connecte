const { SlashCommandBuilder } = require("discord.js");
const { helpEmbed } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Liste des commandes"),
  async execute(interaction) {
    await interaction.reply({ embeds: [helpEmbed()], ephemeral: true });
  },
};
