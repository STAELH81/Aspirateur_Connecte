const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { isModerator } = require("../lib/permissions");
const {
  parseDuration,
  buildEmbed,
  buildRow,
  create,
  endGiveaway,
  getActiveInGuild,
  load,
} = require("../lib/giveaways");

const EPHEMERAL = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaways (remplace GiveawayBot)")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Lancer un giveaway")
        .addStringOption((opt) =>
          opt
            .setName("lot")
            .setDescription("Texte ou @mention du role a gagner")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("duree")
            .setDescription("Ex: 30s, 10m, 1h, 2d")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("gagnants")
            .setDescription("Nombre de gagnants (1-10)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role a attribuer auto au gagnant")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Terminer un giveaway avant la fin")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("ID du message giveaway")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Retirer au sort un nouveau gagnant")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("ID du message giveaway termine")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("liste").setDescription("Giveaways en cours sur le serveur")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "liste") {
      const active = getActiveInGuild(interaction.guildId);
      if (active.length === 0) {
        await interaction.reply({
          content: "Aucun giveaway en cours.",
          flags: EPHEMERAL,
        });
        return;
      }
      const lines = active.map(
        ([id, g]) =>
          `• **${g.prize}** — <#${g.channelId}> — fin <t:${Math.floor(g.endsAt / 1000)}:R> — \`${id}\``
      );
      await interaction.reply({
        content: `**Giveaways actifs**\n${lines.join("\n")}`,
        flags: EPHEMERAL,
      });
      return;
    }

    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve aux admins / modo (Gerer le serveur ou les messages).",
        flags: EPHEMERAL,
      });
      return;
    }

    if (sub === "start") {
      const prizeRole = interaction.options.getRole("role");
      let prize = interaction.options.getString("lot");
      if (prizeRole) {
        prize = `<@&${prizeRole.id}>`;
      }
      const duree = interaction.options.getString("duree");
      const winnerCount = interaction.options.getInteger("gagnants") ?? 1;
      const durationMs = parseDuration(duree);

      if (!durationMs) {
        await interaction.reply({
          content:
            "Duree invalide. Minimum **10s**. Exemples : `30s`, `10m`, `1h`, `2d`",
          flags: EPHEMERAL,
        });
        return;
      }

      await interaction.deferReply();

      const endsAt = Date.now() + durationMs;
      const preview = {
        prize,
        winnerCount,
        hostId: interaction.user.id,
        endsAt,
        entrants: [],
        ended: false,
      };

      try {
        const msg = await interaction.editReply({
          embeds: [buildEmbed(preview)],
          components: buildRow("temp", false),
          fetchReply: true,
        });

        create({
          messageId: msg.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          prize,
          winnerCount,
          hostId: interaction.user.id,
          durationMs,
        });

        const g = load()[msg.id];
        if (!g) throw new Error("giveaway_not_saved");

        await msg.edit({
          embeds: [buildEmbed(g)],
          components: buildRow(msg.id, false),
        });

        setTimeout(() => endGiveaway(interaction.client, msg.id), durationMs);
      } catch (err) {
        console.error("giveaway start:", err);
        await interaction.editReply({
          content: "Erreur au lancement du giveaway. Verifie que le bot tourne et relance-le.",
          embeds: [],
          components: [],
        });
      }
      return;
    }

    const messageId = interaction.options.getString("message_id");

    if (sub === "end") {
      const result = await endGiveaway(interaction.client, messageId);
      if (!result.ok) {
        await interaction.reply({
          content:
            result.reason === "not_found"
              ? "Giveaway introuvable."
              : "Deja termine.",
          flags: EPHEMERAL,
        });
        return;
      }
      await interaction.reply({ content: "Giveaway termine.", flags: EPHEMERAL });
      return;
    }

    if (sub === "reroll") {
      const result = await endGiveaway(interaction.client, messageId, {
        reroll: true,
      });
      if (!result.ok) {
        await interaction.reply({
          content: "Giveaway introuvable ou pas encore termine.",
          flags: EPHEMERAL,
        });
        return;
      }
      await interaction.reply({
        content: "Nouveau tirage effectue.",
        flags: EPHEMERAL,
      });
    }
  },
};
