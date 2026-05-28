require("dotenv").config({ quiet: true });
const {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const commandModules = require("./commands");
const memberJoinEvent = require("./events/memberJoin");
const memberLeaveEvent = require("./events/memberLeave");
const { addEntrant, updateMessage, scheduleAll } = require("./lib/giveaways");
const { scheduleBirthdayAnnounce } = require("./lib/birthdayAnnounce");
const { scheduleBirthdayVip } = require("./lib/birthdayVip");
const { scheduleShopRoleCleanup } = require("./lib/shopPurchase");
const personality = require("./lib/personality");
const blackjack = require("./lib/blackjack");
const economyLog = require("./lib/economyLog");
const pollVotes = require("./lib/pollVotes");
const { refreshPollMessage } = require("./lib/pollDisplay");
const tickets = require("./lib/tickets");
const afk = require("./lib/afk");
const xp = require("./lib/xp");
const suggestions = require("./lib/suggestions");
const gamblingProgress = require("./lib/gamblingProgress");
const { createStore } = require("./lib/jsonStore");
const { replyIfWrongChannel } = require("./lib/gamblingChannel");
const {
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
  handleBankOpenModal,
  handleBankBorrowModal,
  handleBankRepayModal,
  buildCasinoResultRows,
  embedsWithPlayerName,
  rememberCasinoPlay,
  startMoneyPanelsAutoRefresh,
} = require("./lib/economyPanels");
const { startCasinoResultCleanup } = require("./lib/casinoResultCleanup");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
for (const cmd of commandModules) {
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Aspirateur en ligne : ${c.user.tag} — Les Girlsss`);
  scheduleAll(client);
  scheduleBirthdayAnnounce(client);
  scheduleBirthdayVip(client);
  scheduleShopRoleCleanup(client);
  startMoneyPanelsAutoRefresh(client);
  startCasinoResultCleanup(client);

  const economyStore = createStore(
    path.join(__dirname, "data", "economy.json"),
    { defaultData: {} }
  );
  economyStore.load();

  if (!process.env.WELCOME_CHANNEL_ID) {
    console.log("Tip: WELCOME_CHANNEL_ID pour bienvenue + depart (ou LEAVE_CHANNEL_ID).");
  }
  const { loadRoleIds } = require("./lib/autoRoles");
  if (loadRoleIds().length === 0) {
    console.log("Tip: data/auto-roles.json pour les roles a l'arrivee.");
  }
  if (!process.env.GAMBLING_CHANNEL_ID && !process.env.GAMBLING_TEST_CHANNEL_ID) {
    console.log("Tip: GAMBLING_CHANNEL_ID et/ou GAMBLING_TEST_CHANNEL_ID pour /money et /casino.");
  }
  if (!process.env.GENERAL_CHANNEL_ID) {
    console.log("Tip: GENERAL_CHANNEL_ID pour l'annonce anniversaire dans le general.");
  }
  if (!process.env.ECONOMY_LOG_CHANNEL_ID) {
    console.log("Tip: ECONOMY_LOG_CHANNEL_ID pour les logs casino.");
  }
  const ticketCat = process.env.TICKET_CATEGORY_ID?.match(/\d{17,20}/)?.[0];
  if (ticketCat && process.env.DISCORD_GUILD_ID) {
    client.guilds
      .fetch(process.env.DISCORD_GUILD_ID)
      .then((g) => g.channels.fetch(ticketCat))
      .then((ch) => {
        if (!ch) {
          console.log(`Tickets: ID ${ticketCat} introuvable sur le serveur.`);
          return;
        }
        const ok = ch.type === ChannelType.GuildCategory;
        console.log(
          `Tickets: TICKET_CATEGORY_ID → #${ch.name} (type ${ch.type}${ok ? ", OK" : " — PAS une categorie, corrige .env Discloud"})`
        );
      })
      .catch(() => {});
  } else if (!process.env.TICKET_CATEGORY_ID) {
    console.log("Tip: TICKET_CATEGORY_ID ou panel dans un salon sous la categorie Tickets.");
  }
  if (!process.env.TICKET_STAFF_ROLE_IDS) {
    console.log("Tip: TICKET_STAFF_ROLE_IDS (IDs roles modo, separes par virgule) pour voir les tickets.");
  }
  if (!process.env.BIRTHDAY_VIP_ROLE_ID) {
    console.log("Tip: BIRTHDAY_VIP_ROLE_ID pour VIP 5 jours le jour d'anniv.");
  }
  if (!process.env.SUGGESTIONS_CHANNEL_ID) {
    console.log("Tip: SUGGESTIONS_CHANNEL_ID pour /suggest et reactions auto.");
  }
});

client.on(Events.GuildMemberAdd, (...args) => memberJoinEvent.execute(...args));
client.on(Events.GuildMemberRemove, (...args) => memberLeaveEvent.execute(...args));

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId.startsWith("giveaway:enter:")) {
    const messageId = interaction.customId.slice(15);
    const result = addEntrant(messageId, interaction.user.id);

    if (result.reason === "ended") {
      await interaction.reply({
        content: personality.giveaway.enterEnded,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (result.reason === "already") {
      await interaction.reply({
        content: personality.giveaway.enterAlready,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await updateMessage(interaction.client, messageId);
    await interaction.reply({
      content: personality.giveaway.enterOk,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("role:")) {
    const roleId = interaction.customId.slice(5);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({
        content: personality.roles.notFound,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member;
    const has = member.roles.cache.has(roleId);

    try {
      if (has) {
        await member.roles.remove(role);
        await interaction.reply({
          content: personality.roles.removed(role.name),
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await member.roles.add(role);
        await interaction.reply({
          content: personality.roles.added(role.name),
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {
      await interaction.reply({
        content: personality.roles.error,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("poll:")) {
    const [, optionIndex, messageId] = interaction.customId.split(":");
    if (messageId === "placeholder") {
      await interaction.reply({ content: "Reessaie.", flags: MessageFlags.Ephemeral });
      return;
    }
    pollVotes.vote(messageId, interaction.user.id, parseInt(optionIndex, 10));
    await refreshPollMessage(interaction.message);
    await interaction.reply({ content: "Vote enregistre.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.isButton() && interaction.customId === "ticket:open") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await tickets.openTicket(interaction);
      if (!result.ok) {
        await interaction.editReply({ content: result.reason });
        return;
      }
      const link = result.channelId ? `<#${result.channelId}>` : `${result.channel}`;
      await interaction.editReply({
        content: result.warn || `Ticket cree : ${link}`,
      });
    } catch (err) {
      console.error("[ticket:open]", err);
      await interaction
        .editReply({
          content: `Erreur apres creation du ticket : ${err.message || "inconnue"}`,
        })
        .catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === "ticket:close") {
    try {
      const result = await tickets.closeTicket(interaction);
      if (!result.ok) {
        await interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
      }
    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: personality.errors.command, flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("bj:")) {
    const [, action, gameId] = interaction.customId.split(":");
    await interaction.deferUpdate().catch(() => {});
    const result =
      action === "hit"
        ? blackjack.hit(gameId, interaction.user.id)
        : blackjack.stand(gameId, interaction.user.id);

    if (!result.ok) {
      await interaction.followUp({ content: result.reason, flags: MessageFlags.Ephemeral }).catch(() => {});
      return;
    }

    if (result.done) {
      await economyLog.logCasino(interaction.client, interaction.user.id, "blackjack", result);
      gamblingProgress.recordCasinoRound(interaction.user.id, "blackjack", {
        bet: result.bet,
        net: (result.win || 0) - result.bet,
        won: Boolean(result.win && result.win > result.bet),
      });
      rememberCasinoPlay(interaction.user.id, {
        game: "blackjack",
        choice: "none",
        number: null,
        bet: result.bet,
      });
      await interaction.editReply({
        embeds: [result.embed],
        components: buildCasinoResultRows(),
      });
      if (interaction.channel?.isTextBased()) {
        await interaction.channel
          .send({
            embeds: embedsWithPlayerName(interaction.user, [result.embed]),
            components: [],
          })
          .catch(() => {});
      }
      return;
    }

    await interaction.editReply({
      embeds: [result.embed],
      components: [result.row],
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("money:panel:")) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleMoneyPanelButton(interaction);
    return;
  }

  if (interaction.isButton() && interaction.customId === "casino:panel:jackpot") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoPanelButton(interaction);
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "casino:panel:select") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoPanelSelect(interaction);
    return;
  }
  if (interaction.isStringSelectMenu() && interaction.customId === "casino:config:choice") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoConfigChoice(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId === "casino:config:play") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoConfigPlay(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId === "casino:samebet") {
    if (!(await replyIfWrongChannel(interaction))) return;
    try {
      await handleCasinoSameBet(interaction);
    } catch (err) {
      console.error("[casino:samebet]", err);
    }
    return;
  }
  if (interaction.isButton() && interaction.customId === "casino:replay") {
    if (!(await replyIfWrongChannel(interaction))) return;
    try {
      await handleCasinoReplay(interaction);
    } catch (err) {
      console.error("[casino:replay]", err);
    }
    return;
  }
  if (interaction.isButton() && interaction.customId === "casino:other") {
    if (!(await replyIfWrongChannel(interaction))) return;
    try {
      await handleCasinoOtherGame(interaction);
    } catch (err) {
      console.error("[casino:other]", err);
    }
    return;
  }
  if (interaction.isButton() && interaction.customId === "casino:config:cancel") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoConfigCancel(interaction);
    return;
  }
  if (interaction.isStringSelectMenu() && interaction.customId === "casino:pick:select") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleCasinoPickSelect(interaction);
    return;
  }

  if (interaction.isUserSelectMenu() && interaction.customId === "pay:recipient") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handlePayRecipient(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId === "pay:open-modal") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handlePayOpenModal(interaction);
    return;
  }
  if (interaction.isModalSubmit() && interaction.customId === "pay:form") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handlePayFormSubmit(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId.startsWith("money:bank:")) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleBankOpenModal(interaction);
    return;
  }
  if (interaction.isModalSubmit() && interaction.customId === "money:bank:modal:borrow") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleBankBorrowModal(interaction);
    return;
  }
  if (interaction.isModalSubmit() && interaction.customId === "money:bank:modal:repay") {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleBankRepayModal(interaction);
    return;
  }
  if (
    interaction.isButton() &&
    (interaction.customId.startsWith("pay:confirm:") ||
      interaction.customId.startsWith("pay:cancel:"))
  ) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handlePayConfirm(interaction);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("casino:play:")) {
    if (!(await replyIfWrongChannel(interaction))) return;
    try {
      await handleCasinoModalSubmit(interaction);
    } catch (err) {
      console.error("[casino:modal]", err);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("shop:buy:")) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleShopBuyButton(interaction);
    return;
  }
  if (
    interaction.isButton() &&
    (interaction.customId.startsWith("shop:confirm:") ||
      interaction.customId.startsWith("shop:cancel:"))
  ) {
    if (!(await replyIfWrongChannel(interaction))) return;
    await handleShopConfirmButton(interaction);
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(err);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const msg = {
      content: personality.errors.command,
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  afk.clearAfk(message.author.id);

  const mentioned = afk.getMentionedAfkUsers(message);
  if (mentioned.length > 0) {
    const lines = mentioned.map(
      ({ user, afk: data }) =>
        `${user.tag} est AFK : **${data.reason}**`
    );
    await message.reply(lines.join("\n")).catch(() => {});
  }

  await suggestions.onSuggestionMessage(message).catch(() => {});

  const xpResult = xp.tryMessageXp(message.author.id);
  if (xpResult?.leveledUp) {
    await message
      .reply(`GG ${message.author} — niveau **${xpResult.after.level}** !`)
      .catch(() => {});
  }

  if (message.mentions.has(client.user)) {
    await message.reply(personality.mentionReply(message.author));
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN manquant dans .env");
  process.exit(1);
}

client.login(token);
