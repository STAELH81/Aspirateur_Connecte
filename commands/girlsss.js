const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("girlsss")
    .setDescription("Message pour la commu Les Girlsss")
    .addStringOption((opt) =>
      opt.setName("texte").setDescription("Ton message").setRequired(false)
    ),
  async execute(interaction) {
    const texte = interaction.options.getString("texte") ?? "Les Girlsss";
    await interaction.reply(texte);
  },
};
