<!-- STAFF : git push + Discloud APRES le 30/05/2026 21:03 · puis /devlog post fichier:v1.2.10 -->

<!-- MESSAGE 1/2 — copier tout le bloc ci-dessous · ou `/devlog post fichier:v1.2.10` -->

# Aspirateur Connecté — v1.2.10 (1/2)
## Banque & Money — polish

Yo !

Patch **v1.2.10** : quelques fixes demandés par la commu + duels plus flex.

*(Toujours des coins. Pas de vrai argent.)*

---

## Panneau **#banque** — top plus propre

Suggestion **@Viktor** :

- Le **Top coins** n’affiche plus les comptes **jamais touchés** (100 coins de départ, zéro activité)
- Seuls les **comptes actifs** apparaissent : solde qui a bougé, daily/work, prêt, casino, quêtes…
- Toujours **25 max** sur le panneau

---

## Panneau **#money** — tableau & pastilles

- Pastilles **Daily** / **Work** : 🟢 = en cooldown (déjà fait) · 🔴 = dispo — plus bloquées toute la journée
- Tableau membres : noms plus lisibles (pseudos stylés), colonnes **quêtes · coop · daily · work** stabilisées

---

<!-- MESSAGE 2/2 — copier tout le bloc ci-dessous -->

# Aspirateur Connecté — v1.2.10 (2/2)
## Duels & rappels

---

## `/duel @joueur` — objectif libre

Fini le choix forcé **1 / 3 / 5** manches :

1. `/duel @pseudo`
2. Tu choisis le **jeu**, l’**objectif** (**1 à 100 victoires**) et la **mise**
3. **Lui seul** accepte ou refuse (60 s)
4. Escrow **mise × objectif** des deux côtés → le gagnant prend le pot (−5 % jackpot)
5. **Pas de plafond** de manches jouées — ça continue jusqu’à ce que quelqu’un atteigne l’objectif

Ex. objectif **20**, mise **50** → premier à **20** points gagne (même si ça dure 35 manches).

---

## Rappels

| Besoin | Où |
|--------|-----|
| Daily · Work · quêtes · coop · séries | Panneau **#money** |
| Banque · Pay · Prêt · top actifs | Panneau **#banque** |
| Casino · jackpot · **duels** | Panneau **#casino** ou `/casino` · `/duel` |
| Guide complet | Panneau **#infos** |
| Aide commandes | **`/help`** |
| Stats site | **aspirateurconnecte.netlify.app** |

Bug / idée : **#❔-suggestions-❔**

— *Sacha / Aspirateur Connecté*
