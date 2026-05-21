const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("girlsss")
    .setDescription("Message officiel Girlsss (3 s)")
    .addStringOption((opt) =>
      opt.setName("texte").setDescription("Ton message").setRequired(false)
    ),
  async execute(interaction) {
    const texte =
      interaction.options.getString("texte") ??
      "Les Girlsss — 3 s, toujours.";
    await interaction.reply(texte);
  },
};
