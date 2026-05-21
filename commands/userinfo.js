const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

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

    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        {
          name: "Compte cree",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      );

    if (member) {
      embed.addFields(
        {
          name: "A rejoint le serveur",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Roles",
          value:
            member.roles.cache
              .filter((r) => r.id !== interaction.guild.id)
              .map((r) => r.toString())
              .join(", ") || "Aucun",
          inline: false,
        }
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
