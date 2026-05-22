const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const warns = require("../lib/warns");
const economyLog = require("../lib/economyLog");
const { isModerator } = require("../lib/permissions");
const { COLOR } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertissements (staff)")
    .addSubcommand((sub) =>
      sub
        .setName("ajouter")
        .setDescription("Avertir un membre")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Membre").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("raison").setDescription("Raison").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("liste")
        .setDescription("Voir les avertissements")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Membre").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("retirer")
        .setDescription("Retirer le dernier avertissement")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Membre").setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve au staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser("membre");

    if (sub === "ajouter") {
      const reason = interaction.options.getString("raison");
      const result = warns.add(target.id, interaction.user.id, reason);

      await economyLog.logEvent(interaction.client, {
        title: "Moderation — avertissement",
        lines: [
          `Membre : <@${target.id}>`,
          `Par : <@${interaction.user.id}>`,
          `Raison : ${result.entry.reason}`,
          `Total warns : **${result.total}**`,
        ],
        color: 0xfaa61a,
      });

      await interaction.reply({
        content: `Avertissement enregistre pour ${target} (${result.total} au total).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "liste") {
      const list = warns.list(target.id);
      if (list.length === 0) {
        await interaction.reply({
          content: `${target} n'a aucun avertissement.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const lines = list.map(
        (w, i) =>
          `**${i + 1}.** ${w.reason}\n   — <@${w.modId}>, ${new Date(w.at).toLocaleDateString("fr-FR")}`
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle(`Warns — ${target.username}`)
            .setDescription(lines.join("\n\n").slice(0, 4000)),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "retirer") {
      const removed = warns.removeLast(target.id);
      if (!removed) {
        await interaction.reply({
          content: "Aucun avertissement a retirer.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await economyLog.logEvent(interaction.client, {
        title: "Moderation — warn retire",
        lines: [
          `Membre : <@${target.id}>`,
          `Par : <@${interaction.user.id}>`,
          `Retire : ${removed.reason}`,
        ],
      });
      await interaction.reply({
        content: `Dernier warn retire pour ${target}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
