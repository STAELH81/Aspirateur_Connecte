const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const tickets = require("../lib/tickets");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Systeme de tickets support")
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Poster le bouton d'ouverture de ticket (admin)")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "panel") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "Reserve aux administrateurs.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        content: "Panel ticket publie.",
        flags: MessageFlags.Ephemeral,
      });
      await interaction.channel.send(tickets.buildPanelPayload());
    }
  },
};
