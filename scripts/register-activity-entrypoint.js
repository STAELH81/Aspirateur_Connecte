/**
 * Enregistre la commande "Launch" (point d'entrée Activity) sur l'app Discord.
 * Utilise le token Aspirateur Connecte (Les Girlsss), pas BotQuick.
 *
 *   npm run activity:entrypoint:aspirateur
 *   — ou — copy .env.aspirateur .env puis npm run activity:entrypoint
 */
const path = require("path");
const fs = require("fs");
const { REST, Routes } = require("discord.js");

const root = path.join(__dirname, "..");
const useAspirateur =
  process.argv.includes("--aspirateur") || process.argv.includes("-a");
const envPath = useAspirateur
  ? path.join(root, ".env.aspirateur")
  : path.join(root, ".env");

if (!fs.existsSync(envPath)) {
  console.error(`Fichier introuvable : ${envPath}`);
  if (useAspirateur) {
    console.error("Cree .env.aspirateur avec le token Discloud Aspirateur_Connecte.");
  }
  process.exit(1);
}

require("dotenv").config({ path: envPath, quiet: true });
console.log(`Env charge : ${path.basename(envPath)}`);

const token = process.env.DISCORD_TOKEN?.trim();
const expectedAppId =
  process.env.DISCORD_CLIENT_ID?.trim() ||
  process.env.VITE_DISCORD_CLIENT_ID?.trim() ||
  "1507038692748038164";

if (!token) {
  console.error(`DISCORD_TOKEN manquant dans ${path.basename(envPath)}`);
  process.exit(1);
}

const ENTRY_POINT_AUTO = {
  name: "launch",
  description: "Lancer Aspirateur Royale",
  type: 4,
  handler: 2,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  const app = await rest.get(Routes.oauth2CurrentApplication());
  console.log(`App detectee : ${app.name} (id ${app.id})`);

  if (expectedAppId && app.id !== expectedAppId) {
    console.error(
      `ERREUR : ce token ne correspond pas a l'app Activity.\n` +
        `  Token → app id ${app.id}\n` +
        `  Attendu  → ${expectedAppId} (voir activity/.env VITE_DISCORD_CLIENT_ID)\n` +
        "Utilise le DISCORD_TOKEN d'Aspirateur Connecte, pas BotQuick."
    );
    process.exit(1);
  }

  const commands = await rest.get(Routes.applicationCommands(app.id));
  const existing = commands.find((c) => c.type === 4);

  const register = async (body) => {
    if (existing) {
      await rest.patch(Routes.applicationCommand(app.id, existing.id), { body });
      console.log(`Commande mise a jour : /${body.name} (handler ${body.handler})`);
    } else {
      const created = await rest.post(Routes.applicationCommands(app.id), { body });
      console.log(`Commande creee : /${created.name} (handler ${created.handler})`);
    }
  };

  try {
    await register(ENTRY_POINT_AUTO);
    console.log("OK — /launch enregistre (Discord lance l'Activity automatiquement).");
  } catch (err) {
    if (err.code === 50226) {
      console.error(
        "\nDiscord dit : pas d'Activity configuree sur cette app.\n" +
          "AVANT de relancer ce script :\n" +
          "  1. Developer Portal → app ASPIRATEUR CONNECTE (pas BotQuick)\n" +
          "  2. Menu gauche : Activites → MAPPINGS D'URL (pas Parametres)\n" +
          "  3. Ligne : Prefixe /  |  Cible = ton-site.netlify.app (SANS https://)\n" +
          "  4. Enregistrer, puis relancer : npm run activity:entrypoint\n"
      );
      process.exit(1);
    }
    throw err;
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
