require("dotenv").config({ quiet: true });
const {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  MessageFlags,
} = require("discord.js");
const commandModules = require("./commands");
const memberJoinEvent = require("./events/memberJoin");
const memberLeaveEvent = require("./events/memberLeave");
const { addEntrant, updateMessage, scheduleAll } = require("./lib/giveaways");
const personality = require("./lib/personality");

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
  if (!process.env.WELCOME_CHANNEL_ID) {
    console.log("Tip: WELCOME_CHANNEL_ID pour bienvenue + depart (ou LEAVE_CHANNEL_ID).");
  }
  const { loadRoleIds } = require("./lib/autoRoles");
  if (loadRoleIds().length === 0) {
    console.log("Tip: data/auto-roles.json pour les roles a l'arrivee.");
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
