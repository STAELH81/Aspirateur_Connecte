const { SlashCommandBuilder } = require("discord.js");
const { helpEmbed } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Ce que sait faire l'Aspirateur"),
  async execute(interaction) {
    await interaction.reply({ embeds: [helpEmbed()], ephemeral: true });
  },
};
