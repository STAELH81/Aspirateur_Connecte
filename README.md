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
| Coins & mini-jeux | Panneaux `money/casino/shop/infos/quetes` + `/casino` |
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
| `/help` | **Liste complète** (3 embeds) |

### Anniversaires

| Commande | Description |
|----------|-------------|
| `/anniv ajouter` | Enregistre ton jour et mois d’anniversaire |
| `/anniv liste` | Anniversaires dans les 30 prochains jours |

Le jour J, le bot poste dans `#general` : *Hey ! On souhaite tous l'anniv de … aujourd'hui !* (9h, + au démarrage si pas encore annoncé).

### Interaction sans slash

- **@mentionner le bot** → il répond bonjour
- **Arrivée sur le serveur** → message de bienvenue + rôles de base (silencieux)
- **Départ** → message dans le salon configuré

---

## Économie et casino (salons `money/casino/shop/infos/quetes`)

Le module gambling fonctionne dans les salons autorisés (`GAMBLING_CHANNEL_ID`, `GAMBLING_TEST_CHANNEL_ID`, `GAMBLING_CHANNEL_IDS`) ou dans un salon nommé `money`, `casino`, `shop`, `infos`, `quetes` ou `gambling`.

Monnaie : **coins**. Solde de départ : **100**.

### Panneaux membres

| Panneau | Actions |
|---------|---------|
| **Money** | Daily, Work, Balance, Pay, Banque, Profil, Refresh + top 25 live + lien site |
| **Casino** | Choix du jeu, config, lancer, puis Meme mise, Rejouer, Changer de jeux |
| **Shop** | Achats par boutons avec confirmation |
| **Quêtes** | Quête du jour, barre coop serveur, tableau 🟢🟠🔴 par membre, **Claim quête** / **Claim coop** |
| **Infos** | Guide complet (règles, quêtes, coop, site, Gazette) — embed fixe sans boutons |

### Quête du jour & objectif commu

- **Quête** : tâche aléatoire chaque jour (Daily, Work, parties casino…). Progression automatique. Réclamer avec **Claim quête** sur le panneau Quêtes.
- **Coop** : si le serveur cumule **30** parties casino dans la journée, bonus **+25** coins pour ceux qui ont joué **avant** le cap. Annonce dans le salon **casino**. Réclamer avec **Claim coop** sur le panneau Quêtes.
- **Suivi** : le tableau du panneau Quêtes se met à jour (~1 min). Profil Money / `/userinfo` : une ligne résumé.
- **Rappels** : DM à **20h** si quête terminée non réclamée ou coop claimable.

### Site & Gazette

- **aspirateurconnecte.netlify.app** — top coins, XP, casino du jour, graphiques (sync staff : `/dashboard sync`)
- **La Gazette Du Gamblinnngggg** — recap casino automatique chaque soir **23h59** (salon casino)

### Commandes slash

| Commande | Qui | Détail |
|----------|-----|--------|
| `/casino` | Tout le monde | Ouvre le flow casino interactif |
| `/userinfo [membre]` | Tout le monde | Profil enrichi (économie, casino, quête/coop) |
| `/money admin panel` | Staff | Poste le panneau money |
| `/money admin shop-panel` | Staff | Poste le panneau shop |
| `/money admin infos-panel` | Staff | Poste le panneau infos (guide) |
| `/money admin casino-panel` | Staff | Poste le panneau casino |
| `/quests panel` | Staff | Poste le panneau quêtes (salon quêtes) |
| `/quests refresh` | Staff | Force la maj du panneau quêtes |
| `/gazette test` / `preview` | Staff | Gazette du gambling |
| `/dashboard sync` | Staff | Met à jour le site Netlify |
| `/money admin donner` / `retirer` | Staff | Gestion manuelle des coins |

### Gains et limites

- Daily : **80-150** coins, cooldown **24 h**
- Bonus de streak daily : **+12/jour**, cap **+120**
- Work : **15-45** coins, cooldown **45 min**
- Mise min : **10** coins
- Mise max : **75%** du solde, cap **2000**
- **Banque** (panneau Money) : pret **100–1500** coins (+**20%**), pour jouer au casino. Echeance **7 j**. **Ban casino** si pret en retard jusqu'au remboursement total. Cooldown **48 h** apres solde.

### Jeux disponibles

- Coinflip : gain **x1.9** en cas de win
- Slots : gains variables selon symboles/paires/triples
- Dice : gain **x5** si le nombre est correct
- Roulette 0–9 : rouge/noir **x2** (50 %), vert (0) / numéro précis **x9** (10 % chacun)
- Blackjack : BJ x2.5, win x2, push = mise rendue

### Principe du jackpot

Le jackpot est une cagnotte commune :

1. A chaque bet casino, une taxe de **3%** est prise et ajoutée à la cagnotte.
2. A chaque partie, il existe une petite chance de toucher le jackpot (environ **1/180**).
3. Si un joueur le touche, il récupère toute la cagnotte, puis elle repart de zéro et se re-remplit avec les mises suivantes.

Les soldes sont stockés dans `data/economy.json`.

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
| `GAMBLING_CHANNEL_ID` | Recommandé | Un salon gambling autorisé |
| `GAMBLING_TEST_CHANNEL_ID` | Optionnel | Deuxième salon autorisé (tests) |
| `GAMBLING_CHANNEL_IDS` | Optionnel | Liste CSV d'IDs autorisés |
| `QUESTS_BOARD_CHANNEL_ID` | Recommandé | Salon du panneau quêtes (`/quests panel`) |
| `GENERAL_CHANNEL_ID` | Recommandé | Salon **#general** — annonce auto le jour d’un anniversaire |

Sans variable gambling, fallback par nom de salon (`money/casino/shop/infos/quetes/gambling`).

Changer de PC en dev : [DEV_MIGRATION.md](DEV_MIGRATION.md) (`export-dev.ps1` / `import-dev.ps1`).

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

## Workflow au quotidien

Tu **codes sur ton PC**, le bot **tourne sur Discloud** (24/7). Pas besoin de le lancer en local sauf pour tester.

| Étape | Quoi faire |
|--------|------------|
| 1. Modifier le code | Cursor / VS Code, fichiers `commands/`, `lib/`, etc. |
| 2. Publier sur le serveur | `git add` → `git commit` → `git push` |
| 3. Nouvelle commande `/` | `.\scripts\deploy.ps1` (en local, une fois) — Discord n’update pas les `/` tout seul |
| 4. Nouvelle variable d’env | Éditeur `.env` sur le dashboard Discloud + **Restart** |
| 5. Tester en local *(optionnel)* | Discloud **Stop**, puis `.\scripts\start.ps1` — remets **Start** sur Discloud après |

Le `.env` de ton PC sert surtout à `deploy.ps1` et aux tests locaux ; la prod lit le `.env` **sur Discloud**.

### Routine conseillée (copier/coller)

```powershell
# Les 3 "g" (toujours)
git add .
git commit -m "Gambling: <resume court>"
git push

# Si tu as modifie des slash commands (/ ou sous-commandes)
npm run deploy
```

Exemples de messages de commit :

- `Gambling: ajouter mise max et solde dans la config casino`
- `Casino: corriger le flow UI sur un seul message ephemere`
- `Shop: enrichir les descriptions des items`

---

## Installation (première fois sur un PC)

**Prérequis :** [Node.js](https://nodejs.org/) 20 ou 22.

```powershell
git clone https://github.com/STAELH81/Aspirateur_Connecte.git
cd Aspirateur_Connecte
.\scripts\setup.ps1
copy .env.example .env
# Remplir au moins DISCORD_TOKEN et DISCORD_GUILD_ID (pour deploy.ps1)
.\scripts\deploy.ps1
```

**PowerShell bloque les scripts ?** → [scripts/WINDOWS.md](scripts/WINDOWS.md)

---

## Hébergement (Discloud)

Le bot en prod tourne sur [Discloud](https://discloud.com) — une app déjà créée, liée au repo GitHub.

- **Code** : `git push`
- **Variables** : `.env` sur le dashboard ([DISCLOUD_ENV.md](DISCLOUD_ENV.md))
- **Slash commands** : `.\scripts\deploy.ps1` depuis ton PC après chaque ajout de commande

### Ajouter des variables sur Discloud (important)

**L’onglet Settings de ton app (RAM, Auto Restart, CMD Start…) ne contient pas les variables d’environnement.** C’est normal sur Discloud quand tu déploies via **GitHub**.

Le `.env` de ton PC **n’est pas** sur GitHub tant qu’il est dans `.gitignore`.

Le formulaire visuel **Name / Value** n’apparaît que lors de la **création** (**+ Upload → GitHub**). **Ne refais pas ça** pour changer une variable : ça crée une **deuxième** app. Détails : [DISCLOUD_ENV.md](DISCLOUD_ENV.md).

#### Mettre à jour les variables sur l’app **déjà** en ligne

**Option A — `git push`** (repo **privé**, app déjà liée au repo) :

```powershell
git add -f .env
git commit -m "Config Discloud: variables d'environnement"
git push
```

**Option B — onglet Commit** : ouvre ton app → **Commit** → envoie un ZIP du projet **avec** `.env` à la racine (sans `node_modules/`) → **Restart**.

| Name | Value |
|------|--------|
| `DISCORD_TOKEN` | token du bot |
| `DISCORD_GUILD_ID` | id du serveur |
| `WELCOME_CHANNEL_ID` | id salon bienvenue |
| `GAMBLING_CHANNEL_ID` | id salon #gambling |
| `LEAVE_CHANNEL_ID` | (optionnel) |

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
├── scripts/              # setup.ps1, deploy.ps1, start.ps1 — voir WINDOWS.md
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
# 1. Les 3 g
git add .
git commit -m "Message clair du changement"
git push

# 2. Slash commands (si nouvelle commande/sous-commande/modification de schema)
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
