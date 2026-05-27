const economy = require("../lib/economy");
const economyLog = require("../lib/economyLog");
const shopPurchase = require("../lib/shopPurchase");
const { isModerator } = require("../lib/permissions");
const { buildMoneyCommandData } = require("../lib/moneyCommand");
const {
  moneyPanelEmbed,
  moneyPanelRows,
  registerMoneyPanelMessage,
  shopPanelEmbed,
  shopPanelRows,
  casinoPanelEmbed,
  casinoPanelRows,
  infosPanelEmbed,
} = require("../lib/economyPanels");

module.exports = {
  get data() {
    return buildMoneyCommandData();
  },
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group !== "admin") {
      await interaction.reply({
        content: "Utilise les panneaux dans les salons **money**, **shop** et **casino**.",
        ephemeral: true,
      });
      return;
    }

    if (!isModerator(interaction.member)) {
      await interaction.reply({ content: "Reserve au staff.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("membre");
    const amount = interaction.options.getInteger("montant");

    if (sub === "panel") {
      const panel = await interaction.channel.send({
        embeds: [moneyPanelEmbed()],
        components: moneyPanelRows(),
      });
      registerMoneyPanelMessage(panel);
      await interaction.reply({ content: "Panneau money poste.", ephemeral: true });
      return;
    }

    if (sub === "shop-panel") {
      await interaction.channel.send({
        embeds: [shopPanelEmbed()],
        components: shopPanelRows(),
      });
      await interaction.reply({ content: "Panneau shop poste.", ephemeral: true });
      return;
    }

    if (sub === "infos-panel") {
      await interaction.channel.send({
        embeds: [infosPanelEmbed()],
      });
      await interaction.reply({ content: "Panneau infos poste.", ephemeral: true });
      return;
    }

    if (sub === "casino-panel") {
      await interaction.channel.send({
        embeds: [casinoPanelEmbed()],
        components: casinoPanelRows(),
      });
      await interaction.reply({ content: "Panneau casino fixe poste.", ephemeral: true });
      return;
    }

    if (sub === "shop-stock-reset") {
      const stock = shopPurchase.resetPersistentStock();
      const lines = Object.entries(stock).map(([id, n]) => `- ${id} : ${n}`);
      await interaction.reply({
        content: `Stock shop reset.\n${lines.length ? lines.join("\n") : "Aucun item avec stock."}`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "donner") {
      const result = economy.adminGrant(target.id, amount);
      await economyLog.logTx(interaction.client, {
        userId: target.id,
        action: "Admin — coins donnes",
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        details: `Par <@${interaction.user.id}> · **+${result.amount}**`,
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
      await economyLog.logTx(interaction.client, {
        userId: target.id,
        action: "Admin — coins retires",
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        details: `Par <@${interaction.user.id}> · **-${result.amount}**`,
      });
      await interaction.reply({
        content: `**-${result.amount}** a ${target}. Solde : ${economy.formatCoins(result.balance)}`,
        ephemeral: true,
      });
    }
  },
};
