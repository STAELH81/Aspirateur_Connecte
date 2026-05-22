const { SlashCommandBuilder } = require("discord.js");
const afk = require("../lib/afk");

const AFK_HELP =
  "Quand tu es AFK :\n" +
  "• Si quelqu'un te **@mention**, le bot dit que tu es absent + ta raison.\n" +
  "• Des que **tu envoies un message**, l'AFK se coupe tout seul.\n" +
  "• `/afk off` pour enlever manuellement.";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Afficher un statut absent")
    .addSubcommand((sub) =>
      sub
        .setName("on")
        .setDescription("Activer AFK")
        .addStringOption((opt) =>
          opt.setName("raison").setDescription("Ex: je mange, en cours…").setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName("off").setDescription("Desactiver AFK"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Voir si tu es AFK")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "status") {
      const data = afk.getAfk(interaction.user.id);
      if (!data) {
        await interaction.reply({ content: "Tu n'es pas en AFK.", ephemeral: true });
        return;
      }
      await interaction.reply({
        content: `AFK actif : **${data.reason}**`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "off") {
      const cleared = afk.clearAfk(interaction.user.id);
      await interaction.reply({
        content: cleared ? "AFK desactive — tu es de retour." : "Tu n'etais pas AFK.",
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.options.getString("raison");
    afk.setAfk(interaction.user.id, reason);
    await interaction.reply({
      content: [
        `AFK active${reason ? ` : **${reason}**` : ""}.`,
        "",
        AFK_HELP,
      ].join("\n"),
      ephemeral: true,
    });
  },
};
