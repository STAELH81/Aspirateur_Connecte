const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../lib/economy");
const { replyIfWrongChannel } = require("../lib/gamblingChannel");
const { COLOR } = require("../lib/personality");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("money")
    .setDescription("Economie du serveur (coins)")
    .addSubcommand((sub) =>
      sub
        .setName("balance")
        .setDescription("Voir ton solde ou celui de quelqu'un")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Autre membre").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("daily").setDescription("Bonus quotidien (24h)")
    )
    .addSubcommand((sub) =>
      sub.setName("work").setDescription("Petit job (cooldown 45 min)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("pay")
        .setDescription("Envoyer des coins")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Destinataire").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("montant")
            .setDescription("Nombre de coins")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("top").setDescription("Classement des plus riches")
    ),
  async execute(interaction) {
    if (!(await replyIfWrongChannel(interaction))) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "balance") {
      const target = interaction.options.getUser("membre") ?? interaction.user;
      const bal = economy.getBalance(target.id);
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setDescription(`${target} : ${economy.formatCoins(bal)}`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "daily") {
      const result = economy.tryDaily(interaction.user.id);
      if (!result.ok) {
        await interaction.reply({
          content: `Daily deja pris. Reviens dans **${economy.formatCooldown(result.waitMs)}**.`,
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setDescription(
              `Daily : **+${result.gain}** coins\nSolde : ${economy.formatCoins(result.balance)}`
            ),
        ],
      });
      return;
    }

    if (sub === "work") {
      const result = economy.tryWork(interaction.user.id);
      if (!result.ok) {
        await interaction.reply({
          content: `Repos. Retente dans **${economy.formatCooldown(result.waitMs)}**.`,
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setDescription(
              `Travail : **+${result.gain}** coins\nSolde : ${economy.formatCoins(result.balance)}`
            ),
        ],
      });
      return;
    }

    if (sub === "pay") {
      const to = interaction.options.getUser("membre");
      const amount = interaction.options.getInteger("montant");
      if (to.bot) {
        await interaction.reply({ content: "Pas aux bots.", ephemeral: true });
        return;
      }
      const result = economy.pay(interaction.user.id, to.id, amount);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await interaction.reply(
        `Tu envoies **${result.amount}** coins a ${to}.\nTon solde : ${economy.formatCoins(result.fromBalance)}`
      );
      return;
    }

    if (sub === "top") {
      const top = economy.getLeaderboard(10);
      if (top.length === 0) {
        await interaction.reply({ content: "Personne n'a encore de coins.", ephemeral: true });
        return;
      }
      const lines = top.map(
        (e, i) => `${i + 1}. <@${e.id}> — **${e.balance}** coins`
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Top coins")
            .setDescription(lines.join("\n")),
        ],
      });
    }
  },
};
