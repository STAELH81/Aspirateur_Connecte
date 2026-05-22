const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const quotes = require("../lib/quotes");
const { isModerator } = require("../lib/permissions");
const { COLOR } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Citations du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Proposer une citation (validation modo)")
        .addStringOption((opt) =>
          opt.setName("texte").setDescription("La citation").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("pending").setDescription("Citations en attente (modo)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("approve")
        .setDescription("Approuver une citation (modo)")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("ID affiche dans /quote pending").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reject")
        .setDescription("Refuser une citation (modo)")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("ID").setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const texte = interaction.options.getString("texte");
      const result = quotes.addPending(interaction.user.id, texte);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await interaction.reply({
        content: `Citation envoyee pour validation (ID : \`${result.entry.id}\`).`,
        ephemeral: true,
      });
      return;
    }

    if (!isModerator(interaction.member)) {
      await interaction.reply({ content: "Reserve au staff.", ephemeral: true });
      return;
    }

    if (sub === "pending") {
      const list = quotes.listPending();
      if (list.length === 0) {
        await interaction.reply({ content: "Aucune citation en attente.", ephemeral: true });
        return;
      }
      const lines = list.map(
        (e) => `\`${e.id}\` — <@${e.userId}> : ${e.quote.slice(0, 80)}`
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Citations en attente")
            .setDescription(lines.join("\n")),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "approve") {
      const result = quotes.approve(interaction.options.getString("id"));
      await interaction.reply({
        content: result.ok ? `Ajoutee : *${result.quote}*` : result.reason,
        ephemeral: true,
      });
      return;
    }

    if (sub === "reject") {
      const result = quotes.reject(interaction.options.getString("id"));
      await interaction.reply({
        content: result.ok ? "Refusee." : result.reason,
        ephemeral: true,
      });
    }
  },
};
