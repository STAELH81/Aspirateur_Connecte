const { SlashCommandBuilder } = require("discord.js");
const quotes = require("../lib/quotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("Phrase aleatoire"),
  async execute(interaction) {
    await interaction.reply(quotes.randomQuote());
  },
};
