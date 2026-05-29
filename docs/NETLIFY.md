# Netlify — dashboard Les Girlsss

Le bot vit sur **`main`** (Discloud). Le site vit sur la branche **`site`** — Netlify n'importe que celle-la.

## Pourquoi une branche separee ?

- Netlify ne deploie **que** le site (pas le code du bot)
- `main` reste propre pour Discloud
- `/dashboard sync` met a jour **`site`** automatiquement

## 1. Creer la branche `site` (une fois)

```powershell
cd "C:\Users\Sacha Zambiasi\Documents\Code\Aspirateur_Connecte"
.\scripts\init-site-branch.ps1
```

Ca cree une branche **orphan** avec seulement :

```
index.html
stats.json
netlify.toml
```

## 2. Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Repo `Aspirateur_Connecte`
3. **Branch to deploy** : `site` (pas `main`)
4. **Publish directory** : `/` (racine) — ou laisse Netlify lire `netlify.toml`
5. Deploy

## 3. Sync depuis le bot (Discloud .env)

[GitHub PAT](https://github.com/settings/tokens) scope **repo** :

```env
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=STAELH81
GITHUB_REPO=Aspirateur_Connecte
GITHUB_SITE_BRANCH=site
```

Puis Discord (staff) :

```
/dashboard sync
```

Le bot pousse sur **`site`** : `stats.json`, `index.html`, `netlify.toml` → Netlify redeploie (~1–2 min).

Sync auto toutes les **6 h** si `GITHUB_TOKEN` est present.

## 4. Modifier le design du site

1. Edite `dashboard/public/index.html` sur **`main`**
2. Commit + push `main`
3. `/dashboard sync` pour recopier sur **`site`**

## 5. Commandes utiles

| Commande | Role |
|----------|------|
| `/dashboard sync` | Met a jour la branche `site` (staff) |
| `/gazette test` | Test gazette dans #gambling |
| `/gazette preview date:29/05/2025` | Apercu sans publier |
