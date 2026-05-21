const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const EMOJIS = ["1\u20e3", "2\u20e3", "3\u20e3", "4\u20e3"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Cree un sondage avec reactions")
    .addStringOption((opt) =>
      opt.setName("question").setDescription("La question").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("choix1").setDescription("Choix 1").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("choix2").setDescription("Choix 2").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("choix3").setDescription("Choix 3").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("choix4").setDescription("Choix 4").setRequired(false)
    ),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    const choices = ["choix1", "choix2", "choix3", "choix4"]
      .map((k) => interaction.options.getString(k))
      .filter(Boolean);

    const lines = choices.map((c, i) => `${EMOJIS[i]} ${c}`);

    const embed = new EmbedBuilder()
      .setTitle("Sondage")
      .setDescription(`**${question}**\n\n${lines.join("\n")}`)
      .setFooter({ text: `Par ${interaction.user.tag}` })
      .setColor(0xeb459e);

    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();

    for (let i = 0; i < choices.length; i++) {
      await msg.react(EMOJIS[i]);
    }
  },
};
