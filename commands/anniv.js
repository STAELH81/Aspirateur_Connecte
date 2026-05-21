const { SlashCommandBuilder } = require("discord.js");
const { setBirthday, getUpcoming } = require("../lib/birthdays");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anniv")
    .setDescription("Anniversaires de la commu")
    .addSubcommand((sub) =>
      sub
        .setName("ajouter")
        .setDescription("Enregistre ton anniversaire")
        .addIntegerOption((opt) =>
          opt.setName("jour").setDescription("Jour (1-31)").setRequired(true).setMinValue(1).setMaxValue(31)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("mois")
            .setDescription("Mois (1-12)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("liste").setDescription("Anniversaires dans les 30 prochains jours")
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "ajouter") {
      const jour = interaction.options.getInteger("jour");
      const mois = interaction.options.getInteger("mois");
      setBirthday(interaction.user.id, jour, mois);
      await interaction.reply({
        content: `Anniversaire enregistre : **${jour}/${mois}**`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "liste") {
      const upcoming = getUpcoming(30);
      if (upcoming.length === 0) {
        await interaction.reply({
          content: "Aucun anniversaire enregistre (ou dans les 30 prochains jours).",
          ephemeral: true,
        });
        return;
      }

      const lines = upcoming.map(
        (e) =>
          `<@${e.userId}> — ${e.day}/${e.month} (dans ${e.daysUntil} jour${e.daysUntil > 1 ? "s" : ""})`
      );
      await interaction.reply({
        content: `**Anniversaires a venir**\n${lines.join("\n")}`,
      });
    }
  },
};
