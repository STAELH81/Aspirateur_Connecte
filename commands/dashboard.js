const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { isModerator } = require("../lib/permissions");
const { syncDashboard } = require("../lib/dashboardSnapshot");
const { COLOR } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Site web stats (staff)")
    .addSubcommand((sub) =>
      sub
        .setName("sync")
        .setDescription("Met a jour stats.json (Netlify via GitHub si configure)")
    ),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve au staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const pushGitHub = Boolean(process.env.GITHUB_TOKEN?.trim());
    const result = await syncDashboard({ pushGitHub });

    const lines = [
      "Snapshot genere.",
      `Top coins : **${result.snapshot.leaderboard.length}** entrees`,
      `Casino aujourd'hui : **${result.snapshot.todayCasino.totalGames}** parties`,
    ];

    if (pushGitHub) {
      lines.push(
        result.github?.ok
          ? "GitHub mis a jour — Netlify va redeployer si lie au repo."
          : `GitHub : ${result.github?.reason || "erreur"}`
      );
    } else {
      lines.push(
        "Tip : ajoute `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO` dans .env pour pousser vers Netlify auto."
      );
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Dashboard sync")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Site : dashboard/public sur Netlify" });

    await interaction.editReply({ embeds: [embed] });
  },
};
