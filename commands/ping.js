const { SlashCommandBuilder } = require("discord.js");
const { pingReply } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("L'Aspirateur repond (il est en vie ?)"),
  async execute(interaction) {
    await interaction.reply(pingReply());
  },
};
