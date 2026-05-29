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
    const result = await syncDashboard({
      pushGitHub,
      client: interaction.client,
    });

    const lines = [
      "Snapshot genere.",
      `Top coins : **${result.snapshot.leaderboard.length}** entrees`,
      `Casino aujourd'hui : **${result.snapshot.todayCasino.totalGames}** parties`,
    ];

    if (pushGitHub) {
      lines.push(
        result.github?.ok
          ? `Branche **${result.github.branch}** mise a jour (${result.github.files?.join(", ")}). Netlify redeploie si branche \`site\` configuree.`
          : `GitHub : ${result.github?.reason || "erreur"}`
      );
    } else {
      lines.push(
        "Tip : branche **site** + `GITHUB_SITE_BRANCH=site` — voir docs/NETLIFY.md"
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
