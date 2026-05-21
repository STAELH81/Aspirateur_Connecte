const { SlashCommandBuilder } = require("discord.js");
const quotes = require("../data/quotes.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("Phrase aleatoire"),
  async execute(interaction) {
    const line = quotes[Math.floor(Math.random() * quotes.length)];
    await interaction.reply(line);
  },
};
