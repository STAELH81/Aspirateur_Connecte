# v1.2.8 — brouillon (NE PAS poster, NE PAS push)

Fichier perso pour noter ce qui ira **dans le drop**. Annonce Discord le jour J → `docs/annonce-v1.2.8-discord.md` (nomenclature : `annonce-vX.X.X-discord.md`).

**Salon quêtes :** `1510077978091061349` → `QUESTS_BOARD_CHANNEL_ID` (Discloud aussi le jour du drop)

**Drop prévu :** dimanche — annonce rédigée ce jour-là.

---

## Module drop : Hub Quêtes & Commu

### Panneau Quêtes Center (salon quêtes, staff `/quests panel`)

- [x] Tableau 🟢🟠🔴 par membre (quête + coop)
- [x] Quête du jour affichée (nom + récompense)
- [x] Coop serveur (30 parties) + barre visuelle `████░░`
- [x] **Resume commu** — compteurs 🟢🟠🔴 quête / coop
- [x] Boutons **Claim quete** / **Claim coop** / **Ma quete** / **Refresh**
- [x] Affichage compact (pulse du jour + barre coop courte)
- [x] **Serie quetes** — bonus jusqu'a **+21** coins si claim plusieurs jours d'affilee
- [x] **Ma quete** — suivi perso ephemere (quete + coop + serie)
- [x] 🔥 Meilleure serie visible sur le panneau

### Coop (plus de `/coop`)

- [x] Objectif **30** parties casino serveur → **+25** coins
- [x] Gel éligibilité : joué **avant** le cap seulement
- [x] Annonce auto salon **casino** quand objectif atteint
- [x] Claim sur panneau Quêtes uniquement

### Profil & rappels

- [x] Profil / `/userinfo` : une ligne Quête · Coop → détail panneau
- [x] Rappels DM **20h** si quête ou coop oubliable

### Site (déjà push branche `site`)

- [x] Graphiques Chart.js (top coins, XP, donut coop)
- [ ] `/dashboard sync` prod après drop pour stats à jour

### Infos / doc

- [x] Panneau **Infos** enrichi (quêtes, coop, site, Gazette)
- [x] `/help` + README à jour

### Dev / sécurité local

- [x] `.gitignore` data runtime + backups
- [x] `DASHBOARD_PUSH=0` en local → n'écrase plus Netlify

---

## Déjà en prod ou hors annonce v1.2.8

- Banque, tickets transcript, Pay plafonds, Gazette 23h59, `/botstatus`
- Level-up easter egg owner (secret)
- Money : pas de quêtes (tout migré panneau Quêtes)

---

## Pas dans l'annonce publique

- Liste de bugs fixés un par un
- Dates « depuis le X mai »
- `@everyone` écrit dans le markdown

---

## Checklist drop (jour J)

- [ ] Rédiger **`docs/annonce-v1.2.8-discord.md`** (style v1.2.0, 2–4 msgs)
- [ ] `git push`
- [ ] `.\scripts\deploy.ps1` (slash `/coop` retiré, `/quests` présent)
- [ ] Restart Discloud + `.env` : `QUESTS_BOARD_CHANNEL_ID`, pas `DASHBOARD_PUSH=0` en prod
- [ ] `/quests panel` dans salon quêtes
- [ ] `/money admin infos-panel` dans salon infos
- [ ] `/dashboard sync` (prod)
- [ ] Poster Discord — ping role notifs **à la main** sur le dernier msg

---

## Test local (sans push)

1. Discloud **Stop**
2. `.env` local : `DASHBOARD_PUSH=0`
3. `.\scripts\start.ps1`
4. Fini → `Ctrl+C` → Discloud **Start**
