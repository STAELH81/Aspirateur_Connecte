const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isModerator } = require("../lib/permissions");
const { postGazetteForDay, todayKey } = require("../lib/gamblingGazette");

function parseDateOption(raw) {
  if (!raw) return todayKey();
  const m = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const day = String(m[1]).padStart(2, "0");
  const month = String(m[2]).padStart(2, "0");
  const year = m[3];
  return `${year}-${month}-${day}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gazette")
    .setDescription("La Gazette Du Gamblinnnnngggg (staff)")
    .addSubcommand((sub) =>
      sub
        .setName("test")
        .setDescription("Publie la gazette du jour dans #gambling (sans bloquer 23h59)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("Apercu ephemere d'une date")
        .addStringOption((opt) =>
          opt
            .setName("date")
            .setDescription("JJ/MM/AAAA — ex: 29/05/2025 (vide = aujourd'hui)")
            .setRequired(false)
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

    if (sub === "test") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await postGazetteForDay(interaction.client, todayKey(), {
        force: true,
        test: true,
        skipState: true,
      });
      if (!result.ok) {
        await interaction.editReply({ content: result.reason });
        return;
      }
      await interaction.editReply({
        content: `Gazette test publiee dans <#${result.channelId}> (${result.recap.totalGames} parties).`,
      });
      return;
    }

    if (sub === "preview") {
      const raw = interaction.options.getString("date");
      const dayKey = parseDateOption(raw);
      if (raw && !dayKey) {
        await interaction.reply({
          content: "Date invalide. Format : **29/05/2025**",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const guildId = process.env.DISCORD_GUILD_ID?.trim();
      const guild = guildId
        ? await interaction.client.guilds.fetch(guildId).catch(() => null)
        : interaction.guild;

      const recap = require("../lib/gamblingProgress").getDailyRecap(dayKey);
      const { buildGazetteEmbed } = require("../lib/gamblingGazette");
      const embed = await buildGazetteEmbed(guild, recap);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
