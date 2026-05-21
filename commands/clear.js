const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { isModerator } = require("../lib/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprime des messages (admin / modo)")
    .addIntegerOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre de messages (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve aux admins / modo (permission Gerer les messages).",
        ephemeral: true,
      });
      return;
    }

    const amount = interaction.options.getInteger("nombre");
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply(`${deleted.size} message(s) supprime(s).`);
    } catch {
      await interaction.editReply(
        "Impossible de tout supprimer (messages > 14 jours ou droits manquants)."
      );
    }
  },
};
