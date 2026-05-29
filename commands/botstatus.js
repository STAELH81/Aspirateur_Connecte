const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isModerator } = require("../lib/permissions");
const { buildStatusEmbed } = require("../lib/botStatus");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botstatus")
    .setDescription("Etat du bot, .env et salons (staff)"),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve au staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = await buildStatusEmbed(interaction.client);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
