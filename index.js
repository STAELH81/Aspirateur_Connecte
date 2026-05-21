require("dotenv").config({ quiet: true });
const { Client, GatewayIntentBits, Events, Collection } = require("discord.js");
const commandModules = require("./commands");
const welcomeEvent = require("./events/welcome");
const { addEntrant, updateMessage, scheduleAll } = require("./lib/giveaways");

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
  console.log(`Connecte en tant que ${c.user.tag}`);
  scheduleAll(client);
  if (!process.env.WELCOME_CHANNEL_ID) {
    console.log("Tip: WELCOME_CHANNEL_ID dans .env pour les messages de bienvenue.");
  }
});

client.on(Events.GuildMemberAdd, (...args) => welcomeEvent.execute(...args));

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId.startsWith("giveaway:enter:")) {
    const messageId = interaction.customId.slice(15);
    const result = addEntrant(messageId, interaction.user.id);

    if (result.reason === "ended") {
      await interaction.reply({
        content: "Ce giveaway est termine.",
        ephemeral: true,
      });
      return;
    }
    if (result.reason === "already") {
      await interaction.reply({
        content: "Tu es deja inscrit.",
        ephemeral: true,
      });
      return;
    }

    await updateMessage(interaction.client, messageId);
    await interaction.reply({
      content: "Tu es inscrit au giveaway.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("role:")) {
    const roleId = interaction.customId.slice(5);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({ content: "Role introuvable.", ephemeral: true });
      return;
    }

    const member = interaction.member;
    const has = member.roles.cache.has(roleId);

    try {
      if (has) {
        await member.roles.remove(role);
        await interaction.reply({
          content: `Role **${role.name}** retire.`,
          ephemeral: true,
        });
      } else {
        await member.roles.add(role);
        await interaction.reply({
          content: `Role **${role.name}** ajoute.`,
          ephemeral: true,
        });
      }
    } catch {
      await interaction.reply({
        content: "Impossible (role au-dessus du bot ?). Verifie la hierarchie des roles.",
        ephemeral: true,
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
    const { MessageFlags } = require("discord.js");
    const msg = {
      content: "Erreur lors de la commande.",
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
    await message.reply(`Salut ${message.author}`);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN manquant dans .env");
  process.exit(1);
}

client.login(token);
