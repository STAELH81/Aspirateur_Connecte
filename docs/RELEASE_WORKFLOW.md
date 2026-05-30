# Workflow releases — style « patch jeu »

Une **version** (v1.2.8, v1.2.9…) = **un drop**, pas un récap de chaque jour où tu as codé.

---

## Principe

| Phase | Toi en local | Prod (Discloud / commu) |
|-------|----------------|-------------------------|
| **Dev** | Tu codes, tu **commit** souvent | Rien ne bouge |
| **Drop** | Tu **push** + deploy + annonce Discord | Tout le monde voit la MAJ d’un coup |

Comme un patch de jeu : les joueurs voient **v1.2.8 — Module Quêtes**, pas « mardi j’ai fix un truc, jeudi un autre ».

---

## Pendant le dev (avant le drop)

1. **Continue à coder** des features pour la version — commits locaux OK.
2. **Ne push pas** → Discloud / commu restent sur l’ancienne version jusqu’au drop.
3. Note les gros morceaux dans `docs/release-vX.Y.Z-WIP.md`.
4. Annonce Discord → **le jour du drop** (pas avant).

---

## Le jour du drop

1. Relire `docs/release-vX.Y.Z-WIP.md` → en faire **une annonce thématique** (comme v1.2.0), pas une liste de commits.
2. Rédiger **`docs/annonce-vX.Y.Z-discord.md`** (2–4 messages, **sans** `@everyone` dans le texte).
3. `git push`
4. `.\scripts\deploy.ps1` si nouvelles commandes slash
5. Restart Discloud + vérif `.env`
6. Poster l’annonce sur Discord (ping role notifs **à la main** sur le dernier message)
7. Vider / archiver le `-WIP.md` → renommer en `release-vX.Y.Z-notes.md` ou supprimer

---

## Annonce Discord : quoi dire / ne pas dire

**Oui — style patch :**
- Un **titre de module** (« Hub Quêtes & Coop », « Site stats », etc.)
- Ce que **les membres** peuvent faire de neuf
- 2–4 messages max, ton Girlsss

**Non — style journal :**
- « Depuis le 27 mai… »
- « Fix ticket », « Fix unknown interaction » en liste
- Une annonce à chaque push

Les fixes techniques → une ligne « stabilité » ou rien.

---

## Versions annonces existantes

| Version | Fichier | Statut |
|---------|---------|--------|
| v1.2.0 | `annonce-v1.2.0-discord.md` | Module Gambling (référence ton) |
| v1.2.6 | `annonce-v1.2.6-discord.md` | Petite MAJ (OK si drop ciblé) |
| v1.2.7 | `annonce-v1.2.7-discord.md` | Plutôt récap — **ne pas reprendre ce format** |
| **v1.2.8** | `release-v1.2.8-WIP.md` → **`annonce-v1.2.8-discord.md` le jour J** | **En cours, pas push** |

---

## Rappel git

```powershell
# Pendant le dev — commit sans push
git add lib/ commands/ docs/   # evite git add . (data locales)
git commit -m "feat: ..."

# Test local sans ecraser le site Netlify
# .env : DASHBOARD_PUSH=0
# Discloud Stop → .\scripts\start.ps1

# Jour du drop seulement
git push
.\scripts\deploy.ps1
```
