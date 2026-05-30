const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isModerator } = require("../lib/permissions");
const {
  buildBoardPayload,
  registerBoardMessage,
  refreshBoards,
} = require("../lib/questsBoard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quests")
    .setDescription("Tableau quetes & coop du jour")
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Poster le tableau (staff) — salon quetes")
    )
    .addSubcommand((sub) =>
      sub.setName("refresh").setDescription("Forcer maj du tableau (staff)")
    ),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve au staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "refresh") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await refreshBoards(interaction.client);
      await interaction.editReply({ content: "Tableau quetes/coop mis a jour." });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const payload = await buildBoardPayload(interaction.guild);
    const msg = await interaction.channel.send(payload);
    registerBoardMessage(msg);
    await interaction.editReply({
      content: "Tableau **Quêtes & Coop** poste — maj auto toutes les minutes.",
    });
  },
};
