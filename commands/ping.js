const { SlashCommandBuilder } = require("discord.js");
const { pingReply } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Verifie si le bot repond"),
  async execute(interaction) {
    await interaction.reply(pingReply());
  },
};
