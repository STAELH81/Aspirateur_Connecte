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

## Bienvenue

Dans `.env`, `WELCOME_CHANNEL_ID` = ID du salon #bienvenue (clic droit → copier l'identifiant du salon).

## Structure

```
commands/   lib/   events/   data/   scripts/
```

Ne commite jamais `.env`.
