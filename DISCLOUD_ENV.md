# Variables sur Discloud — mode simple

**Il n’y a pas de menu “+ une variable” dans Settings** (RAM, Auto Restart, etc.).  
C’est pour ça que tu ne trouvais rien.

Discloud lit un fichier **`.env` à la racine** du projet qu’il reçoit (zip ou GitHub).

---

## Méthode 1 — ZIP (la plus simple)

1. Ouvre le dossier `Aspirateur_Connecte` dans l’explorateur Windows.
2. Vérifie que **`.env` est bien à la racine** (à côté de `index.js`, `discloud.config`).
3. Sélectionne **tout** sauf `node_modules` → clic droit → **Compresser vers un fichier ZIP**.
4. Discloud → **+ Upload** → choisis **fichier / ZIP** (pas GitHub).
5. Envoie le zip → attends **Online** → **Restart**.

Ton `.env` du PC part dans le zip. Pas besoin du dashboard “Environment Variables”.

---

## Méthode 2 — GitHub (si tu déploies via GitHub)

Le `.env` sur ton PC **ne part pas** tant qu’il est dans `.gitignore`.

**Une fois :**

```powershell
cd "C:\Users\Sacha Zambiasi\Documents\Code\Aspirateur_Connecte"
git add -f .env
git add .discloudignore
git commit -m "Env pour Discloud"
git push
```

(`git add -f` force l’envoi du `.env` même s’il est ignoré en local.)

Repo **privé** obligatoire si le token est dedans.

Discloud redéploie → lit `.env` à la racine.

Pour **ajouter une variable plus tard** : édite `.env` en local → refais `git add -f .env` → `git push` → restart Discloud.

---

## Contenu de `.env` (exemple)

```env
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
WELCOME_CHANNEL_ID=...
GAMBLING_CHANNEL_ID=...
LEAVE_CHANNEL_ID=
```

Pas d’espaces autour du `=`.
