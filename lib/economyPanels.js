const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const economy = require("./economy");
const jackpot = require("./jackpot");
const casino = require("./casino");
const blackjack = require("./blackjack");
const economyLog = require("./economyLog");
const shopPurchase = require("./shopPurchase");
const { scheduleMoneyMessageDeletion } = require("./moneyChannelMessages");
const economyCfg = require("./economyConfig");
const gamblingProgress = require("./gamblingProgress");
const { COLOR, COLOR_UI, COLOR_SUCCESS } = require("./personality");

const trackedMoneyPanels = new Map();
let moneyPanelsRefreshTimer = null;
const casinoConfigState = new Map();
const lastCasinoPlay = new Map();
const casinoEphemeralUi = new Map();
const moneyEphemeralUi = new Map();
const payDraft = new Map();

function toUnix(msFromNow) {
  return Math.floor((Date.now() + msFromNow) / 1000);
}

function blueEmbed(description, title = "Economie") {
  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle(title)
    .setDescription(description);
}

function casinoResultColor(wonOrPositive) {
  return wonOrPositive ? COLOR_SUCCESS : 0xed4245;
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
      new EmbedBuilder().setColor(COLOR_UI).setTitle(title).setDescription("Personne n'a encore de coins."),
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
        .setColor(COLOR_UI)
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
  const quest = gamblingProgress.getCurrentQuest();

  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle("Money Center")
    .setDescription(
      [
        "Boutons : **Daily**, **Work**, **Balance**, **Pay**.",
        "Le classement (top 25) se met a jour automatiquement sur ce panneau.",
      ].join("\n")
    )
    .addFields(
      { name: "Jackpot casino", value: `**${jackpot.getPool()}** coins`, inline: true },
      { name: "Mis a jour", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Top coins (25 premiers)", value: topText },
      { name: "Quete du jour", value: `${quest.label}\nRecompense : **+${quest.reward}** coins` }
    );
}

function moneyPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
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
        .setCustomId("money:panel:pay")
        .setLabel("Pay")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("money:panel:quest")
        .setLabel("Quete")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("money:panel:profile")
        .setLabel("Profil/Stats")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("money:panel:refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function casinoPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle("Casino Center")
    .setDescription(
      [
        "Choisis un jeu dans le menu.",
        "Configure pile/face ou roulette si besoin, puis **Lancer** (mise uniquement).",
        "Apres le resultat : **Meme mise**, **Rejouer** ou **Changer de jeux**.",
      ].join("\n")
    )
    .addFields({
      name: "Jackpot",
      value: `Cagnotte actuelle : **${jackpot.getPool()}** coins`,
    });
}

function casinoGameSelectMenu(customId = "casino:panel:select") {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Choisir un jeu...")
    .addOptions(
      { label: "Coinflip", value: "coinflip", description: "Pile ou face" },
      { label: "Slots", value: "slots", description: "Machine a sous" },
      { label: "Dice", value: "dice", description: "Devine le de (1-6)" },
      { label: "Roulette", value: "roulette", description: "Roulette 0-9" },
      { label: "Blackjack", value: "blackjack", description: "Hit / Stand" }
    );
}

function casinoPanelRows() {
  return [
    new ActionRowBuilder().addComponents(casinoGameSelectMenu("casino:panel:select")),
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
  const balance = economy.getBalance(user.id);
  const maxBet = economy.getMaxBet(user.id);
  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle("Configuration partie casino")
    .setDescription(
      [
        `Joueur : ${user}`,
        `Jeu : **${gameLabel}**`,
        `Choix : **${choiceLabel}**`,
        "Clique sur **Lancer** pour entrer seulement la mise (et les nombres si necessaire).",
      ].join("\n")
    )
    .addFields({
      name: "Economie",
      value: [
        `Solde : ${economy.formatCoins(balance)}`,
        `Mise max : **${maxBet}** coins (75% du solde, cap 2000)`,
      ].join("\n"),
      inline: true,
    });
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
        .setCustomId("casino:config:cancel")
        .setLabel("Annuler")
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return rows;
}

async function deleteCasinoEphemeralUi(client, userId) {
  const ref = casinoEphemeralUi.get(userId);
  if (!ref) return;
  casinoEphemeralUi.delete(userId);
  try {
    const channel = await client.channels.fetch(ref.channelId);
    if (channel?.isTextBased()) {
      const msg = await channel.messages.fetch(ref.messageId);
      await msg.delete();
    }
  } catch {
    // deja supprime
  }
}

function trackCasinoUi(userId, message) {
  if (message?.id) {
    casinoEphemeralUi.set(userId, { channelId: message.channelId, messageId: message.id });
  }
}

async function editTrackedMessage(client, store, userId, payload) {
  const ref = store.get(userId);
  if (!ref) return null;
  try {
    const channel = await client.channels.fetch(ref.channelId);
    const msg = await channel.messages.fetch(ref.messageId);
    await msg.edit({
      content: payload.content ?? null,
      embeds: payload.embeds ?? [],
      components: payload.components ?? [],
    });
    return msg;
  } catch {
    store.delete(userId);
    return null;
  }
}

async function updateCasinoUi(interaction, payload) {
  const userId = interaction.user.id;
  const body = {
    content: payload.content ?? null,
    embeds: payload.embeds ?? [],
    components: payload.components ?? [],
  };

  if (interaction.isMessageComponent() && !interaction.replied && !interaction.deferred) {
    const msg = await interaction.update(body);
    trackCasinoUi(userId, msg);
    return msg;
  }

  const edited = await editTrackedMessage(interaction.client, casinoEphemeralUi, userId, body);
  if (edited) return edited;

  const msg = await interaction.reply({ ...body, flags: MessageFlags.Ephemeral, fetchReply: true });
  trackCasinoUi(userId, msg);
  return msg;
}

async function showMoneyFeedback(interaction, description, title) {
  const userId = interaction.user.id;
  const body = { embeds: [blueEmbed(description, title)], components: [] };

  await interaction.deferUpdate().catch(() => {});
  await refreshMoneyPanelMessage(interaction).catch(() => {});

  const edited = await editTrackedMessage(interaction.client, moneyEphemeralUi, userId, body);
  if (edited) {
    scheduleMoneyMessageDeletion(interaction.client, edited.channelId, edited.id);
    return edited;
  }

  const msg = await interaction.followUp({ ...body, flags: MessageFlags.Ephemeral, fetchReply: true });
  moneyEphemeralUi.set(userId, { channelId: msg.channelId, messageId: msg.id });
  scheduleMoneyMessageDeletion(interaction.client, msg.channelId, msg.id);
  return msg;
}

async function handleQuestClaim(interaction) {
  const status = gamblingProgress.getQuestStatus(interaction.user.id);
  if (!status.completed || status.claimed) {
    await showMoneyFeedback(
      interaction,
      [
        `Quete : **${status.label}**`,
        `Progression : **${gamblingProgress.questProgressField(status)}**`,
        `Recompense : **+${status.reward}** coins`,
      ].join("\n"),
      "Quete du jour"
    );
    return;
  }
  const claimed = gamblingProgress.claimQuest(interaction.user.id);
  if (!claimed.ok) {
    await showMoneyFeedback(interaction, claimed.reason, "Quete du jour");
    return;
  }
  await showMoneyFeedback(
    interaction,
    [
      `Quete validee : **${claimed.questLabel}**`,
      `Gain : **+${claimed.reward}** coins`,
      `Solde : ${economy.formatCoins(claimed.balance)}`,
    ].join("\n"),
    "Quete du jour"
  );
}

function playerDisplayName(user) {
  return user.globalName || user.displayName || user.username;
}

function embedsWithPlayerName(user, embeds = []) {
  const name = playerDisplayName(user);
  return embeds.map((raw) => {
    const embed = raw instanceof EmbedBuilder ? raw : EmbedBuilder.from(raw);
    const current = embed.data.description || "";
    if (current.startsWith(`**${name}**`)) return embed;
    return embed.setDescription([`**${name}**`, current].filter(Boolean).join("\n"));
  });
}

async function postPublicCasinoResult(interaction, payload) {
  if (!interaction.channel?.isTextBased()) return;
  await interaction.channel.send({
    embeds: embedsWithPlayerName(interaction.user, payload.embeds ?? []),
    components: [],
  });
}

function buildCasinoResultRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino:samebet")
        .setLabel("Meme mise")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("casino:replay")
        .setLabel("Rejouer")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("casino:other")
        .setLabel("Changer de jeux")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function rememberCasinoPlay(userId, data) {
  lastCasinoPlay.set(userId, data);
}

async function runCasinoRound(interaction, { game, bet, choice, number }) {
  const userId = interaction.user.id;
  const mise = Math.floor(bet);

  if (game === "coinflip") {
    const cote = choice === "pile" || choice === "face" ? choice : null;
    if (!cote) return { ok: false, reason: "Cote invalide." };
    const result = casino.playCoinflip(userId, mise, cote);
    if (!result.ok) return result;
    await economyLog.logCasino(interaction.client, userId, "coinflip", result);
    gamblingProgress.recordCasinoRound(userId, "coinflip", result);
    rememberCasinoPlay(userId, { game, choice: cote, number: null, bet: result.bet });
    return {
      ok: true,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setColor(casinoResultColor(result.won))
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
        components: buildCasinoResultRows(),
      },
    };
  }

  if (game === "slots") {
    const result = casino.playSlots(userId, mise);
    if (!result.ok) return result;
    await economyLog.logCasino(interaction.client, userId, "slots", result);
    gamblingProgress.recordCasinoRound(userId, "slots", result);
    rememberCasinoPlay(userId, { game, choice: "none", number: null, bet: result.bet });
    const netLabel = result.net >= 0 ? `+${result.net}` : `${result.net}`;
    return {
      ok: true,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setColor(casinoResultColor(result.net > 0))
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
        components: buildCasinoResultRows(),
      },
    };
  }

  if (game === "dice") {
    const result = casino.playDice(userId, mise, number);
    if (!result.ok) return result;
    await economyLog.logCasino(interaction.client, userId, "dice", result);
    gamblingProgress.recordCasinoRound(userId, "dice", result);
    rememberCasinoPlay(userId, { game, choice: "none", number: result.guess, bet: result.bet });
    return {
      ok: true,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setColor(casinoResultColor(result.won))
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
        components: buildCasinoResultRows(),
      },
    };
  }

  if (game === "roulette") {
    const pick = parseRouletteChoice(choice);
    if (!pick) return { ok: false, reason: "Choix roulette invalide." };
    const result = casino.playRoulette(userId, mise, pick, number);
    if (!result.ok) return result;
    await economyLog.logCasino(interaction.client, userId, "roulette", result);
    gamblingProgress.recordCasinoRound(userId, "roulette", result);
    rememberCasinoPlay(userId, { game, choice: pick, number, bet: result.bet });
    return {
      ok: true,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setColor(casinoResultColor(result.won))
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
        components: buildCasinoResultRows(),
      },
    };
  }

  if (game === "blackjack") {
    const playerName = playerDisplayName(interaction.user);
    const result = blackjack.startGame(userId, mise, playerName);
    if (!result.ok) return result;
    if (result.instant) {
      await economyLog.logCasino(interaction.client, userId, "blackjack", result);
      gamblingProgress.recordCasinoRound(userId, "blackjack", {
        bet: result.bet,
        net: (result.win || 0) - result.bet,
        won: Boolean(result.win && result.win > result.bet),
      });
      rememberCasinoPlay(userId, { game, choice: "none", number: null, bet: result.bet });
      return {
        ok: true,
        payload: {
          embeds: [
            blackjack
              .buildEmbed(
                {
                  bet: result.bet,
                  player: result.playerHand,
                  dealer: result.dealerHand,
                  playerName,
                },
                { reveal: true, footer: "Blackjack !", playerName }
              )
              .setColor(COLOR_SUCCESS),
          ],
          components: buildCasinoResultRows(),
        },
      };
    }
    rememberCasinoPlay(userId, { game, choice: "none", number: null, bet: result.bet });
    return { ok: true, blackjack: result };
  }

  return { ok: false, reason: "Jeu inconnu." };
}

async function ackModalSilently(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.deleteReply().catch(() => {});
}

async function openCasinoGameConfigEphemeral(interaction, game) {
  const state = setCasinoConfigState(interaction.user.id, {
    game,
    choice: getDefaultChoice(game),
  });
  const payload = {
    embeds: [casinoConfigEmbed(state, interaction.user)],
    components: casinoConfigRows(state, interaction.user.id),
  };
  const edited = await editTrackedMessage(
    interaction.client,
    casinoEphemeralUi,
    interaction.user.id,
    payload
  );
  if (edited) return edited;

  const msg = await interaction.followUp({
    ...payload,
    flags: MessageFlags.Ephemeral,
    fetchReply: true,
  });
  trackCasinoUi(interaction.user.id, msg);
  return msg;
}

async function showCasinoResultUi(interaction, payload) {
  const userId = interaction.user.id;
  const body = {
    content: null,
    embeds: payload.embeds ?? [],
    components: payload.components ?? [],
  };

  const edited = await editTrackedMessage(interaction.client, casinoEphemeralUi, userId, body);
  if (edited) {
    await interaction.deleteReply().catch(() => {});
    return edited;
  }

  const msg = await interaction.editReply({ ...body });
  trackCasinoUi(userId, msg);
  return msg;
}

async function showCasinoGamePicker(interaction, selectCustomId = "casino:pick:select") {
  return updateCasinoUi(interaction, {
    embeds: [casinoPanelEmbed()],
    components: [new ActionRowBuilder().addComponents(casinoGameSelectMenu(selectCustomId))],
  });
}

async function startCasinoFlow(interaction) {
  casinoConfigState.delete(interaction.user.id);
  await showCasinoGamePicker(interaction, "casino:pick:select");
}

async function openCasinoGameConfig(interaction, game) {
  const state = setCasinoConfigState(interaction.user.id, {
    game,
    choice: getDefaultChoice(game),
  });
  return updateCasinoUi(interaction, {
    embeds: [casinoConfigEmbed(state, interaction.user)],
    components: casinoConfigRows(state, interaction.user.id),
  });
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
  if (action === "pay") {
    await showPayFlow(interaction);
    return;
  }
  if (action === "quest") {
    await handleQuestClaim(interaction);
    return;
  }
  if (action === "profile") {
    const p = gamblingProgress.getProfile(interaction.user.id);
    await showMoneyFeedback(
      interaction,
      [
        `Solde : ${economy.formatCoins(p.balance)}`,
        `Parties casino : **${p.casinoGames}**`,
        `Wins : **${p.casinoWins}** (**${p.winrate}%**)`,
        `Net casino : **${p.casinoNet >= 0 ? `+${p.casinoNet}` : p.casinoNet}** coins`,
        `Mises totales : **${p.totalBet}** coins`,
        `Jeu prefere : **${p.favoriteGame}**`,
        `Plus grosse win : **+${p.biggestWin}**`,
        `Plus grosse perte : **${p.biggestLoss}**`,
      ].join("\n"),
      `Profil/Stats — ${interaction.user.username}`
    );
    return;
  }

  const userId = interaction.user.id;

  if (action === "balance") {
    const bal = economy.getBalance(userId);
    await showMoneyFeedback(interaction, `Solde : ${economy.formatCoins(bal)}`, "Balance");
    return;
  }

  if (action === "daily") {
    const result = economy.tryDaily(userId);
    if (!result.ok) {
      const ts = toUnix(result.waitMs);
      await showMoneyFeedback(
        interaction,
        `Daily deja pris. Reviens <t:${ts}:R> (a <t:${ts}:T>).`,
        "Daily"
      );
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
    await showMoneyFeedback(
      interaction,
      [
        `Daily : **+${result.gain}** coins${result.boostUsed ? ` (boost x${result.boostMult})` : ""}`,
        `Streak : **${result.streak}** jour(s) (+${result.bonus} bonus)`,
        `Solde : ${economy.formatCoins(result.balance)}`,
      ].join("\n"),
      "Daily"
    );
    gamblingProgress.recordDaily(userId);
    return;
  }

  if (action === "work") {
    const result = economy.tryWork(userId);
    if (!result.ok) {
      const ts = toUnix(result.waitMs);
      await showMoneyFeedback(
        interaction,
        `Repos. Retente <t:${ts}:R> (a <t:${ts}:T>).`,
        "Work"
      );
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
    await showMoneyFeedback(
      interaction,
      `Travail : **+${result.gain}** coins${result.workBoostUsed ? ` (boost x${result.workMult})` : ""}\nSolde : ${economy.formatCoins(result.balance)}`,
      "Work"
    );
    gamblingProgress.recordWork(userId);
  }
}

function buildCasinoModal(game, presetChoice = "none", lastPlay = null) {
  const modal = new ModalBuilder()
    .setCustomId(`casino:play:${game}:${presetChoice || "none"}`)
    .setTitle(`Casino — ${game}`);

  const betInput = new TextInputBuilder()
    .setCustomId("mise")
    .setLabel("Mise (minimum 10)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("100");
  if (lastPlay?.bet > 0) betInput.setValue(String(lastPlay.bet));
  modal.addComponents(new ActionRowBuilder().addComponents(betInput));

  if (game === "dice") {
    const input = new TextInputBuilder()
      .setCustomId("nombre")
      .setLabel("Nombre (1 a 6)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("4");
    if (lastPlay?.number != null && Number.isFinite(lastPlay.number)) {
      input.setValue(String(lastPlay.number));
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
    if (lastPlay?.number != null && Number.isFinite(lastPlay.number)) {
      input.setValue(String(lastPlay.number));
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
  await interaction.deferUpdate();
  await openCasinoGameConfigEphemeral(interaction, game);
}

async function handleCasinoPickSelect(interaction) {
  const game = interaction.values?.[0];
  if (!game) {
    await interaction.reply({ content: "Jeu invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  await openCasinoGameConfig(interaction, game);
}

async function handleCasinoConfigCancel(interaction) {
  casinoConfigState.delete(interaction.user.id);
  await interaction.update({
    embeds: [casinoPanelEmbed()],
    components: [new ActionRowBuilder().addComponents(casinoGameSelectMenu("casino:pick:select"))],
  });
}

async function handleCasinoOtherGame(interaction) {
  casinoConfigState.delete(interaction.user.id);
  await interaction.update({
    embeds: [casinoPanelEmbed()],
    components: [new ActionRowBuilder().addComponents(casinoGameSelectMenu("casino:pick:select"))],
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
    buildCasinoModal(state.game, state.choice || "none", last)
  );
}

async function applyCasinoRoundToUi(interaction, round) {
  if (!round.ok) {
    await interaction.update({
      embeds: [blueEmbed(round.reason || "Partie impossible.", "Casino")],
      components: buildCasinoResultRows(),
    });
    return;
  }
  if (round.blackjack) {
    const gameData = blackjack.getGame(round.blackjack.gameId, interaction.user.id);
    await interaction.update({
      embeds: [blackjack.buildEmbed(gameData)],
      components: [blackjack.buildButtons(round.blackjack.gameId)],
    });
    return;
  }
  await interaction.update(round.payload);
}

async function handleCasinoSameBet(interaction) {
  const last = lastCasinoPlay.get(interaction.user.id);
  if (!last?.bet) {
    await interaction.reply({
      content: "Aucune mise precedente. Utilise **Rejouer** ou `/casino`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const round = await runCasinoRound(interaction, {
    game: last.game,
    bet: last.bet,
    choice: last.choice || getDefaultChoice(last.game),
    number: last.number ?? null,
  });
  await applyCasinoRoundToUi(interaction, round);
  if (round.ok && round.payload) {
    await postPublicCasinoResult(interaction, round.payload);
  }
}

async function handleCasinoReplay(interaction) {
  const last = lastCasinoPlay.get(interaction.user.id);
  if (!last) {
    await interaction.reply({
      content: "Aucune partie precedente. Fais `/casino` pour recommencer.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const state = setCasinoConfigState(interaction.user.id, {
    game: last.game,
    choice: last.choice || getDefaultChoice(last.game),
  });
  await interaction.update({
    embeds: [casinoConfigEmbed(state, interaction.user)],
    components: casinoConfigRows(state, interaction.user.id),
  });
}

async function handleCasinoPanelButton(interaction) {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_UI)
        .setTitle("Jackpot casino")
        .setDescription(`Cagnotte : **${jackpot.getPool()}** coins`),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCasinoModalSubmit(interaction) {
  const [, , game, presetChoice] = interaction.customId.split(":");
  const mise = parseBet(interaction.fields.getTextInputValue("mise"));
  if (!Number.isFinite(mise)) {
    await interaction.reply({ content: "Mise invalide.", flags: MessageFlags.Ephemeral });
    return;
  }

  let choice = presetChoice || getDefaultChoice(game);
  let number = null;
  if (game === "dice") {
    number = parseBet(interaction.fields.getTextInputValue("nombre"));
  } else if (game === "roulette") {
    choice = parseRouletteChoice(presetChoice);
    if (!choice) {
      await interaction.reply({ content: "Choix roulette invalide.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (choice === "numero") {
      number = parseBet(interaction.fields.getTextInputValue("numero"));
    }
  }

  const round = await runCasinoRound(interaction, {
    game,
    bet: mise,
    choice,
    number,
  });

  if (!round.ok) {
    await interaction.update({
      embeds: [blueEmbed(round.reason || "Partie impossible.", "Casino")],
      components: buildCasinoResultRows(),
    });
    return;
  }

  if (round.blackjack) {
    const gameData = blackjack.getGame(round.blackjack.gameId, interaction.user.id);
    await interaction.update({
      embeds: [blackjack.buildEmbed(gameData)],
      components: [blackjack.buildButtons(round.blackjack.gameId)],
    });
    return;
  }

  await interaction.update(round.payload);
  await postPublicCasinoResult(interaction, round.payload);
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

function payPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("pay:recipient")
        .setPlaceholder("Choisir un destinataire")
        .setMinValues(1)
        .setMaxValues(1)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pay:open-modal")
        .setLabel("Montant")
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

function describeShopItem(item) {
  const price = `**${item.price}** coins`;
  const stock = shopPurchase.getItemStock(item);
  const stockSuffix = stock == null ? "" : ` | Stock restant : **${stock}**`;
  switch (item.type || "role") {
    case "role":
      return `${price} — Role **${item.label}** pendant **${item.durationDays || 1}** jour(s). Retire automatiquement a expiration.${stockSuffix}`;
    case "daily_boost":
      return `${price} — Prochain **Daily** gagne x**${item.multiplier || 1.5}** (une seule utilisation).`;
    case "work_reset":
      return `${price} — Remet le cooldown **Work** a zero (tu peux retravailler tout de suite).`;
    case "work_boost":
      return `${price} — Prochain **Work** gagne x**${item.multiplier || 2}** (une seule utilisation).`;
    case "streak_shield":
      return `${price} — Protege ton **streak Daily** si tu rates un jour (consomme au prochain oubli).`;
    case "coin_pack":
      return `${price} — Pack rigolo : **+${item.coins || 0}** coins (tu perds de l'argent, c'est voulu).`;
    default:
      return `${price} — ${item.label}${stockSuffix}`;
  }
}

function shopPanelEmbed() {
  const items = shopPurchase.listItems();
  const lines =
    items.length === 0
      ? "Aucun article valide dans `data/shop.json`."
      : items.map((item, i) => `**${i + 1}. ${item.label}**\n${describeShopItem(item)}`).join("\n\n");

  return blueEmbed(
    [
      "Clique sur un bouton, confirme l'achat. Tout reste **ephemere** (visible par toi seul).",
      "",
      lines,
    ].join("\n"),
    "Shop"
  );
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
  const c = economyCfg;
  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle("Guide economie & casino")
    .setDescription(
      "Salons dedies : **money**, **casino**, **shop**, **infos**. Les panneaux fixes servent de hub ; tes actions (daily, jeu, achat) repondent en **message ephemere bleu** qui se remplace, sans spammer le salon."
    )
    .addFields(
      {
        name: "Commandes",
        value: [
          "`/casino` — ouvre le flux casino (ephemere).",
          "Panneau **Money** : Daily, Work, Balance, Pay, Refresh.",
          "Panneau **Shop** : boutons d'achat + confirmation.",
          "Staff : `/money admin` (panel, shop-panel, infos-panel, casino-panel, donner, retirer).",
        ].join("\n"),
      },
      {
        name: "Gagner des coins (earn)",
        value: [
          `**Daily** : ${c.daily.min}–${c.daily.max} coins, cooldown **24 h**.`,
          `Streak daily : +${c.dailyStreak.bonusPerDay} coins/jour de suite (max bonus +${c.dailyStreak.maxBonus}).`,
          `**Work** : ${c.work.min}–${c.work.max} coins, cooldown **45 min**.`,
          `Solde de depart : **${c.startBalance}** coins.`,
          "Boost shop Daily/Work : s'applique sur la **prochaine** action seulement.",
        ].join("\n"),
      },
      {
        name: "Mises & jackpot",
        value: [
          `Mise min **${c.bet.min}**, max **${c.bet.maxAbsolute}** ou **${Math.round(c.bet.maxBalanceRatio * 100)}%** du solde.`,
          `Taxe jackpot : **${Math.round(c.jackpot.taxRate * 100)}%** de chaque mise casino → cagnotte commune.`,
          `Chance de gagner le jackpot : environ **1/${Math.round(1 / c.jackpot.winChance)}** par partie.`,
        ].join("\n"),
      },
      {
        name: "Casino — chances & gains",
        value: [
          `**Coinflip** (pile/face) : x**${c.coinflip.multiplier}** si tu gagnes (~50% sans compter le jackpot).`,
          `**Dice** (1–6) : x**${c.dice.multiplier}** si le de tombe sur ton nombre (~16,7%).`,
          `**Roulette 0–9** : rouge/noir x**${c.roulette.red.multiplier}**, vert (0) x**${c.roulette.green.multiplier}**, numero precis x**${c.roulette.straight.multiplier}**.`,
          "**Slots** : paires et triples selon symboles (voir cotes internes).",
          `**Blackjack** : BJ x**${c.blackjack.blackjackMultiplier}**, victoire x**${c.blackjack.winMultiplier}**, egalite = mise rendue.`,
        ].join("\n"),
      },
      {
        name: "Flux casino",
        value: [
          "1. Choisis le jeu (menu).",
          "2. Configure pile/face ou roulette si besoin → **Lancer**.",
          "3. Entre la mise (modal).",
          "4. Resultat sur le **meme** message ephemere.",
          "**Meme mise** = rejoue identique · **Rejouer** = reconfigure la mise · **Changer de jeux** = retour au menu.",
        ].join("\n"),
      }
    );
}

async function showPayFlow(interaction) {
  await interaction.reply({
    embeds: [
      blueEmbed(
        [
          "1. Choisis le **destinataire** dans le menu.",
          "2. Clique sur **Montant** pour entrer les coins.",
          "3. Raison optionnelle, puis **Confirmer**.",
        ].join("\n"),
        "Envoyer des coins"
      ),
    ],
    components: payPanelRows(),
    flags: MessageFlags.Ephemeral,
  });
}

async function handlePayRecipient(interaction) {
  const to = interaction.users.first();
  if (!to || to.bot) {
    await interaction.reply({
      content: "Choisis un membre valide (pas un bot).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (to.id === interaction.user.id) {
    await interaction.reply({
      content: "Tu ne peux pas t'envoyer des coins a toi-meme.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  payDraft.set(interaction.user.id, { toId: to.id, toTag: to.username });
  await interaction.reply({
    embeds: [blueEmbed(`Destinataire : ${to}\nClique sur **Montant**.`, "Envoyer des coins")],
    flags: MessageFlags.Ephemeral,
  });
}

async function handlePayOpenModal(interaction) {
  const draft = payDraft.get(interaction.user.id);
  if (!draft?.toId) {
    await interaction.reply({
      content: "Choisis d'abord un destinataire dans le menu.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId("pay:form")
    .setTitle("Envoyer des coins")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("montant")
          .setLabel("Montant (coins)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("100")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("raison")
          .setLabel("Raison (optionnel)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("Merci pour le carry")
      )
    );
  await interaction.showModal(modal);
}

async function handlePayFormSubmit(interaction) {
  const draft = payDraft.get(interaction.user.id);
  if (!draft?.toId) {
    await interaction.reply({
      content: "Session expiree. Recommence via le bouton **Pay**.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const amount = parseBet(interaction.fields.getTextInputValue("montant"));
  if (!Number.isFinite(amount) || amount < 1) {
    await interaction.reply({ content: "Montant invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  const reason = (interaction.fields.getTextInputValue("raison") || "").trim();
  payDraft.set(interaction.user.id, { ...draft, amount, reason });

  const lines = [
    `De : ${interaction.user}`,
    `Vers : <@${draft.toId}>`,
    `Montant : **${amount}** coins`,
    reason ? `Raison : ${reason}` : null,
  ].filter(Boolean);

  await interaction.reply({
    embeds: [
      blueEmbed(lines.join("\n"), "Confirmer le paiement"),
    ],
    flags: MessageFlags.Ephemeral,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pay:confirm:${interaction.user.id}`)
          .setLabel("Confirmer")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`pay:cancel:${interaction.user.id}`)
          .setLabel("Annuler")
          .setStyle(ButtonStyle.Danger)
      ),
    ],
  });
}

async function handlePayConfirm(interaction) {
  const [, action, userId] = interaction.customId.split(":");
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Cette confirmation n'est pas pour toi.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (action === "cancel") {
    payDraft.delete(interaction.user.id);
    await interaction.update({ content: "Paiement annule.", embeds: [], components: [] });
    return;
  }

  const draft = payDraft.get(interaction.user.id);
  if (!draft?.toId || !draft.amount) {
    await interaction.update({ content: "Session expiree.", embeds: [], components: [] });
    return;
  }

  const result = economy.pay(interaction.user.id, draft.toId, draft.amount);
  payDraft.delete(interaction.user.id);
  if (!result.ok) {
    await interaction.update({ content: result.reason, embeds: [], components: [] });
    return;
  }

  await economyLog.logPay(
    interaction.client,
    interaction.user.id,
    draft.toId,
    result.amount,
    result.fromBefore,
    result.fromAfter,
    result.toBefore,
    result.toAfter
  );

  const body = {
    embeds: [
      blueEmbed(
        [
          `Envoi de **${result.amount}** coins a <@${draft.toId}>`,
          draft.reason ? `Raison : ${draft.reason}` : null,
          `Solde restant : ${economy.formatCoins(result.fromBalance)}`,
        ]
          .filter(Boolean)
          .join("\n"),
        "Paiement"
      ),
    ],
    components: [],
  };
  await interaction.update(body);
  moneyEphemeralUi.set(interaction.user.id, {
    channelId: interaction.channelId,
    messageId: interaction.message.id,
  });
  scheduleMoneyMessageDeletion(
    interaction.client,
    interaction.channelId,
    interaction.message.id
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
    embeds: [
      blueEmbed(
        [
          `Confirmer l'achat de **${item.label}** ?`,
          describeShopItem(item),
        ].join("\n"),
        "Confirmation"
      ),
    ],
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
    await interaction.update({ embeds: [blueEmbed("Achat annule.")], components: [] });
    return;
  }

  const result = await shopPurchase.buy(interaction, itemId);
  if (!result.ok) {
    await interaction.update({ embeds: [blueEmbed(result.reason)], components: [] });
    return;
  }

  await interaction.update({
    embeds: [
      blueEmbed(
        [
          `Achat : **${result.item.label}** pour **${result.price}** coins.`,
          describeShopItem(result.item),
          `Solde : ${economy.formatCoins(result.balance)}`,
        ].join("\n"),
        "Shop"
      ),
    ],
    components: [],
  });
  scheduleMoneyMessageDeletion(
    interaction.client,
    interaction.channelId,
    interaction.message.id
  );
}

module.exports = {
  moneyPanelEmbed,
  moneyPanelRows,
  casinoPanelEmbed,
  casinoPanelRows,
  startCasinoFlow,
  buildTopEmbeds,
  buildCasinoResultRows,
  embedsWithPlayerName,
  rememberCasinoPlay,
  registerMoneyPanelMessage,
  startMoneyPanelsAutoRefresh,
  shopPanelEmbed,
  shopPanelRows,
  payPanelRows,
  showPayFlow,
  infosPanelEmbed,
  handleMoneyPanelButton,
  handleCasinoPanelSelect,
  handleCasinoPickSelect,
  handleCasinoConfigChoice,
  handleCasinoConfigPlay,
  handleCasinoConfigCancel,
  handleCasinoSameBet,
  handleCasinoReplay,
  handleCasinoOtherGame,
  handleCasinoPanelButton,
  handleCasinoModalSubmit,
  handleShopBuyButton,
  handleShopConfirmButton,
  handlePayRecipient,
  handlePayOpenModal,
  handlePayFormSubmit,
  handlePayConfirm,
};
