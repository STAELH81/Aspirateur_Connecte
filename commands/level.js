const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const xp = require("../lib/xp");
const { COLOR } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("XP et niveaux (style MEE6)")
    .addSubcommand((sub) =>
      sub
        .setName("voir")
        .setDescription("Ton niveau ou celui d'un membre")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Autre membre").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("top").setDescription("Classement XP du serveur")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "voir") {
      const user = interaction.options.getUser("membre") ?? interaction.user;
      const p = xp.getProfile(user.id);
      const barLen = 12;
      const filled = Math.round((p.xpInLevel / p.xpNeeded) * barLen);
      const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle(`${user.username} — niveau ${p.level}`)
            .setDescription(
              [
                `${bar} ${p.xpInLevel} / ${p.xpNeeded} XP`,
                `Total : **${p.totalXp}** XP`,
              ].join("\n")
            ),
        ],
      });
      return;
    }

    if (sub === "top") {
      const top = xp.getLeaderboard(10);
      if (top.length === 0) {
        await interaction.reply({ content: "Pas encore d'XP.", ephemeral: true });
        return;
      }
      const lines = top.map(
        (e, i) => `${i + 1}. <@${e.id}> — niv. **${e.level}** (${e.totalXp} XP)`
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Top XP")
            .setDescription(lines.join("\n")),
        ],
      });
    }
  },
};
