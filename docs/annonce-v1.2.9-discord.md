<!-- MESSAGE 1/2 — copier tout le bloc ci-dessous -->

# Aspirateur Connecté — v1.2.9 (1/2)
## Banque & Money — nouveaux panneaux

Yo !

Patch **v1.2.9** : on **sépare** l’économie en **2 salons** plus clairs. Plus de tout mélangé sur un seul panneau.

*(Toujours des coins. Pas de vrai argent.)*

---

## Les 2 salons

| Salon | C’était | Maintenant |
|-------|---------|------------|
| **#banque** | #money | Top coins · Balance · Pay · Profil · **Prêt** |
| **#money** | #quêtes | Daily · Work · quêtes · coop · tableau live |

---

## Panneau **#money** (ex-quêtes)

- Boutons **Daily** et **Work** déplacés ici
- Tableau membres : colonnes **quetes · coop · daily · work** (pastilles 🟢 / 🔴)
- Texte du panneau allégé
- Tes **messages bleus** (Daily, Work, etc.) disparaissent seuls après **~5 min** — salon plus propre

## Panneau **#banque** (ex-money)

- **Top 25** coins toujours là
- **Plus** de Daily / Work ici → va sur **#money**
- Bouton banque renommé **Prêt**

## Coop serveur

- Objectif monté à **250** parties casino / jour (bonus **+25** coins, règle inchangée : jouer **avant** le cap)

---

<!-- MESSAGE 2/2 — copier tout le bloc ci-dessous -->

# Aspirateur Connecté — v1.2.9 (2/2)
## Coop, séries & duels

Yo la suite !

---

## Coop — plus de hype

- **Top coop** affiché sur le panneau **#money** (🥇🥈🥉 + nb de parties du jour)
- **MVP du jour** au cap **250** : **+15 / +10 / +5** coins en **plus** du +25 coop (ligne `bonus = …` au claim)
- Message dans **#casino** à **80 %** (**200/250**) — « plus que X parties »

---

## Paliers série (bouton **#money**)

Série = claim ta **quête du jour** plusieurs jours d’affilée.

| Série | Bonus one-shot |
|-------|----------------|
| **7 j** | **+50** coins |
| **14 j** | **+120** coins |
| **21 j** | **+250** coins |

Bouton **Paliers serie** → voir ta série + claim si tu as le niveau.

*(Le bonus série au claim quête reste : +3/j dès le J2, max +21.)*

---

## `/duel @joueur` — **#casino** only

Tu défies quelqu’un en **coinflip**, **slots** ou **dé** :

1. `/duel @pseudo`
2. Tu choisis le **jeu**, les **manches** (1 / 3 / 5) et la **mise**
3. **Lui seul** peut **Accepter** ou **Refuser** (60 s)
4. Escrow **mise × manches** des deux côtés → le gagnant prend le pot (−5 % jackpot)

Pas de duel solo / bot. Timeout choix = forfait.

---

## Staff

- **`/money admin fermer-parties`** — ferme toutes les parties **blackjack** ouvertes (**sans** remboursement). Si t’as perdu ta partie : c’est la faute du joueur 😅

---

## Rappels

| Besoin | Où |
|--------|-----|
| Daily · Work · quêtes · coop · séries | Panneau **#money** |
| Banque · Pay · Prêt · top coins | Panneau **#banque** |
| Casino · jackpot · **duels** | Panneau **#casino** ou `/casino` · `/duel` |
| Guide complet | Panneau **#infos** |
| Aide commandes | **`/help`** |
| Stats site | **aspirateurconnecte.netlify.app** |

— *Sacha / Aspirateur Connecté*
