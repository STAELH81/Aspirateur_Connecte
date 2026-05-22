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

## Modifier sur l’app **déjà** en ligne

### Éditeur de fichiers sur le dashboard Discloud

Sur certaines apps, tu peux ouvrir l’app → **fichiers** (ou éditeur intégré) → modifier **`.env`** directement sur le serveur, puis **Restart**.

Pratique pour ajouter une variable vite en prod. Attention : un **`git push`** qui redéploie peut **écraser** ce `.env` si le repo n’a pas les mêmes valeurs — garde ton `.env` local et `.env.example` à jour.

### Autres méthodes (si pas d’éditeur)

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

Une seule instance du bot à la fois (pas `start.ps1` en local **et** Discloud avec le même token).

## Workflow actuel

1. **Coder** sur ton PC (pas besoin de lancer le bot).
2. **`git push`** → Discloud met a jour le code et redemarre.
3. **Nouvelle commande `/`** → `.\scripts\deploy.ps1` sur ton PC (obligatoire).
4. **Nouvelle variable** → editeur `.env` sur le dashboard Discloud + **Restart**.

`.\scripts\start.ps1` = test local seulement (Discloud en **Stop** avant).
