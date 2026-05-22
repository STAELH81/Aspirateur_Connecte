const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const casino = require("../lib/casino");
const blackjack = require("../lib/blackjack");
const economy = require("../lib/economy");
const jackpot = require("../lib/jackpot");
const economyLog = require("../lib/economyLog");
const { replyIfWrongChannel } = require("../lib/gamblingChannel");
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
          opt.setName("mise").setDescription("Coins").setRequired(true).setMinValue(10)
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
          opt.setName("mise").setDescription("Coins").setRequired(true).setMinValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("dice")
        .setDescription("Devine le de (1-6)")
        .addIntegerOption((opt) =>
          opt.setName("mise").setDescription("Coins").setRequired(true).setMinValue(10)
        )
        .addIntegerOption((opt) =>
          opt.setName("nombre").setDescription("1 a 6").setRequired(true).setMinValue(1).setMaxValue(6)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("roulette")
        .setDescription("Roulette 0-9")
        .addIntegerOption((opt) =>
          opt.setName("mise").setDescription("Coins").setRequired(true).setMinValue(10)
        )
        .addStringOption((opt) =>
          opt
            .setName("choix")
            .setDescription("Rouge, noir, vert ou numero")
            .setRequired(true)
            .addChoices(
              { name: "Rouge", value: "rouge" },
              { name: "Noir", value: "noir" },
              { name: "Vert (0)", value: "vert" },
              { name: "Numero", value: "numero" }
            )
        )
        .addIntegerOption((opt) =>
          opt.setName("numero").setDescription("0-9 si choix numero").setMinValue(0).setMaxValue(9)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("blackjack")
        .setDescription("Blackjack — boutons Hit / Stand")
        .addIntegerOption((opt) =>
          opt.setName("mise").setDescription("Coins").setRequired(true).setMinValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("jackpot").setDescription("Cagnotte commune du casino")
    ),
  async execute(interaction) {
    if (!(await replyIfWrongChannel(interaction))) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "jackpot") {
      const pool = jackpot.getPool();
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Jackpot casino")
            .setDescription(
              `Cagnotte : **${pool}** coins\n` +
                `${Math.round(economy.cfg.jackpot.taxRate * 100)}% de chaque mise alimente le pot.\n` +
                `Chance de tout gagner : ~1/${Math.round(1 / economy.cfg.jackpot.winChance)} par partie.`
            ),
        ],
      });
      return;
    }

    const mise = interaction.options.getInteger("mise");

    if (sub === "coinflip") {
      const result = casino.playCoinflip(
        interaction.user.id,
        mise,
        interaction.options.getString("cote")
      );
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await economyLog.logCasino(interaction.client, interaction.user.id, "coinflip", result);
      const embed = new EmbedBuilder()
        .setColor(result.won ? COLOR_SUCCESS : COLOR)
        .setTitle(result.won ? "Gagne" : "Perdu")
        .setDescription(
          [
            `Mise **${result.bet}** sur **${result.choice}** → **${result.result}**`,
            result.won
              ? `Gain **+${result.win}** (x${economy.cfg.coinflip.multiplier})`
              : `Perte **-${result.bet}**`,
            result.jackpotWin ? `**JACKPOT +${result.jackpotWin}**` : null,
            `Solde : ${economy.formatCoins(result.balance)}`,
          ]
            .filter(Boolean)
            .join("\n")
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
      await economyLog.logCasino(interaction.client, interaction.user.id, "slots", result);
      const netLabel = result.net >= 0 ? `+${result.net}` : `${result.net}`;
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(result.net > 0 ? COLOR_SUCCESS : COLOR)
            .setTitle("Slots")
            .setDescription(
              [
                `# ${result.display}`,
                `${result.label} — mise **${result.bet}**`,
                `Net : **${netLabel}**`,
                result.jackpotWin ? `**JACKPOT +${result.jackpotWin}**` : null,
                `Solde : ${economy.formatCoins(result.balance)}`,
              ]
                .filter(Boolean)
                .join("\n")
            ),
        ],
      });
      return;
    }

    if (sub === "dice") {
      const result = casino.playDice(
        interaction.user.id,
        mise,
        interaction.options.getInteger("nombre")
      );
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await economyLog.logCasino(interaction.client, interaction.user.id, "dice", result);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(result.won ? COLOR_SUCCESS : COLOR)
            .setTitle(result.won ? "Gagne" : "Perdu")
            .setDescription(
              [
                `Tu vises **${result.guess}** — de : **${result.roll}**`,
                result.won
                  ? `Gain **+${result.win}** (x${economy.cfg.dice.multiplier})`
                  : `Perte **-${result.bet}**`,
                result.jackpotWin ? `**JACKPOT +${result.jackpotWin}**` : null,
                `Solde : ${economy.formatCoins(result.balance)}`,
              ]
                .filter(Boolean)
                .join("\n")
            ),
        ],
      });
      return;
    }

    if (sub === "roulette") {
      const choix = interaction.options.getString("choix");
      const numero = interaction.options.getInteger("numero");
      const result = casino.playRoulette(interaction.user.id, mise, choix, numero);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await economyLog.logCasino(interaction.client, interaction.user.id, "roulette", result);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(result.won ? COLOR_SUCCESS : COLOR)
            .setTitle("Roulette")
            .setDescription(
              [
                `Tirage : **${result.roll}** (${result.color})`,
                result.won ? `${result.label} — gain **+${result.win}**` : `Perdu **-${result.bet}**`,
                result.jackpotWin ? `**JACKPOT +${result.jackpotWin}**` : null,
                `Solde : ${economy.formatCoins(result.balance)}`,
              ]
                .filter(Boolean)
                .join("\n")
            ),
        ],
      });
      return;
    }

    if (sub === "blackjack") {
      const result = blackjack.startGame(interaction.user.id, mise);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }

      if (result.instant) {
        await economyLog.logCasino(interaction.client, interaction.user.id, "blackjack", result);
        await interaction.reply({
          embeds: [
            blackjack
              .buildEmbed(
                {
                  bet: result.bet,
                  player: result.playerHand,
                  dealer: result.dealerHand,
                },
                { reveal: true, footer: "Blackjack !" }
              )
              .setColor(COLOR_SUCCESS),
          ],
        });
        return;
      }

      const game = blackjack.getGame(result.gameId, interaction.user.id);
      await interaction.reply({
        embeds: [blackjack.buildEmbed(game)],
        components: [blackjack.buildButtons(result.gameId)],
      });
    }
  },
};
