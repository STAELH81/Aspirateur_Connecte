# Variables sur Discloud (app **déjà** en ligne)

## Ce que tu as vu la première fois

Le formulaire **Name** / **Value** sur le site = étape **uniquement** quand tu **crées** l’app (**+ Upload → GitHub**).

**Ne refais pas ça** pour modifier les variables : Discloud crée une **nouvelle** application (deux bots, deux factures, conflit de token).

---

## Que faire avec la app en double ?

1. Dashboard → ouvre la **nouvelle** app (celle créée à l’instant).
2. **Stop** puis **Delete** / supprimer l’app.
3. Garde **une seule** app : celle qui était déjà là avant (souvent la plus ancienne, avec l’historique de logs).

---

## Modifier les variables sur l’app **originale** (sans formulaire)

Discloud ne propose en général **pas** d’éditeur visuel dans **Settings** après coup. Deux façons qui **mettent à jour la même app** :

### Option A — `git push` (si l’app est liée à GitHub)

Ton `.env` local est déjà bon ? Envoie-le au deploy Discloud (repo **privé** obligatoire) :

```powershell
cd "C:\Users\Sacha Zambiasi\Documents\Code\Aspirateur_Connecte"
git add -f .env
git commit -m "Config Discloud: variables d'environnement"
git push
```

Discloud redéploie **la même** app. Puis **Restart** sur le dashboard si le bot ne repart pas tout seul.

### Option B — onglet **Commit** (ZIP sur l’app existante)

1. Ouvre **l’ancienne** app (pas + Upload).
2. Onglet **Commit**.
3. ZIP du projet **avec** `.env` à la racine (à côté de `discloud.config`), **sans** `node_modules/`.
4. Envoie le ZIP → **Restart**.

Le `.env` n’est pas dans GitHub (`.gitignore`), mais Discloud le lit s’il est **dans le zip** ou **forcé sur le repo** (option A).

---

## Contenu de ton `.env`

```env
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
WELCOME_CHANNEL_ID=...
GAMBLING_CHANNEL_ID=...
GENERAL_CHANNEL_ID=...
LEAVE_CHANNEL_ID=
```

Vérifie que `GAMBLING_CHANNEL_ID` est bien rempli si tu utilises `/money` et `/casino`.  
`GENERAL_CHANNEL_ID` = salon #general pour l’annonce anniversaire du jour.

---

## Rappel

| Action | Résultat |
|--------|----------|
| **+ Upload → GitHub** | Nouvelle app + formulaire visuel |
| **Commit** (dans l’app) ou **git push** | Met à jour **l’app actuelle** |
| **Settings** | RAM, restart… pas les secrets |

Une seule instance du bot à la fois (pas `start.cmd` en local **et** Discloud avec le même token).
