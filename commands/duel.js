const { SlashCommandBuilder } = require("discord.js");
const { replyIfWrongChannel } = require("../lib/gamblingChannel");
const duel = require("../lib/duel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Defier un joueur au casino (coinflip, slots, de)")
    .addUserOption((opt) =>
      opt.setName("joueur").setDescription("Joueur a defier").setRequired(true)
    ),
  async execute(interaction) {
    if (!(await replyIfWrongChannel(interaction))) return;
    const opponent = interaction.options.getUser("joueur", true);
    await duel.startSetup(interaction, opponent);
  },
};
