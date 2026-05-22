const { EmbedBuilder } = require("discord.js");
const economy = require("../lib/economy");
const jackpot = require("../lib/jackpot");
const shop = require("../lib/shopPurchase");
const { loadConfig, shopFileExists } = require("../lib/shop");
const economyLog = require("../lib/economyLog");
const { isModerator } = require("../lib/permissions");
const { replyIfWrongChannel } = require("../lib/gamblingChannel");
const { buildMoneyCommandData } = require("../lib/moneyCommand");
const { COLOR } = require("../lib/personality");

module.exports = {
  get data() {
    return buildMoneyCommandData();
  },
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === "admin") {
      if (!isModerator(interaction.member)) {
        await interaction.reply({ content: "Reserve au staff.", ephemeral: true });
        return;
      }
      const target = interaction.options.getUser("membre");
      const amount = interaction.options.getInteger("montant");

      if (sub === "donner") {
        const result = economy.adminGrant(target.id, amount);
        await economyLog.log(interaction.client, {
          title: "Admin — coins donnes",
          description: `<@${interaction.user.id}> → <@${target.id}> : **+${result.amount}**`,
        });
        await interaction.reply({
          content: `**+${result.amount}** a ${target}. Solde : ${economy.formatCoins(result.balance)}`,
          ephemeral: true,
        });
        return;
      }

      if (sub === "retirer") {
        const result = economy.adminRemove(target.id, amount);
        if (!result.ok) {
          await interaction.reply({ content: result.reason, ephemeral: true });
          return;
        }
        await interaction.reply({
          content: `**-${result.amount}** a ${target}. Solde : ${economy.formatCoins(result.balance)}`,
          ephemeral: true,
        });
      }
      return;
    }

    if (!(await replyIfWrongChannel(interaction))) return;

    if (sub === "balance") {
      const target = interaction.options.getUser("membre") ?? interaction.user;
      const bal = economy.getBalance(target.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setDescription(`${target} : ${economy.formatCoins(bal)}`),
        ],
      });
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
              [
                `Daily : **+${result.gain}** coins`,
                `Streak : **${result.streak}** jour(s) (+${result.bonus} bonus)`,
                `Solde : ${economy.formatCoins(result.balance)}`,
              ].join("\n")
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

    if (sub === "jackpot") {
      await interaction.reply({
        content: `Cagnotte casino : **${jackpot.getPool()}** coins. Details : \`/casino jackpot\``,
      });
      return;
    }

    if (sub === "shop-list") {
      const items = loadConfig();
      if (items.length === 0) {
        const hint = shopFileExists()
          ? "Aucun article valide dans `data/shop.json` (verifie les **roleId** en chiffres Discord)."
          : "Cree `data/shop.json` depuis `data/shop.json.example`, puis `bot.cmd deploy`.";
        await interaction.reply({ content: hint, ephemeral: true });
        return;
      }
      const lines = items.map(
        (i) => `**${i.label}** — ${i.price} coins · ${i.durationDays || 1} jour(s)`
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("Boutique")
            .setDescription(
              lines.join("\n") +
                "\n\nAchat : `/money shop` → menu deroulant **article**."
            ),
        ],
      });
      return;
    }

    if (sub === "shop") {
      const itemId = interaction.options.getString("article");
      const result = await shop.buy(interaction, itemId);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, ephemeral: true });
        return;
      }
      await interaction.reply({
        content: [
          `Achat : **${result.item.label}** pour **${result.price}** coins`,
          `Role actif **${result.days}** jour(s).`,
          `Solde : ${economy.formatCoins(result.balance)}`,
        ].join("\n"),
      });
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
