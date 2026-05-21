require("dotenv").config({ quiet: true });
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  console.error("DISCORD_TOKEN manquant dans .env");
  process.exit(1);
}

if (!guildId) {
  console.error("DISCORD_GUILD_ID manquant dans .env (ID du serveur Les Girlss)");
  process.exit(1);
}

const body = commands.map((c) => c.data.toJSON());
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  const app = await rest.get(Routes.oauth2CurrentApplication());
  await rest.put(Routes.applicationGuildCommands(app.id, guildId), { body });
  console.log(`Commandes enregistrees sur le serveur (${body.length}) :`);
  body.forEach((c) => console.log(`  - /${c.name}`));
})();
