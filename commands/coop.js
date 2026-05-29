const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coopGoal = require("../lib/coopGoal");
const { COLOR, COLOR_SUCCESS } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coop")
    .setDescription("Objectif casino communautaire")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Progression de l'objectif du jour")
    )
    .addSubcommand((sub) =>
      sub.setName("claim").setDescription("Reclamer le bonus si l'objectif est atteint")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const status = coopGoal.getStatus(interaction.user.id);

    if (sub === "status") {
      const bar =
        status.goalMet
          ? "Objectif atteint !"
          : `Encore **${status.left}** partie(s) casino sur le serveur aujourd'hui.`;

      const embed = new EmbedBuilder()
        .setColor(status.goalMet ? COLOR_SUCCESS : COLOR)
        .setTitle("Objectif commu — casino")
        .setDescription(
          [
            `Si le serveur cumule **${status.goal}** parties casino dans la journee,`,
            `chaque joueur ayant participe gagne **${status.reward}** coins (1x/jour).`,
            "",
            `Progression serveur : **${status.progress}/${status.goal}**`,
            bar,
            "",
            status.played ? "Tu as joue aujourd'hui." : "Tu n'as pas encore joue au casino aujourd'hui.",
            status.claimed
              ? "Bonus deja reclame."
              : status.canClaim
                ? "Tu peux faire `/coop claim`."
                : status.goalMet
                  ? "Joue au casino puis `/coop claim`."
                  : "Attends que l'objectif serveur soit atteint.",
          ].join("\n")
        )
        .setFooter({ text: "Mini-jeu coop v1 · plus de modes plus tard" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "claim") {
      const result = coopGoal.claimReward(interaction.user.id);
      if (!result.ok) {
        await interaction.reply({ content: result.reason });
        return;
      }
      await interaction.reply({
        content: `Objectif commu valide ! **+${result.reward}** coins — solde : **${result.balance}** coins.`,
      });
    }
  },
};
