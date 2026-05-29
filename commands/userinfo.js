const { SlashCommandBuilder } = require("discord.js");
const { buildUserProfileEmbed } = require("../lib/userProfile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Infos sur un membre")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre (toi par defaut)").setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("membre") ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const embed = buildUserProfileEmbed(user, member, interaction.member);
    await interaction.reply({ embeds: [embed] });
  },
};
