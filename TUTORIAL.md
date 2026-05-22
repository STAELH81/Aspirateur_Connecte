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
.\scripts\setup.ps1
```

Cree `.env` a la **racine** (ou copie depuis `.env.example`) :

```env
DISCORD_TOKEN=ton_token_ici
DISCORD_GUILD_ID=id_du_serveur_les_girlsss
WELCOME_CHANNEL_ID=id_du_salon_bienvenue
```

**ID du serveur** : Parametres Discord → Avance → Mode developpeur ON → clic droit sur l'icone du serveur → Copier l'identifiant du serveur.

### PowerShell bloque les scripts ?

Voir **[scripts/WINDOWS.md](scripts/WINDOWS.md)** — en resume, une fois :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Puis :

```powershell
.\scripts\setup.ps1
.\scripts\deploy.ps1
.\scripts\start.ps1
```

---

## Etape 4 — Ce qui est deja code

| Fichier | Role |
|---------|------|
| `index.js` | Connexion, slash commands, boutons |
| `deploy-commands.js` | Publie les `/` sur ton serveur |
| `commands/` | Toutes les commandes slash |

Apres chaque **nouvelle** commande : `.\scripts\deploy.ps1` puis relance le bot.

---

## Etape 5 — Mettre en ligne (Discloud)

1. `git push` — le code part sur GitHub, Discloud redéploie
2. Variables : `.env` sur le dashboard Discloud ([DISCLOUD_ENV.md](DISCLOUD_ENV.md))
3. Nouvelle commande `/` : `.\scripts\deploy.ps1` sur ton PC

Le bot tourne sur Discloud. Tu n’as pas besoin de `start.ps1` sauf pour tester (Discloud **Stop** avant).

---

## Tester en local (optionnel)

`.\scripts\start.ps1` puis `/ping` sur Discord. `Ctrl+C` pour arreter, **Start** sur Discloud apres.

---

## Depannage

| Probleme | Solution |
|----------|----------|
| `Used disallowed intents` | Active Message Content Intent (etape 1) |
| `TokenInvalid` | Token dans `.env` a la racine |
| `DISCORD_GUILD_ID manquant` | ID serveur dans `.env` |
| Slash invisibles | `.\scripts\deploy.ps1` |
| `npm` / `.ps1` bloques | [scripts/WINDOWS.md](scripts/WINDOWS.md) |
| Token fuite | Reset Token portail + maj `.env` |

---

## Liens

- [discord.js](https://discord.js.org/)
- [Discord Getting Started](https://discord.com/developers/docs/getting-started)
