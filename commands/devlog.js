const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isModerator } = require("../lib/permissions");
const devlog = require("../lib/devlog");

function fileChoices() {
  return devlog.listDevlogFiles().slice(0, 25).map((slug) => ({
    name: slug.length > 100 ? slug.slice(0, 97) + "…" : slug,
    value: slug,
  }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("devlog")
    .setDescription("Publier une annonce devlog en embeds (staff)")
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Liste les annonces docs/annonce-*.md")
    )
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("Apercu ephemere des embeds")
        .addStringOption((opt) =>
          opt
            .setName("fichier")
            .setDescription("Ex: v1.2.9 ou banque-temp")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("Publie dans le salon updates (embeds)")
        .addStringOption((opt) =>
          opt
            .setName("fichier")
            .setDescription("Ex: v1.2.9 ou banque-temp")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("ping")
            .setDescription("Role a ping sur le dernier message (optionnel)")
            .setRequired(false)
        )
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "fichier") return;
    const q = String(focused.value || "").toLowerCase();
    const choices = fileChoices().filter(
      (c) => !q || c.value.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
    await interaction.respond(choices.slice(0, 25));
  },
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve au staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const files = devlog.listDevlogFiles();
      if (!files.length) {
        await interaction.reply({
          content: "Aucun fichier `docs/annonce-*-discord.md`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const channelId = devlog.getUpdatesChannelId();
      const channelHint = channelId ? `<#${channelId}>` : "*(UPDATES_CHANNEL_ID non defini)*";
      await interaction.reply({
        content: [
          "**Annonces disponibles** (`/devlog preview` · `/devlog post`) :",
          files.map((f) => `• \`${f}\``).join("\n"),
          "",
          `Salon cible : ${channelHint}`,
        ].join("\n"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const slug = interaction.options.getString("fichier", true);
    const loaded = devlog.loadDevlogEmbeds(slug);
    if (!loaded.ok) {
      await interaction.reply({ content: loaded.reason, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "preview") {
      const embeds = loaded.embeds.slice(0, 10);
      await interaction.reply({
        content: `Preview **${loaded.slug}** — **${loaded.messageCount}** message(s) Discord.`,
        embeds,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === "post") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const pingRole = interaction.options.getRole("ping");
      const result = await devlog.postDevlog(interaction.client, slug, {
        pingRoleId: pingRole?.id || null,
      });
      if (!result.ok) {
        await interaction.editReply({ content: result.reason });
        return;
      }
      await interaction.editReply({
        content: [
          `Devlog **${result.slug}** publie dans <#${result.channelId}>.`,
          `**${result.messageCount}** message(s) · IDs : ${result.messageIds.map((id) => `\`${id}\``).join(", ")}`,
          pingRole ? `Ping : ${pingRole}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  },
};
