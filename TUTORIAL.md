# Tuto : bot Discord pour Les Girlss

Le code du bot est **deja dans ce repo**. Ce guide sert surtout a configurer Discord et ton `.env`.

> Ne partage jamais le token du bot.

---

## Ce dont tu as besoin

- Compte Discord
- [Node.js](https://nodejs.org/) LTS (20 ou 22) — `node -v`
- Droits **Gerer le serveur** sur Les Girlss (ou quelqu'un qui les a)

---

## Etape 1 — Application sur le portail

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. Onglet **Bot** → **Add Bot**
3. **Reset Token** → copie dans `.env` (voir etape 3)
4. **Privileged Gateway Intents** :
   - **Message Content Intent** — @mentions du bot
   - **Server Members Intent** — messages de bienvenue
5. **Save Changes**

---

## Etape 2 — Inviter le bot sur Les Girlss

1. **OAuth2** → **URL Generator**
2. Scopes : `bot` + `applications.commands`
3. Permissions : lire/envoyer messages, utiliser commandes slash
4. Ouvre l'URL, choisis **Les Girlss**, autorise

---

## Etape 3 — Config locale

```powershell
cd "C:\Users\Sacha Zambiasi\Documents\Code\Aspirateur_Connecte"
scripts\setup.cmd
```

Cree `.env` a la **racine** (pas dans `node_modules/`) :

```env
DISCORD_TOKEN=ton_token_ici
DISCORD_GUILD_ID=id_du_serveur_les_girlsss
WELCOME_CHANNEL_ID=id_du_salon_bienvenue
```

**ID du serveur** : Parametres Discord → Avance → Mode developpeur ON → clic droit sur l'icone du serveur → Copier l'identifiant du serveur.

### Scripts PowerShell

Lance depuis le terminal (CMD ou PowerShell) :

```bat
scripts\setup.cmd   rem npm install + .env depuis .env.example si absent
scripts\deploy.cmd    rem enregistre les slash commands sur le serveur
scripts\start.cmd     rem lance le bot
```

Ou avec npm : `npm install` puis `npm run deploy` puis `npm start`.

Si *running scripts is disabled* :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## Etape 4 — Ce qui est deja code

| Fichier | Role |
|---------|------|
| `index.js` | Connexion, slash commands, reponse @mention |
| `deploy-commands.js` | Publie les `/` sur ton serveur (lit `DISCORD_GUILD_ID`) |
| `commands/ping.js` | `/ping` |
| `commands/girlsss.js` | `/girlsss` |
| `commands/help.js` | `/help` |

Apres chaque **nouvelle** commande ou modification de description : `scripts\deploy.cmd` puis relance le bot.

---

## Etape 5 — Tester

1. `scripts\deploy.cmd` — tu dois voir la liste des commandes
2. `scripts\start.cmd` — bot en ligne sur Discord
3. Sur le serveur : `/ping`, `/girlsss`, `/help`, ou @mention du bot

Arret : `Ctrl+C`.

---

## Etape 6 — Idees pour plus tard

| Idee | Difficulte |
|------|------------|
| Message de bienvenue (`GuildMemberAdd`) | Moyen |
| Roles par reaction / boutons | Moyen |
| Blagues en JSON local | Facile |
| Bot 24/7 (Railway, Render, Raspberry) | Optionnel |

Ajoute un fichier dans `commands/`, enregistre-le dans `commands/index.js`, puis `npm run deploy`.

---

## Etape 7 — Hebergement 24/7 (optionnel)

Tant que `node index.js` tourne sur ton PC, le bot est en ligne. Sinon : Railway, Render, Fly.io — variable `DISCORD_TOKEN` + `DISCORD_GUILD_ID` cote hebergeur, commande `node index.js`.

---

## Depannage

| Probleme | Solution |
|----------|----------|
| `Used disallowed intents` | Active Message Content Intent (etape 1) |
| `TokenInvalid` | Token dans `.env` a la racine, pas dans `node_modules/` |
| `DISCORD_GUILD_ID manquant` | Ajoute l'ID serveur dans `.env` |
| Slash invisibles | `scripts\deploy.cmd`, verifie `DISCORD_GUILD_ID` |
| `Missing Access` | Reinvite le bot (etape 2) |
| Token fuite | Reset Token portail + maj `.env` |
| Script bloque | Utilise les `.cmd` dans `scripts\`, pas les `.ps1` |

---

## Liens

- [discord.js](https://discord.js.org/)
- [Discord Getting Started](https://discord.com/developers/docs/getting-started)
