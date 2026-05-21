const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const casino = require("../lib/casino");
const economy = require("../lib/economy");
const { COLOR, COLOR_SUCCESS } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Jeux de hasard (coins)")
    .addSubcommand((sub) =>
      sub
        .setName("coinflip")
        .setDescription("Pile ou face")
        .addIntegerOption((opt) =>
          opt
            .setName("mise")
            .setDescription("Coins a miser")
            .setRequired(true)
            .setMinValue(10)
        )
        .addStringOption((opt) =>
          opt
            .setName("cote")
            .setDescription("Pile ou face")
            .setRequired(true)
            .addChoices(
              { name: "Pile", value: "pile" },
              { name: "Face", value: "face" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("slots")
        .setDescription("Machine a sous")
        .addIntegerOption((opt) =>
          opt
            .setName("mise")
            .setDescription("Coins a miser")
            .setRequired(true)
            .setMinValue(10)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const mise = interaction.options.getInteger("mise");

    if (sub === "coinflip") {
      const cote = interaction.options.getString("cote");
      const result = casino.playCoinflip(interaction.user.id, mise, cote);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(result.won ? COLOR_SUCCESS : COLOR)
        .setTitle(result.won ? "Gagne" : "Perdu")
        .setDescription(
          [
            `Tu mises **${result.bet}** sur **${result.choice}**`,
            `Resultat : **${result.result}**`,
            result.won
              ? `Gain : **+${result.win}** coins (x${economy.cfg.coinflip.multiplier})`
              : `Perte : **-${result.bet}** coins`,
            "",
            `Solde : ${economy.formatCoins(result.balance)}`,
          ].join("\n")
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "slots") {
      const result = casino.playSlots(interaction.user.id, mise);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }

      const netLabel =
        result.net >= 0 ? `**+${result.net}**` : `**${result.net}**`;

      const embed = new EmbedBuilder()
        .setColor(result.net > 0 ? COLOR_SUCCESS : COLOR)
        .setTitle("Slots")
        .setDescription(
          [
            `# ${result.display}`,
            `${result.label} — mise **${result.bet}**`,
            `Gain : **${result.win}** coins (${netLabel})`,
            "",
            `Solde : ${economy.formatCoins(result.balance)}`,
          ].join("\n")
        );

      await interaction.reply({ embeds: [embed] });
    }
  },
};
