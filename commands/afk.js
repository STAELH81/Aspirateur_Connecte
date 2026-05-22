const { SlashCommandBuilder } = require("discord.js");
const afk = require("../lib/afk");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Mode AFK")
    .addSubcommand((sub) =>
      sub
        .setName("on")
        .setDescription("Activer AFK")
        .addStringOption((opt) =>
          opt.setName("raison").setDescription("Message").setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName("off").setDescription("Desactiver AFK")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "off") {
      const cleared = afk.clearAfk(interaction.user.id);
      await interaction.reply({
        content: cleared ? "AFK desactive." : "Tu n'etais pas AFK.",
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.options.getString("raison");
    afk.setAfk(interaction.user.id, reason);
    await interaction.reply({
      content: `AFK active${reason ? ` : **${reason}**` : ""}.`,
      ephemeral: true,
    });
  },
};
