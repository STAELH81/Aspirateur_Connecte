const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { COLOR, chooseTitle } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Le hasard tranche pour toi")
    .addStringOption((opt) =>
      opt.setName("choix1").setDescription("Option 1").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("choix2").setDescription("Option 2").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("choix3").setDescription("Option 3").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("choix4").setDescription("Option 4").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("choix5").setDescription("Option 5").setRequired(false)
    ),
  async execute(interaction) {
    const options = ["choix1", "choix2", "choix3", "choix4", "choix5"]
      .map((k) => interaction.options.getString(k))
      .filter(Boolean);

    const pick = options[Math.floor(Math.random() * options.length)];

    const embed = new EmbedBuilder()
      .setTitle(chooseTitle())
      .setDescription(`**${pick}**`)
      .setColor(COLOR)
      .setFooter({
        text: `${options.length} options • ${interaction.user.username}`,
      });

    await interaction.reply({ embeds: [embed] });
  },
};
