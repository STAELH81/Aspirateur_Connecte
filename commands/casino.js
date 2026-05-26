const { SlashCommandBuilder } = require("discord.js");
const { replyIfWrongChannel } = require("../lib/gamblingChannel");
const { startCasinoFlow } = require("../lib/economyPanels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Jouer au casino (choix du jeu, mise, resultat)"),
  async execute(interaction) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await startCasinoFlow(interaction);
  },
};
