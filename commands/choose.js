const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Choix au hasard entre plusieurs options")
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
      .setTitle("Le hasard a parle")
      .setDescription(`**${pick}**`)
      .setColor(0xeb459e)
      .setFooter({
        text: `${options.length} options • demande par ${interaction.user.username}`,
      });

    await interaction.reply({ embeds: [embed] });
  },
};
