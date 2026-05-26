const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const economy = require("./economy");
const jackpot = require("./jackpot");
const casino = require("./casino");
const blackjack = require("./blackjack");
const economyLog = require("./economyLog");
const shopPurchase = require("./shopPurchase");
const { COLOR, COLOR_SUCCESS } = require("./personality");

const trackedMoneyPanels = new Map();
let moneyPanelsRefreshTimer = null;

function toUnix(msFromNow) {
  return Math.floor((Date.now() + msFromNow) / 1000);
}

function leaderboardLines(limit = Infinity) {
  return economy
    .getLeaderboard(limit)
    .map((e, i) => `${i + 1}. <@${e.id}> — **${e.balance}** coins`);
}

function buildTopEmbeds({ title = "Top coins", linesPerPage = 20 } = {}) {
  const lines = leaderboardLines(Infinity);
  if (lines.length === 0) {
    return [
      new EmbedBuilder().setColor(COLOR).setTitle(title).setDescription("Personne n'a encore de coins."),
    ];
  }

  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const chunk = lines.slice(i, i + linesPerPage);
    const startRank = i + 1;
    const endRank = i + chunk.length;
    const total = lines.length;
    pages.push(
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`${title} (${startRank}-${endRank}/${total})`)
        .setDescription(chunk.join("\n"))
    );
  }
  return pages;
}

function moneyPanelEmbed() {
  const top = leaderboardLines(25);
  const topText =
    top.length === 0
      ? "Personne n'a encore de coins."
      : top.join("\n");

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Money Center")
    .setDescription(
      [
        "Boutons rapides pour `daily`, `work`, `balance` et `top`.",
        "Le top se met a jour automatiquement (refresh periodique).",
      ].join("\n")
    )
    .addFields(
      { name: "Jackpot casino", value: `**${jackpot.getPool()}** coins`, inline: true },
      { name: "Mis a jour", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Top coins (25 premiers)", value: topText }
    );
}

function moneyPanelRows() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("money:panel:daily")
      .setLabel("Daily")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("money:panel:work")
      .setLabel("Work")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("money:panel:balance")
      .setLabel("Balance")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("money:panel:top")
      .setLabel("Top")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("money:panel:refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Danger)
  );
  return [row];
}

function casinoPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Casino Center")
    .setDescription(
      [
        "Choisis un jeu dans le menu pour ouvrir un formulaire automatique.",
        "Tu remplis juste les options necessaires (mise, cote, numero...).",
      ].join("\n")
    )
    .addFields({
      name: "Jackpot",
      value: `Cagnotte actuelle : **${jackpot.getPool()}** coins`,
    });
}

function casinoPanelRows() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("casino:panel:select")
    .setPlaceholder("Choisir un jeu...")
    .addOptions(
      { label: "Coinflip", value: "coinflip", description: "Pile ou face" },
      { label: "Slots", value: "slots", description: "Machine a sous" },
      { label: "Dice", value: "dice", description: "Devine le de (1-6)" },
      { label: "Roulette", value: "roulette", description: "Roulette 0-9" },
      { label: "Blackjack", value: "blackjack", description: "Hit / Stand" }
    );

  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino:quick:coinflip:pile")
        .setLabel("Coinflip Pile")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("casino:quick:coinflip:face")
        .setLabel("Coinflip Face")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino:panel:jackpot")
        .setLabel("Voir jackpot")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

async function refreshMoneyPanelMessage(interaction) {
  if (!interaction.message?.editable) return;
  registerMoneyPanelMessage(interaction.message);
  await interaction.message.edit({
    embeds: [moneyPanelEmbed()],
    components: moneyPanelRows(),
  });
}

function parseBet(raw) {
  const n = parseInt(String(raw || "").trim(), 10);
  return Number.isFinite(n) ? n : NaN;
}

function parseRouletteChoice(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (["rouge", "noir", "vert", "numero"].includes(v)) return v;
  return null;
}

async function handleMoneyPanelButton(interaction) {
  const action = interaction.customId.split(":")[2];
  if (action === "refresh") {
    await interaction.update({
      embeds: [moneyPanelEmbed()],
      components: moneyPanelRows(),
    });
    return;
  }
  if (action === "top") {
    await interaction.reply({
      embeds: buildTopEmbeds(),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const userId = interaction.user.id;

  if (action === "balance") {
    const bal = economy.getBalance(userId);
    await refreshMoneyPanelMessage(interaction);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR)
          .setDescription(`${interaction.user} : ${economy.formatCoins(bal)}`),
      ],
    });
    return;
  }

  if (action === "daily") {
    const result = economy.tryDaily(userId);
    if (!result.ok) {
      const ts = toUnix(result.waitMs);
      await interaction.editReply({
        content: `Daily deja pris. Reviens <t:${ts}:R> (a <t:${ts}:T>).`,
      });
      return;
    }
    await economyLog.logTx(interaction.client, {
      userId,
      action: "Daily",
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      details: [
        `Gain : **+${result.gain}** coins`,
        `Streak : **${result.streak}** (+${result.bonus} bonus)`,
        result.boostUsed ? `Boost x${result.boostMult}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    await refreshMoneyPanelMessage(interaction);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(
            [
              `Daily : **+${result.gain}** coins${result.boostUsed ? ` (boost x${result.boostMult})` : ""}`,
              `Streak : **${result.streak}** jour(s) (+${result.bonus} bonus)`,
              `Solde : ${economy.formatCoins(result.balance)}`,
            ].join("\n")
          ),
      ],
    });
    return;
  }

  if (action === "work") {
    const result = economy.tryWork(userId);
    if (!result.ok) {
      const ts = toUnix(result.waitMs);
      await interaction.editReply({
        content: `Repos. Retente <t:${ts}:R> (a <t:${ts}:T>).`,
      });
      return;
    }
    await economyLog.logTx(interaction.client, {
      userId,
      action: "Work",
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      details: [
        `Gain : **+${result.gain}** coins`,
        result.workBoostUsed ? `Boost x${result.workMult}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    await refreshMoneyPanelMessage(interaction);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(
            `Travail : **+${result.gain}** coins${result.workBoostUsed ? ` (boost x${result.workMult})` : ""}\nSolde : ${economy.formatCoins(result.balance)}`
          ),
      ],
    });
  }
}

function buildCasinoModal(game, presetChoice = null) {
  const modal = new ModalBuilder()
    .setCustomId(`casino:play:${game}${presetChoice ? `:${presetChoice}` : ""}`)
    .setTitle(`Casino — ${game}`);

  const betInput = new TextInputBuilder()
    .setCustomId("mise")
    .setLabel("Mise (minimum 10)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("100");
  modal.addComponents(new ActionRowBuilder().addComponents(betInput));

  if (game === "coinflip" && !presetChoice) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("cote")
          .setLabel("Cote (pile ou face)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("pile")
      )
    );
  } else if (game === "dice") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nombre")
          .setLabel("Nombre (1 a 6)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("4")
      )
    );
  } else if (game === "roulette") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("choix")
          .setLabel("Choix (rouge/noir/vert/numero)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("rouge")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("numero")
          .setLabel("Numero (0-9, si choix=numero)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("7")
      )
    );
  }

  return modal;
}

async function handleCasinoPanelSelect(interaction) {
  const game = interaction.values?.[0];
  if (!game) {
    await interaction.reply({ content: "Jeu invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(buildCasinoModal(game));
}

async function handleCasinoQuickButton(interaction) {
  const [, , game, choice] = interaction.customId.split(":");
  if (game !== "coinflip" || !["pile", "face"].includes(choice)) {
    await interaction.reply({ content: "Action invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(buildCasinoModal("coinflip", choice));
}

async function handleCasinoPanelButton(interaction) {
  await interaction.reply({
    embeds: [casinoPanelEmbed()],
  });
}

async function handleCasinoModalSubmit(interaction) {
  const [, , game, presetChoice] = interaction.customId.split(":");
  const mise = parseBet(interaction.fields.getTextInputValue("mise"));
  if (!Number.isFinite(mise)) {
    await interaction.reply({ content: "Mise invalide.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (game === "coinflip") {
    const coteRaw =
      presetChoice ||
      String(interaction.fields.getTextInputValue("cote") || "")
        .trim()
        .toLowerCase();
    const cote = coteRaw === "pile" || coteRaw === "face" ? coteRaw : null;
    if (!cote) {
      await interaction.reply({ content: "Cote invalide: pile ou face.", flags: MessageFlags.Ephemeral });
      return;
    }
    const result = casino.playCoinflip(interaction.user.id, mise, cote);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
      return;
    }
    await economyLog.logCasino(interaction.client, interaction.user.id, "coinflip", result);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(result.won ? COLOR_SUCCESS : COLOR)
          .setTitle(result.won ? "Gagne" : "Perdu")
          .setDescription(
            [
              `Mise **${result.bet}** sur **${result.choice}** -> **${result.result}**`,
              result.won ? `Gain **+${result.win}**` : `Perte **-${result.bet}**`,
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

  if (game === "slots") {
    const result = casino.playSlots(interaction.user.id, mise);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
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

  if (game === "dice") {
    const guess = parseBet(interaction.fields.getTextInputValue("nombre"));
    const result = casino.playDice(interaction.user.id, mise, guess);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
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
              result.won ? `Gain **+${result.win}**` : `Perte **-${result.bet}**`,
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

  if (game === "roulette") {
    const choice = parseRouletteChoice(interaction.fields.getTextInputValue("choix"));
    if (!choice) {
      await interaction.reply({
        content: "Choix invalide: rouge, noir, vert ou numero.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const numeroRaw = interaction.fields.getTextInputValue("numero");
    const numero = numeroRaw ? parseBet(numeroRaw) : null;
    const result = casino.playRoulette(interaction.user.id, mise, choice, numero);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
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

  if (game === "blackjack") {
    const result = blackjack.startGame(interaction.user.id, mise);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
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

    const gameData = blackjack.getGame(result.gameId, interaction.user.id);
    await interaction.reply({
      embeds: [blackjack.buildEmbed(gameData)],
      components: [blackjack.buildButtons(result.gameId)],
    });
  }
}

function registerMoneyPanelMessage(message) {
  if (!message?.id || !message.channelId || !message.guildId) return;
  trackedMoneyPanels.set(message.id, {
    guildId: message.guildId,
    channelId: message.channelId,
    messageId: message.id,
  });
}

function startMoneyPanelsAutoRefresh(client, refreshMs = 10_000) {
  if (moneyPanelsRefreshTimer) return;

  moneyPanelsRefreshTimer = setInterval(async () => {
    for (const tracked of trackedMoneyPanels.values()) {
      const guild = client.guilds.cache.get(tracked.guildId);
      if (!guild) {
        trackedMoneyPanels.delete(tracked.messageId);
        continue;
      }
      const channel = guild.channels.cache.get(tracked.channelId);
      if (!channel || !channel.isTextBased()) {
        trackedMoneyPanels.delete(tracked.messageId);
        continue;
      }
      try {
        const msg = await channel.messages.fetch(tracked.messageId);
        if (!msg?.editable) {
          trackedMoneyPanels.delete(tracked.messageId);
          continue;
        }
        await msg.edit({
          embeds: [moneyPanelEmbed()],
          components: moneyPanelRows(),
        });
      } catch {
        trackedMoneyPanels.delete(tracked.messageId);
      }
    }
  }, refreshMs);
}

function shopPanelEmbed() {
  const items = shopPurchase.listItems();
  const lines =
    items.length === 0
      ? ["Aucun article valide dans `data/shop.json`."]
      : items.map((item, i) => `**${i + 1}. ${item.label}** — ${item.price} coins`);

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Shop Center")
    .setDescription("Clique sur un bouton pour acheter un article.")
    .addFields({
      name: "Articles",
      value: lines.join("\n"),
    });
}

function shopPanelRows() {
  const items = shopPurchase.listItems().slice(0, 25);
  const rows = [];
  for (let i = 0; i < items.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const item of items.slice(i, i + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`shop:buy:${item.id}`)
          .setLabel(item.label.slice(0, 40))
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows;
}

function infosPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Guide Gambling")
    .setDescription(
      [
        "Bienvenue dans le module gambling du bot.",
        "",
        "**Money**",
        "- `/money daily` : bonus chaque 24h",
        "- `/money work` : gain rapide avec cooldown",
        "- `/money balance` : ton solde",
        "- `/money top` : classement complet",
        "",
        "**Casino**",
        "- `/casino coinflip|slots|dice|roulette|blackjack`",
        "- Le jackpot est partage et peut tomber sur les parties",
        "",
        "**Shop**",
        "- Utilise le panneau shop pour acheter vite",
        "- Certains objets appliquent des boosts sur le prochain `daily/work`",
      ].join("\n")
    );
}

async function handleShopBuyButton(interaction) {
  const itemId = interaction.customId.split(":")[2];
  const items = shopPurchase.listItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    await interaction.reply({ content: "Article introuvable.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: `Confirmer l'achat de **${item.label}** pour **${item.price}** coins ?`,
    flags: MessageFlags.Ephemeral,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop:confirm:${item.id}:${interaction.user.id}`)
          .setLabel("Confirmer")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`shop:cancel:${item.id}:${interaction.user.id}`)
          .setLabel("Annuler")
          .setStyle(ButtonStyle.Danger)
      ),
    ],
  });
}

async function handleShopConfirmButton(interaction) {
  const [, action, itemId, userId] = interaction.customId.split(":");
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Cette confirmation n'est pas pour toi.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (action === "cancel") {
    await interaction.update({ content: "Achat annule.", components: [] });
    return;
  }

  const result = await shopPurchase.buy(interaction, itemId);
  if (!result.ok) {
    await interaction.update({ content: result.reason, components: [] });
    return;
  }

  await interaction.update({
    content: `Achat confirme: **${result.item.label}** pour **${result.price}** coins.`,
    components: [],
  });
  await interaction.followUp({
    content: `${interaction.user} a achete **${result.item.label}** pour **${result.price}** coins. Solde: ${economy.formatCoins(result.balance)}`,
  });
}

module.exports = {
  moneyPanelEmbed,
  moneyPanelRows,
  casinoPanelEmbed,
  casinoPanelRows,
  buildTopEmbeds,
  registerMoneyPanelMessage,
  startMoneyPanelsAutoRefresh,
  shopPanelEmbed,
  shopPanelRows,
  infosPanelEmbed,
  handleMoneyPanelButton,
  handleCasinoPanelSelect,
  handleCasinoQuickButton,
  handleCasinoPanelButton,
  handleCasinoModalSubmit,
  handleShopBuyButton,
  handleShopConfirmButton,
};
