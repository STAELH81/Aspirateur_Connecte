const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Affiche la photo de profil")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre (toi par defaut)").setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("membre") ?? interaction.user;
    const url = user.displayAvatarURL({ size: 512 });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar — ${user.tag}`)
      .setImage(url)
      .setURL(url);

    await interaction.reply({ embeds: [embed] });
  },
};
