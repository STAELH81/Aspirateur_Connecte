const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const xp = require("../lib/xp");
const { COLOR } = require("../lib/personality");

const MEDALS = ["🥇", "🥈", "🥉"];

async function displayName(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  return member?.displayName || member?.user?.username || "Inconnu";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("XP et niveaux")
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
      const top = xp.getLeaderboard(15);
      if (top.length === 0) {
        await interaction.reply({
          content: "Pas encore d'XP.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = [];
      for (let i = 0; i < top.length; i++) {
        const e = top[i];
        const prefix = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
        const name = await displayName(interaction.guild, e.id);
        lines.push(`${prefix} **${name}** — niv. **${e.level}** · ${e.totalXp} XP`);
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Classement XP — Les Girlsss")
            .setDescription(lines.join("\n")),
        ],
      });
    }
  },
};
