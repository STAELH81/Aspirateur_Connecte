const crypto = require("crypto");
const path = require("path");
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
const { createStore } = require("./jsonStore");
const economy = require("./economy");
const casino = require("./casino");
const jackpot = require("./jackpot");
const { COLOR_UI, COLOR_SUCCESS } = require("./personality");

const store = createStore(path.join(__dirname, "..", "data", "duels.json"), {
  defaultData: () => ({ duels: {} }),
});

const pendingSetups = new Map();
const ACCEPT_MS = 60_000;
const PICK_MS = 120_000;
const HOUSE_TAX = 0.05;

const GAME_LABELS = { coinflip: "Coinflip", slots: "Slots", dice: "De" };
const MAX_TARGET_WINS = 100;

function genId() {
  return crypto.randomBytes(4).toString("hex");
}

function winsNeeded(target) {
  return Math.max(1, Math.min(MAX_TARGET_WINS, target));
}

function loadDuels() {
  return store.load().duels || {};
}

function getDuel(id) {
  return loadDuels()[id] || null;
}

function saveDuel(duel) {
  const data = store.load();
  data.duels = data.duels || {};
  data.duels[duel.id] = duel;
  store.save(data);
}

function deleteDuel(id) {
  const data = store.load();
  if (data.duels?.[id]) {
    delete data.duels[id];
    store.save(data);
  }
}

function playerLabel(duel, slot) {
  return slot === "a" ? `<@${duel.challengerId}>` : `<@${duel.defenderId}>`;
}

function buildChallengeEmbed(duel) {
  const needed = winsNeeded(duel.rounds);
  return new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle("Duel casino")
    .setDescription(
      [
        `${playerLabel(duel, "a")} defie ${playerLabel(duel, "b")}`,
        "",
        `Jeu : **${GAME_LABELS[duel.game] || duel.game}**`,
        `Objectif : premier a **${needed}** victoire(s)`,
        `Mise : **${duel.bet}** coins / manche`,
        `Escrow : **${duel.escrow}** coins chacun (${duel.bet} x ${needed})`,
        "",
        `<@${duel.defenderId}> — **60 s** pour accepter ou refuser.`,
      ].join("\n")
    );
}

function challengeRows(duelId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel:accept:${duelId}`)
        .setLabel("Accepter")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`duel:refuse:${duelId}`)
        .setLabel("Refuser")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function disabledRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("duel:done")
        .setLabel("Termine")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    ),
  ];
}

function buildActiveEmbed(duel, extraLines = []) {
  const needed = winsNeeded(duel.rounds);
  const lines = [
    `${playerLabel(duel, "a")} vs ${playerLabel(duel, "b")}`,
    `Jeu : **${GAME_LABELS[duel.game]}** · mise **${duel.bet}** / manche`,
    `Score : **${duel.scoreA}** — **${duel.scoreB}** (premier a **${needed}**)`,
    `Pot : **${duel.pot}** coins`,
  ];
  if (duel.currentRound) lines.push(`Manche **${duel.currentRound}**`);
  lines.push(...extraLines);
  return new EmbedBuilder().setColor(COLOR_UI).setTitle("Duel en cours").setDescription(lines.join("\n"));
}

function coinflipPickRows(duelId, duel) {
  const mk = (slot, face) =>
    new ButtonBuilder()
      .setCustomId(`duel:pick:${duelId}:${slot}:${face}`)
      .setLabel(face === "pile" ? "Pile" : "Face")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(Boolean(duel.picks?.[slot]));

  return [
    new ActionRowBuilder().addComponents(
      mk("a", "pile"),
      mk("a", "face")
    ),
    new ActionRowBuilder().addComponents(
      mk("b", "pile"),
      mk("b", "face")
    ),
  ];
}

function dicePickRows(duelId, duel) {
  const mkBtn = (slot, n) =>
    new ButtonBuilder()
      .setCustomId(`duel:pick:${duelId}:${slot}:${n}`)
      .setLabel(String(n))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(duel.picks?.[slot]));

  return [
    new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((n) => mkBtn("a", n))),
    new ActionRowBuilder().addComponents([mkBtn("a", 6)]),
    new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((n) => mkBtn("b", n))),
    new ActionRowBuilder().addComponents([mkBtn("b", 6)]),
  ];
}

async function editDuelMessage(client, duel, payload) {
  if (!duel.messageId || !duel.channelId) return;
  const channel = await client.channels.fetch(duel.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const msg = await channel.messages.fetch(duel.messageId).catch(() => null);
  if (!msg) return;
  await msg.edit(payload).catch(() => {});
}

function refundEscrow(duel) {
  if (!duel.escrowPaid) return;
  economy.addCoins(duel.challengerId, duel.escrow);
  economy.addCoins(duel.defenderId, duel.escrow);
  duel.escrowPaid = false;
}

async function finishDuel(client, duel, winnerSlot, reasonLines = []) {
  const winnerId = winnerSlot === "a" ? duel.challengerId : duel.defenderId;
  const loserId = winnerSlot === "a" ? duel.defenderId : duel.challengerId;
  const tax = Math.floor(duel.pot * HOUSE_TAX);
  const payout = duel.pot - tax;
  if (tax > 0) jackpot.addFromBet(tax);
  economy.addCoins(winnerId, payout);
  duel.status = "finished";
  duel.winnerId = winnerId;
  saveDuel(duel);

  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle("Duel termine")
    .setDescription(
      [
        `<@${winnerId}> remporte le duel !`,
        `Pot **${duel.pot}** · taxe **${tax}** · gain **${payout}** coins`,
        `<@${loserId}> perd **${duel.escrow}** coins (escrow).`,
        ...reasonLines,
      ].join("\n")
    );

  await editDuelMessage(client, duel, { embeds: [embed], components: disabledRows() });
  setTimeout(() => deleteDuel(duel.id), 60_000);
}

async function resolveRound(client, duel) {
  let roundResult;
  let summary = "";

  if (duel.game === "coinflip") {
    roundResult = casino.duelCoinflipRound(duel.picks.a, duel.picks.b);
    if (!roundResult.ok) return;
    summary = `Coin **${roundResult.flip}** — ${playerLabel(duel, "a")} **${roundResult.choiceA}** · ${playerLabel(duel, "b")} **${roundResult.choiceB}**`;
  } else if (duel.game === "dice") {
    roundResult = casino.duelDiceRound(Number(duel.picks.a), Number(duel.picks.b));
    if (!roundResult.ok) return;
    summary = `De **${roundResult.roll}** — ${playerLabel(duel, "a")} **${roundResult.guessA}** · ${playerLabel(duel, "b")} **${roundResult.guessB}**`;
  } else if (duel.game === "slots") {
    roundResult = casino.duelSlotsRound(duel.bet);
    summary = [
      `${playerLabel(duel, "a")} : ${roundResult.resA.display} (**${roundResult.resA.net}**)`,
      `${playerLabel(duel, "b")} : ${roundResult.resB.display} (**${roundResult.resB.net}**)`,
    ].join("\n");
  }

  let roundWinner = roundResult.winner;
  if (roundWinner === "a") duel.scoreA += 1;
  else if (roundWinner === "b") duel.scoreB += 1;

  const needed = winsNeeded(duel.rounds);
  const lines = [summary];
  if (roundWinner === "tie") {
    lines.push("Manche **egale** — pas de point.");
  } else {
    lines.push(`Point pour ${playerLabel(duel, roundWinner)} !`);
  }
  lines.push(`Score : **${duel.scoreA}** — **${duel.scoreB}**`);

  if (duel.scoreA >= needed) {
    saveDuel(duel);
    await finishDuel(client, duel, "a", lines);
    return;
  }
  if (duel.scoreB >= needed) {
    saveDuel(duel);
    await finishDuel(client, duel, "b", lines);
    return;
  }

  duel.currentRound += 1;
  duel.picks = {};
  duel.pickExpiresAt = Date.now() + PICK_MS;
  saveDuel(duel);

  await editDuelMessage(client, duel, {
    embeds: [buildActiveEmbed(duel, lines)],
    components: duel.game === "slots" ? [] : pickComponents(duel),
  });

  if (duel.game === "slots") {
    setTimeout(() => resolveRound(client, getDuel(duel.id)), 1500);
  } else {
    schedulePickTimeout(client, duel.id);
  }
}

function pickComponents(duel) {
  if (duel.game === "coinflip") return coinflipPickRows(duel.id, duel);
  if (duel.game === "dice") return dicePickRows(duel.id, duel);
  return [];
}

function schedulePickTimeout(client, duelId) {
  setTimeout(async () => {
    const duel = getDuel(duelId);
    if (!duel || duel.status !== "active") return;
    if (Date.now() < duel.pickExpiresAt) return;

    const hasA = Boolean(duel.picks?.a);
    const hasB = Boolean(duel.picks?.b);
    if (hasA && !hasB) {
      await finishDuel(client, duel, "a", ["Forfait — temps ecoule."]);
      return;
    }
    if (hasB && !hasA) {
      await finishDuel(client, duel, "b", ["Forfait — temps ecoule."]);
      return;
    }
    refundEscrow(duel);
    duel.status = "cancelled";
    saveDuel(duel);
    await editDuelMessage(client, duel, {
      embeds: [
        buildActiveEmbed(duel, ["Duel annule — aucun choix a temps. Escrow rembourse."]),
      ],
      components: disabledRows(),
    });
    deleteDuel(duelId);
  }, PICK_MS + 500);
}

async function startActiveRound(client, duel) {
  duel.picks = {};
  duel.pickExpiresAt = Date.now() + PICK_MS;
  saveDuel(duel);

  if (duel.game === "slots") {
    await editDuelMessage(client, duel, {
      embeds: [buildActiveEmbed(duel, ["Lancement des slots…"])],
      components: [],
    });
    setTimeout(() => resolveRound(client, getDuel(duel.id)), 800);
    return;
  }

  await editDuelMessage(client, duel, {
    embeds: [buildActiveEmbed(duel, ["Choisissez votre coup — **2 min** max."])],
    components: pickComponents(duel),
  });
  schedulePickTimeout(client, duel.id);
}

async function startSetup(interaction, opponent) {
  if (opponent.id === interaction.user.id) {
    await interaction.reply({
      content: "Tu ne peux pas te defier toi-meme.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (opponent.bot) {
    await interaction.reply({
      content: "Tu ne peux pas defier un bot.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  pendingSetups.set(interaction.user.id, {
    opponentId: opponent.id,
    channelId: interaction.channelId,
    guildId: interaction.guildId,
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("duel:setup:game")
    .setPlaceholder("Choisis le jeu")
    .addOptions(
      { label: "Coinflip", value: "coinflip", description: "Pile ou face" },
      { label: "Slots", value: "slots", description: "Net le plus haut gagne" },
      { label: "De", value: "dice", description: "Plus proche du tirage" }
    );

  await interaction.reply({
    content: `Duel vs **${opponent.displayName || opponent.username}** — choisis le jeu.`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleSetupGameSelect(interaction) {
  const setup = pendingSetups.get(interaction.user.id);
  if (!setup) {
    await interaction.reply({
      content: "Configuration expiree — relance `/duel`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setup.game = interaction.values[0];
  pendingSetups.set(interaction.user.id, setup);

  const modal = new ModalBuilder()
    .setCustomId("duel:setup:modal")
    .setTitle("Configuration du duel")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("rounds")
          .setLabel("Victoires pour gagner (1-100)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("10")
          .setRequired(true)
          .setMaxLength(3)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bet")
          .setLabel("Mise par manche (coins)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("50")
          .setRequired(true)
          .setMaxLength(6)
      )
    );

  await interaction.showModal(modal);
}

async function handleSetupModal(interaction) {
  const setup = pendingSetups.get(interaction.user.id);
  if (!setup) {
    await interaction.reply({
      content: "Configuration expiree — relance `/duel`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const rounds = parseInt(interaction.fields.getTextInputValue("rounds"), 10);
  const bet = parseInt(interaction.fields.getTextInputValue("bet"), 10);

  if (!Number.isFinite(rounds) || rounds < 1 || rounds > MAX_TARGET_WINS) {
    await interaction.reply({
      content: `Victoires invalides — entre **1** et **${MAX_TARGET_WINS}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const check = economy.validateBet(interaction.user.id, bet);
  if (!check.ok) {
    await interaction.reply({ content: check.reason, flags: MessageFlags.Ephemeral });
    return;
  }

  const escrow = check.mise * rounds;
  if (economy.getBalance(interaction.user.id) < escrow) {
    await interaction.reply({
      content: `Solde insuffisant — escrow **${escrow}** coins requis (${check.mise} x ${rounds}).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const id = genId();
  const duel = {
    id,
    status: "pending",
    challengerId: interaction.user.id,
    defenderId: setup.opponentId,
    game: setup.game,
    rounds,
    bet: check.mise,
    escrow,
    pot: 0,
    channelId: setup.channelId,
    guildId: setup.guildId,
    scoreA: 0,
    scoreB: 0,
    currentRound: 0,
    picks: {},
    createdAt: Date.now(),
    expiresAt: Date.now() + ACCEPT_MS,
    escrowPaid: false,
  };

  saveDuel(duel);
  pendingSetups.delete(interaction.user.id);

  const msg = await interaction.channel.send({
    content: `<@${duel.defenderId}>`,
    embeds: [buildChallengeEmbed(duel)],
    components: challengeRows(id),
  });

  duel.messageId = msg.id;
  saveDuel(duel);

  await interaction.reply({
    content: "Defi envoye dans le salon !",
    flags: MessageFlags.Ephemeral,
  });

  setTimeout(async () => {
    const current = getDuel(id);
    if (!current || current.status !== "pending") return;
    current.status = "expired";
    saveDuel(current);
    await editDuelMessage(interaction.client, current, {
      embeds: [
        buildChallengeEmbed(current).setDescription(
          `${playerLabel(current, "a")} vs ${playerLabel(current, "b")}\n\n**Expire** — pas de reponse en 60 s.`
        ),
      ],
      components: disabledRows(),
    });
    deleteDuel(id);
  }, ACCEPT_MS);
}

async function handleAccept(interaction, duelId) {
  const duel = getDuel(duelId);
  if (!duel || duel.status !== "pending") {
    await interaction.reply({ content: "Ce duel n'est plus disponible.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.user.id !== duel.defenderId) {
    await interaction.reply({
      content: "Seul le joueur defie peut accepter.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (Date.now() > duel.expiresAt) {
    await interaction.reply({ content: "Ce defi a expire.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (economy.getBalance(duel.challengerId) < duel.escrow) {
    await interaction.reply({
      content: "Le defiant n'a plus assez de coins — duel annule.",
      flags: MessageFlags.Ephemeral,
    });
    duel.status = "cancelled";
    saveDuel(duel);
    await editDuelMessage(interaction.client, duel, {
      embeds: [buildChallengeEmbed(duel).setDescription("Annule — solde defiant insuffisant.")],
      components: disabledRows(),
    });
    deleteDuel(duelId);
    return;
  }

  const removedDefender = economy.removeCoins(duel.defenderId, duel.escrow);
  if (!removedDefender.ok) {
    await interaction.reply({
      content: `Solde insuffisant — escrow **${duel.escrow}** coins requis.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const removedChallenger = economy.removeCoins(duel.challengerId, duel.escrow);
  if (!removedChallenger.ok) {
    economy.addCoins(duel.defenderId, duel.escrow);
    await interaction.reply({
      content: "Le defiant n'a plus assez de coins — duel annule.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  duel.status = "active";
  duel.escrowPaid = true;
  duel.pot = duel.escrow * 2;
  duel.currentRound = 1;
  saveDuel(duel);

  await interaction.deferUpdate();
  await startActiveRound(interaction.client, duel);
}

async function handleRefuse(interaction, duelId) {
  const duel = getDuel(duelId);
  if (!duel || duel.status !== "pending") {
    await interaction.reply({ content: "Ce duel n'est plus disponible.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.user.id !== duel.defenderId) {
    await interaction.reply({
      content: "Seul le joueur defie peut refuser.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  duel.status = "refused";
  saveDuel(duel);
  await interaction.update({
    embeds: [
      buildChallengeEmbed(duel).setDescription(
        `${playerLabel(duel, "a")} vs ${playerLabel(duel, "b")}\n\n**Refuse** par ${playerLabel(duel, "b")}.`
      ),
    ],
    components: disabledRows(),
  });
  deleteDuel(duelId);
}

async function handlePick(interaction, duelId, slot, value) {
  const duel = getDuel(duelId);
  if (!duel || duel.status !== "active") {
    await interaction.reply({ content: "Ce duel n'est plus actif.", flags: MessageFlags.Ephemeral });
    return;
  }

  const expectedUser = slot === "a" ? duel.challengerId : duel.defenderId;
  if (interaction.user.id !== expectedUser) {
    await interaction.reply({
      content: "Ce n'est pas ton tour de choisir.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (duel.picks?.[slot]) {
    await interaction.reply({ content: "Deja choisi.", flags: MessageFlags.Ephemeral });
    return;
  }

  duel.picks = duel.picks || {};
  duel.picks[slot] = value;
  saveDuel(duel);

  await interaction.deferUpdate();
  await editDuelMessage(interaction.client, duel, {
    embeds: [buildActiveEmbed(duel, [`${playerLabel(duel, slot)} a joue.`])],
    components: pickComponents(duel),
  });

  if (duel.picks.a && duel.picks.b) {
    await resolveRound(interaction.client, getDuel(duelId));
  }
}

module.exports = {
  startSetup,
  handleSetupGameSelect,
  handleSetupModal,
  handleAccept,
  handleRefuse,
  handlePick,
};
