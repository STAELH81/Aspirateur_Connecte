# Aspirateur_Connecte

Bot Discord pour la commu **Les Girlsss**.

## Demarrage rapide

1. [Discord Developer Portal](https://discord.com/developers/applications) — voir [TUTORIAL.md](./TUTORIAL.md)
2. Intents a activer : **Message Content** + **Server Members** (bienvenue)
3. `.env` : `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, optionnel `WELCOME_CHANNEL_ID`

```powershell
.\scripts\deploy.ps1
.\scripts\start.ps1
```

## Commandes

| Commande | Qui |
|----------|-----|
| `/ping`, `/girlsss`, `/random`, `/help` | Tous |
| `/avatar`, `/userinfo`, `/poll` | Tous |
| `/anniv ajouter`, `/anniv liste` | Tous |
| `/giveaway start/end/reroll/liste` | Admin — remplace GiveawayBot |
| `/clear` | Admin / modo (Gerer les messages) |
| `/roles` | Admin (poste le panel de roles) |
| @bot | Salut personnalise |

## Roles auto (remplace YAGPDB)

Comme tes anciens menus YAGPDB : `/roles menu:jeux` et `/roles menu:notifs`. Edite `data/self-roles.json` (remplace `REMPLACER_*` par les vrais IDs de roles), role du bot **au-dessus** des roles qu'il donne.

## Arrivee / depart

- `.env` : `WELCOME_CHANNEL_ID` (salon bienvenue + depart par defaut)
- Optionnel : `LEAVE_CHANNEL_ID` (autre salon pour les departs)
- `data/auto-roles.json` : IDs des roles donnes **automatiquement** a l'arrivee (ex. Membre). Voir `auto-roles.example.json`. Role du bot **au-dessus** de ces roles.

## Structure

```
commands/   lib/   events/   data/   scripts/
```

Ne commite jamais `.env`.

## Hebergement Discloud

1. Push sur GitHub (avec `discloud.config` a la racine)
2. [Discloud](https://discloud.com) → deploy depuis le repo `STAELH81/Aspirateur_Connecte`
3. Variables d'environnement : `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `WELCOME_CHANNEL_ID`
4. Apres le premier demarrage, lance une fois `npm run deploy` en local pour les slash commands (ou depuis le terminal Discloud)
