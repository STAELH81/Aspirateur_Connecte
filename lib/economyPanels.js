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
const { replaceUserActionMessage } = require("./moneyChannelMessages");
const { COLOR, COLOR_SUCCESS } = require("./personality");

const trackedMoneyPanels = new Map();
let moneyPanelsRefreshTimer = null;
const casinoConfigState = new Map();
const lastCasinoPlay = new Map();

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
        .setCustomId("casino:panel:jackpot")
        .setLabel("Voir jackpot")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function getDefaultChoice(game) {
  if (game === "coinflip") return "pile";
  if (game === "roulette") return "rouge";
  return "none";
}

function setCasinoConfigState(userId, patch) {
  const prev = casinoConfigState.get(userId) || {};
  const next = { ...prev, ...patch };
  casinoConfigState.set(userId, next);
  return next;
}

function getCasinoConfigState(userId) {
  return casinoConfigState.get(userId) || null;
}

function casinoConfigEmbed(state, user) {
  const gameLabel = state?.game || "aucun";
  const choiceLabel =
    !state || state.choice === "none" ? "pas de choix requis" : state.choice;
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Configuration partie casino")
    .setDescription(
      [
        `Joueur : ${user}`,
        `Jeu : **${gameLabel}**`,
        `Choix : **${choiceLabel}**`,
        "Clique sur **Lancer** pour entrer seulement la mise (et les nombres si necessaire).",
      ].join("\n")
    );
}

function casinoConfigRows(state, userId) {
  const game = state?.game || "coinflip";
  const rows = [];

  if (game === "coinflip" || game === "roulette") {
    const choiceMenu = new StringSelectMenuBuilder()
      .setCustomId("casino:config:choice")
      .setPlaceholder(game === "coinflip" ? "Choisir pile/face" : "Choisir roulette")
      .addOptions(
        ...(game === "coinflip"
          ? [
              { label: "Pile", value: "pile" },
              { label: "Face", value: "face" },
            ]
          : [
              { label: "Rouge", value: "rouge" },
              { label: "Noir", value: "noir" },
              { label: "Vert (0)", value: "vert" },
              { label: "Numero", value: "numero" },
            ])
      );
    rows.push(new ActionRowBuilder().addComponents(choiceMenu));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino:config:play")
        .setLabel("Lancer")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("casino:redo")
        .setLabel("Refaire")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!lastCasinoPlay.has(userId))
    )
  );
  return rows;
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

async function postMoneyActionInChannel(interaction, action, messagePayload) {
  const { client, channelId, user } = interaction;
  await replaceUserActionMessage(client, channelId, user.id, action, () =>
    interaction.channel.send(messagePayload)
  );
  if (interaction.deferred || interaction.replied) {
    await interaction.deleteReply().catch(() => {});
  }
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
    await postMoneyActionInChannel(interaction, "balance", {
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
      await postMoneyActionInChannel(interaction, "daily", {
        content: `${interaction.user} — Daily deja pris. Reviens <t:${ts}:R> (a <t:${ts}:T>).`,
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
    await postMoneyActionInChannel(interaction, "daily", {
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(
            [
              `${interaction.user} — Daily : **+${result.gain}** coins${result.boostUsed ? ` (boost x${result.boostMult})` : ""}`,
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
      await postMoneyActionInChannel(interaction, "work", {
        content: `${interaction.user} — Repos. Retente <t:${ts}:R> (a <t:${ts}:T>).`,
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
    await postMoneyActionInChannel(interaction, "work", {
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(
            `${interaction.user} — Travail : **+${result.gain}** coins${result.workBoostUsed ? ` (boost x${result.workMult})` : ""}\nSolde : ${economy.formatCoins(result.balance)}`
          ),
      ],
    });
  }
}

function buildCasinoModal(game, presetChoice = "none", lastNumber = null) {
  const modal = new ModalBuilder()
    .setCustomId(`casino:play:${game}:${presetChoice || "none"}`)
    .setTitle(`Casino — ${game}`);

  const betInput = new TextInputBuilder()
    .setCustomId("mise")
    .setLabel("Mise (minimum 10)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("100");
  modal.addComponents(new ActionRowBuilder().addComponents(betInput));

  if (game === "dice") {
    const input = new TextInputBuilder()
      .setCustomId("nombre")
      .setLabel("Nombre (1 a 6)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("4");
    if (lastNumber !== null && Number.isFinite(lastNumber)) {
      input.setValue(String(lastNumber));
    }
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        input
      )
    );
  } else if (game === "roulette" && presetChoice === "numero") {
    const input = new TextInputBuilder()
      .setCustomId("numero")
      .setLabel("Numero (0-9)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("7");
    if (lastNumber !== null && Number.isFinite(lastNumber)) {
      input.setValue(String(lastNumber));
    }
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

async function handleCasinoPanelSelect(interaction) {
  const game = interaction.values?.[0];
  if (!game) {
    await interaction.reply({ content: "Jeu invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  const state = setCasinoConfigState(interaction.user.id, {
    game,
    choice: getDefaultChoice(game),
  });
  await interaction.reply({
    embeds: [casinoConfigEmbed(state, interaction.user)],
    components: casinoConfigRows(state, interaction.user.id),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCasinoConfigChoice(interaction) {
  const state = getCasinoConfigState(interaction.user.id);
  if (!state?.game) {
    await interaction.reply({
      content: "Choisis d'abord un jeu depuis le panneau casino.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const choice = interaction.values?.[0];
  if (!choice) {
    await interaction.reply({ content: "Choix invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  state.choice = choice;
  setCasinoConfigState(interaction.user.id, state);
  await interaction.update({
    embeds: [casinoConfigEmbed(state, interaction.user)],
    components: casinoConfigRows(state, interaction.user.id),
  });
}

async function handleCasinoConfigPlay(interaction) {
  const state = getCasinoConfigState(interaction.user.id);
  if (!state?.game) {
    await interaction.reply({
      content: "Choisis d'abord un jeu depuis le panneau casino.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const last = lastCasinoPlay.get(interaction.user.id);
  await interaction.showModal(
    buildCasinoModal(state.game, state.choice || "none", last?.number ?? null)
  );
}

function buildRedoRow() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino:redo")
        .setLabel("Refaire")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

async function handleCasinoRedo(interaction) {
  const last = lastCasinoPlay.get(interaction.user.id);
  if (!last) {
    await interaction.reply({
      content: "Aucune partie precedente. Choisis un jeu sur le panneau casino.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.showModal(
    buildCasinoModal(last.game, last.choice || "none", last.number ?? null)
  );
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
    const coteRaw = (presetChoice || "none").trim().toLowerCase();
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
    lastCasinoPlay.set(interaction.user.id, { game: "coinflip", choice: cote, number: null });
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
      components: buildRedoRow(),
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
    lastCasinoPlay.set(interaction.user.id, { game: "slots", choice: "none", number: null });
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
      components: buildRedoRow(),
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
    lastCasinoPlay.set(interaction.user.id, { game: "dice", choice: "none", number: guess });
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
      components: buildRedoRow(),
    });
    return;
  }

  if (game === "roulette") {
    const choice = parseRouletteChoice(presetChoice);
    if (!choice) {
      await interaction.reply({
        content: "Choix roulette invalide.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const numeroRaw = choice === "numero" ? interaction.fields.getTextInputValue("numero") : "";
    const numero = numeroRaw ? parseBet(numeroRaw) : null;
    const result = casino.playRoulette(interaction.user.id, mise, choice, numero);
    if (!result.ok) {
      await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
      return;
    }
    await economyLog.logCasino(interaction.client, interaction.user.id, "roulette", result);
    lastCasinoPlay.set(interaction.user.id, { game: "roulette", choice, number: numero });
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
      components: buildRedoRow(),
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
      lastCasinoPlay.set(interaction.user.id, { game: "blackjack", choice: "none", number: null });
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
        components: buildRedoRow(),
      });
      return;
    }
    lastCasinoPlay.set(interaction.user.id, { game: "blackjack", choice: "none", number: null });

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
  postMoneyActionInChannel,
  registerMoneyPanelMessage,
  startMoneyPanelsAutoRefresh,
  shopPanelEmbed,
  shopPanelRows,
  infosPanelEmbed,
  handleMoneyPanelButton,
  handleCasinoPanelSelect,
  handleCasinoConfigChoice,
  handleCasinoConfigPlay,
  handleCasinoRedo,
  handleCasinoPanelButton,
  handleCasinoModalSubmit,
  handleShopBuyButton,
  handleShopConfirmButton,
};
