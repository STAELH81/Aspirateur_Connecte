const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const pollVotes = require("../lib/pollVotes");
const { COLOR } = require("../lib/personality");

const LABELS = ["1", "2", "3", "4", "5"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Sondage avec boutons (v2)")
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
    )
    .addStringOption((opt) =>
      opt.setName("choix5").setDescription("Choix 5").setRequired(false)
    ),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    const choices = ["choix1", "choix2", "choix3", "choix4", "choix5"]
      .map((k) => interaction.options.getString(k))
      .filter(Boolean);

    const lines = choices.map((c, i) => `**${LABELS[i]}** — ${c} · 0 vote`);

    const embed = new EmbedBuilder()
      .setTitle("Sondage")
      .setDescription(`**${question}**\n\n${lines.join("\n")}`)
      .setFooter({ text: `Par ${interaction.user.tag} · clique pour voter` })
      .setColor(COLOR);

    const row = new ActionRowBuilder();
    for (let i = 0; i < choices.length; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll:${i}:placeholder`)
          .setLabel(LABELS[i])
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await interaction.reply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();

    const finalRow = new ActionRowBuilder();
    for (let i = 0; i < choices.length; i++) {
      finalRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll:${i}:${msg.id}`)
          .setLabel(LABELS[i])
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await msg.edit({ components: [finalRow] });
  },
};
