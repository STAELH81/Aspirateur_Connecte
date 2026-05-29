# Site web Les Girlsss — guide simple

Tu as **2 parties** separees. Ne melange pas tout.

| Quoi | Ou |
|------|-----|
| Bot Discord | branche **main** → Discloud |
| Site web stats | branche **site** → Netlify |

Le **token GitHub** sert seulement si tu veux que le **bot** mette a jour le site tout seul. **Tu peux t'en passer** au debut.

---

## ETAPE 1 — Creer la branche site (5 min, une fois)

Dans PowerShell, dossier du projet :

```powershell
cd "C:\Users\Sacha Zambiasi\Documents\Code\Aspirateur_Connecte"
.\scripts\init-site-branch.ps1
```

Si ca dit **OK branche site creee** → c'est bon.

Si ca dit **existe deja** → c'est bon aussi.

---

## ETAPE 2 — Netlify (10 min, une fois)

1. Va sur [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project** → **GitHub**
3. Choisis le repo **Aspirateur_Connecte**
4. **Important** :
   - **Branch** : `site` (PAS main)
   - **Publish directory** : laisse vide ou `/` (racine)
5. **Deploy site**

Tu obtiens une URL du type `https://quelque-chose.netlify.app`

Le site sera vide ou presque tant que stats.json n'a pas de vraies donnees — normal.

---

## ETAPE 3 — Mettre des stats sur le site

### Option A — SANS token (plus simple)

Sur ton PC :

```powershell
npm run dashboard:export
```

Ca remplit `dashboard/public/stats.json` avec les data de ton PC (si tu as `data/economy.json` en local).

Ensuite repousse sur la branche site a la main :

```powershell
git checkout site
copy dashboard\public\stats.json stats.json
git add stats.json
git commit -m "update stats"
git push
git checkout main
```

Netlify redeploie en 1–2 min.

**Limite** : les stats viennent de ton PC local, pas de Discloud. Pour la prod, voir option B.

### Option B — AVEC token (bot met a jour tout seul)

Seulement quand tu veux l'automatique.

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token (classic)**
2. Coche **repo** (acces au repo)
3. Copie le token (commence par `ghp_...`)

4. Sur **Discloud**, dans le `.env` du bot, ajoute :

```env
GITHUB_TOKEN=ghp_colle_ton_token_ici
GITHUB_REPO_OWNER=STAELH81
GITHUB_REPO=Aspirateur_Connecte
GITHUB_SITE_BRANCH=site
```

5. **Restart** le bot sur Discloud

6. Sur Discord (staff) :

```
/dashboard sync
```

Le bot pousse les stats **de prod** sur la branche `site` → Netlify redeploie.

---

## Recap ultra court

```
1. .\scripts\init-site-branch.ps1     → cree branche site
2. Netlify → repo → branche site      → site en ligne
3. Sans token : export + push manuel
   Avec token : /dashboard sync       → site a jour auto
```

---

## Problemes frequents

**Le script PowerShell plante**  
Relance apres `git pull`. Le script a ete corrige (guillemets).

**Netlify deploy main au lieu de site**  
Site settings → Build & deploy → Branch = `site`

**Site vide**  
Normal sans stats. Fais etape 3.

**Token : ou le mettre ?**  
Uniquement Discloud `.env` du bot, **jamais** dans Discord ni dans le repo git.
