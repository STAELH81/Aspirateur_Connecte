# Aspirateur Connecte

Bot Discord fait maison pour le serveur **Les Girlsss**. Le nom est volontairement absurde : ce n’est pas un aspirateur, c’est un bot de modération légère, commu, giveaways, rôles et petite économie avec casino.

Ce README est écrit pour quelqu’un qui découvre le projet sans connaître l’historique du serveur.

---

## Sommaire

1. [À quoi sert ce bot ?](#à-quoi-sert-ce-bot-)
2. [Pour les membres du serveur](#pour-les-membres-du-serveur)
3. [Économie et casino](#économie-et-casino)
4. [Pour les admins / modo](#pour-les-admins--modo)
5. [Fonctionnement automatique](#fonctionnement-automatique)
6. [Installation (développeur)](#installation-développeur)
7. [Hébergement 24/7 (Discloud)](#hébergement-247-discloud)
8. [Structure du code](#structure-du-code)
9. [Fichiers de configuration](#fichiers-de-configuration)
10. [Mettre à jour le bot](#mettre-à-jour-le-bot)

---

## À quoi sert ce bot ?

| Besoin | Solution dans le bot |
|--------|----------------------|
| Accueillir / dire au revoir | Messages auto arrivée & départ |
| Rôles jeux & notifs | Panels boutons (`/roles`) + rôles auto à l’arrivée |
| Tirages au sort, VIP, etc. | `/giveaway` avec attribution de rôle possible |
| Sondages, infos membres | `/poll`, `/avatar`, `/userinfo` |
| Anniversaires de la commu | `/anniv` |
| Coins & mini-jeux | `/money`, `/casino` |
| Remplacer d’anciens bots | YAGPDB (rôles), GiveawayBot (giveaways) — optionnel |

Sur Discord, tape **`/help`** pour la liste à jour dans le serveur.

---

## Pour les membres du serveur

### Commu & fun

| Commande | Description |
|----------|-------------|
| `/ping` | Vérifie que le bot répond |
| `/girlsss [texte]` | Envoie un message (défaut : « Les Girlsss ») |
| `/random` | Phrase aléatoire |
| `/choose` | Choisit au hasard entre 2 à 5 options |
| `/avatar [membre]` | Affiche une photo de profil |
| `/userinfo [membre]` | Infos compte + rôles sur le serveur |
| `/poll` | Crée un sondage avec réactions |
| `/help` | **Liste complète** (2 embeds) |

### Anniversaires

| Commande | Description |
|----------|-------------|
| `/anniv ajouter` | Enregistre ton jour et mois d’anniversaire |
| `/anniv liste` | Anniversaires dans les 30 prochains jours |

### Interaction sans slash

- **@mentionner le bot** → il répond bonjour
- **Arrivée sur le serveur** → message de bienvenue + rôles de base (silencieux)
- **Départ** → message dans le salon configuré

---

## Économie et casino (salon **#gambling** uniquement)

Toutes les commandes **`/money`** et **`/casino`** ne fonctionnent que dans le salon dont l’ID est dans `GAMBLING_CHANNEL_ID`.

Monnaie : **coins**. Chaque membre commence avec **100 coins** à la première utilisation de `/money` dans ce salon.

### `/money`

| Commande | Détail |
|----------|--------|
| `/money daily` | **80–150 coins**, une fois toutes les **24 h** |
| `/money work` | **15–45 coins**, cooldown **45 min** |
| `/money pay` | Envoyer des coins à un autre membre |
| `/money balance` | Voir ton solde (ou celui de quelqu’un) |
| `/money top` | Classement des plus riches |

### `/casino`

| Commande | Détail |
|----------|--------|
| `/casino coinflip` | Pile ou face — gain **×1,9** si tu gagnes |
| `/casino slots` | Machine à sous — symboles rares (💎, 7️⃣) paient plus |

**Limites anti-abus :**

- Mise minimum : **10 coins**
- Mise maximum : **25 %** de ton solde, plafonnée à **500 coins**
- L’économie est faite pour être fun, pas pour devenir riche infiniment : farm avec `daily` / `work`, gamble avec modération.

Les soldes sont stockés dans `data/economy.json` sur la machine qui fait tourner le bot (voir hébergement).

---

## Pour les admins / modo

| Commande | Qui | Description |
|----------|-----|-------------|
| `/clear` | Modo | Supprime 1–100 messages dans le salon |
| `/roles menu:jeux` | Admin | Poste le panel rôles jeux (Valorant, MC, etc.) |
| `/roles menu:notifs` | Admin | Poste le panel events / sorties |
| `/giveaway start` | Admin | Lance un giveaway (durée : `30s`, `10m`, `1h`, `2d`…) |
| `/giveaway end` | Admin | Termine avant la fin (ID du message) |
| `/giveaway reroll` | Admin | Nouveau tirage sur un giveaway fini |
| `/giveaway liste` | Admin | Giveaways actifs + leurs IDs |

**Giveaway avec rôle en lot :**

```
/giveaway start lot:VIP role:@RoleVIP duree:1h gagnants:1
```

Le bot peut **attribuer le rôle automatiquement** au gagnant si son rôle est **au-dessus** du rôle à donner dans les paramètres du serveur.

---

## Fonctionnement automatique

### Variables d’environnement (`.env`)

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `DISCORD_TOKEN` | Oui | Token du bot (portail développeur) |
| `DISCORD_GUILD_ID` | Oui | ID du serveur (pour enregistrer les `/`) |
| `WELCOME_CHANNEL_ID` | Non | Salon bienvenue + départs par défaut |
| `LEAVE_CHANNEL_ID` | Non | Salon départs uniquement (sinon = bienvenue) |
| `GAMBLING_CHANNEL_ID` | Recommandé | Salon **#gambling** — `/money` et `/casino` uniquement ici |

Sans cette variable, `/money` et `/casino` fonctionnent partout (déconseillé).

### Fichiers `data/`

| Fichier | Rôle |
|---------|------|
| `auto-roles.json` | IDs des rôles donnés **à chaque arrivée** (ex. Membre) |
| `self-roles.json` | Rôles des panels `/roles` (jeux, notifs) |
| `quotes.json` | Citations pour `/random` |
| `birthdays.json` | Anniversaires enregistrés |
| `giveaways.json` | Giveaways en cours (interne) |
| `economy.json` | Soldes des membres (interne) |

Exemples : `*.example.json` dans `data/`.

### Intents Discord (portail → Bot)

- **Message Content** — lire les @mentions
- **Server Members Intent** — arrivées, départs, rôles auto

---

## Installation (développeur)

**Prérequis :** [Node.js](https://nodejs.org/) 20 ou 22, compte Discord, droits admin sur le serveur de test.

```powershell
git clone https://github.com/STAELH81/Aspirateur_Connecte.git
cd Aspirateur_Connecte
copy .env.example .env
# Remplir DISCORD_TOKEN, DISCORD_GUILD_ID, WELCOME_CHANNEL_ID
npm install
npm run deploy
npm start
```

Ou sous Windows :

```powershell
.\scripts\setup.ps1
.\scripts\deploy.ps1
.\scripts\start.ps1
```

**Important :** un seul processus par token. Si le bot tourne sur Discloud, ne lance pas `npm start` en local en même temps.

---

## Hébergement 24/7 (Discloud)

Le repo contient `discloud.config` pour [Discloud](https://discloud.com).

1. Push le code sur GitHub (sans `.env`, sans `node_modules/`)
2. Créer l’app Discloud liée au repo
3. Variables d’environnement (voir [Ajouter des variables sur Discloud](#ajouter-des-variables-sur-discloud))  
   `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `WELCOME_CHANNEL_ID`, `GAMBLING_CHANNEL_ID` (+ `LEAVE_CHANNEL_ID` si besoin)
4. Déploiement auto au push (selon ton réglage)
5. **`npm run deploy`** en local après chaque **nouvelle commande slash** (Discord ne les découvre pas seul)

### Ajouter des variables sur Discloud (important)

**L’onglet Settings de ton app (RAM, Auto Restart, CMD Start…) ne contient pas les variables d’environnement.** C’est normal sur Discloud quand tu déploies via **GitHub**.

Le `.env` de ton PC **n’est pas** envoyé :
- il est dans `.gitignore` (pas sur GitHub)
- il est dans `.discloudignore` (pas dans le zip Discloud)

#### Méthode recommandée : redéployer via GitHub avec les variables

1. Dashboard Discloud → bouton **+ Upload** (en haut à droite)  
2. Choisis **GitHub** (pas le zip)  
3. Sélectionne le repo **STAELH81/Aspirateur_Connecte**  
4. **Avant de valider**, tu dois voir une section **Environment Variables** (clé / valeur)  
5. Ajoute **chaque** ligne comme dans ton `.env` local :

   | Name | Value |
   |------|--------|
   | `DISCORD_TOKEN` | token du bot |
   | `DISCORD_GUILD_ID` | id du serveur |
   | `WELCOME_CHANNEL_ID` | id salon bienvenue |
   | `GAMBLING_CHANNEL_ID` | id salon #gambling |
   | `LEAVE_CHANNEL_ID` | (optionnel) |

6. Valide le déploiement → **Restart** l’app si besoin  

Si tu ne vois toujours pas « Environment Variables », regarde l’onglet **Commit** (config du lien GitHub) ou le menu **GitHub Integration** dans la barre latérale du dashboard.

#### Alternative (repo privé uniquement)

Commiter un fichier `.env` à la racine du repo **privé** et retirer `.env` de `.discloudignore` — Discloud le lira au deploy. **Déconseillé** si le repo peut devenir public un jour.

| Action | Auto sur Discloud ? |
|--------|---------------------|
| Changement de code (`git push`) | Souvent oui (redéploi) |
| Nouvelle commande `/` | **Non** → `npm run deploy` |
| Changement `.env` sur Discloud | Redémarrer l’app |

---

## Structure du code

```
Aspirateur_Connecte/
├── index.js              # Connexion Discord, events, boutons
├── deploy-commands.js    # Enregistre les slash commands sur le serveur
├── commands/             # Une fichier = une commande / groupe de sous-commandes
├── events/               # Arrivée / départ membres
├── lib/                  # Logique partagée (economie, casino, giveaways…)
├── data/                 # JSON config + donnees runtime
├── scripts/              # setup.ps1, deploy.ps1, start.ps1 (Windows)
├── discloud.config       # Config hebergeur
└── TUTORIAL.md           # Guide pas a pas (premiere install)
```

**Ajouter une commande :**

1. Créer `commands/macmd.js`
2. L’ajouter dans `commands/index.js`
3. Mettre à jour **`lib/personality.js` → `helpEmbeds()`** (obligatoire pour `/help`)
4. `npm run deploy` puis push / redémarrage

---

## Fichiers de configuration

### `data/auto-roles.json`

```json
{
  "roles": ["ID_ROLE_MEMBRE", "ID_ROLE_AUTRE"]
}
```

Mode développeur → clic droit sur un rôle → Copier l’identifiant du rôle.

### `data/self-roles.json`

Menus affichés par `/roles menu:jeux` et `menu:notifs`. Même principe d’IDs.

### `lib/economyConfig.js`

Tous les réglages économie : gains daily/work, limites de mise, multiplicateurs slots/coinflip. Modifier ici pour équilibrer le serveur.

---

## Mettre à jour le bot

```powershell
# 1. Code
git add .
git commit -m "Description du changement"
git push

# 2. Slash commands (si nouvelle commande ou sous-commande)
npm run deploy

# 3. Discloud : attendre Online, ou Play si arrêté
```

**Checklist `/help` :** à chaque nouvelle feature, éditer `helpEmbeds()` dans `lib/personality.js`.

---

## Liens

- [discord.js](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [TUTORIAL.md](./TUTORIAL.md) — première installation détaillée

---

## Licence

ISC — projet perso commu Les Girlsss.
