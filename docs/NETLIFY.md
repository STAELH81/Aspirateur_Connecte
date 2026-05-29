# Netlify — dashboard Les Girlsss

Le site est **statique** dans `dashboard/public/`. Les stats viennent de `stats.json`, mis a jour par le bot Discord.

## 1. Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Repo `Aspirateur_Connecte`
3. Netlify lit `netlify.toml` automatiquement (publish = `dashboard/public`)
4. Deploy

URL du type `https://ton-site.netlify.app`

## 2. Sync auto (recommande)

Sur **Discloud** (.env du bot), ajoute un [GitHub PAT](https://github.com/settings/tokens) avec scope **repo** :

```env
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=STAELH81
GITHUB_REPO=Aspirateur_Connecte
GITHUB_REPO_BRANCH=main
```

Puis sur Discord (staff) :

```
/dashboard sync
```

Le bot pousse `dashboard/public/stats.json` sur GitHub → Netlify redeploie (1–2 min).

Sans GitHub : `npm run dashboard:export` en local, commit + push, Netlify redeploie.

Le bot peut aussi sync toutes les **6 h** si `GITHUB_TOKEN` est present.

## 3. Commandes utiles

| Commande | Role |
|----------|------|
| `/dashboard sync` | Met a jour le site (staff) |
| `/gazette test` | Test gazette dans #gambling |
| `/gazette preview date:29/05/2025` | Apercu sans publier |

## 4. Coop v1

`/coop status` — objectif serveur : **30** parties casino / jour → **25** coins pour ceux qui ont joue.

Plus tard : bingo, pot commun, etc.
