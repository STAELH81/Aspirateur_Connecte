# v1.2.8 — brouillon (NE PAS poster, NE PAS push)

Fichier perso pour noter ce qui ira **dans le drop**. Quand tu drops, tu transformes ça en annonce thématique (pas copier-coller tel quel).

**Salon quêtes :** `1510077978091061349` → `.env` : `QUESTS_BOARD_CHANNEL_ID=1510077978091061349` (Discloud aussi, dimanche)

**Drop prévu :** dimanche — annonce rédigée ce jour-là.

---

## Gros morceaux prévus pour le drop

- [ ] **Tableau Quêtes & Coop** — `/quests panel` salon dédié, pastilles 🟢🟠🔴, maj auto
- [ ] **Objectif commu** `/coop` — 30 parties serveur → bonus
- [ ] **Site web** — aspirateurconnecte.netlify.app (top coins, XP, casino du jour)
- [ ] **La Gazette Du Gamblinnnnngggg** — 23h59
- [ ] *(ajoute ici ce que tu veux inclure dans LE drop)*

---

## Déjà codé en local (à inclure ou pas au drop)

- Banque (prêt / remboursement)
- Quête du jour + profil enrichi
- Tickets transcript + fermeture auto inactivité
- Pay plafonds anti-abus
- `/botstatus`, `/gazette`, `/dashboard sync`
- Level-up easter egg owner (secret — pas forcément dans l’annonce)

---

## Pas dans l’annonce publique

- Liste de bugs fixés un par un
- Dates « depuis le X mai »
- `@everyone` écrit dans le markdown

---

## Checklist drop (cocher le jour J)

- [ ] Annonce rédigée → `annonce-v1.2.8-discord.md`
- [ ] `git push`
- [ ] `deploy.ps1` si nouvelles slash
- [ ] Restart Discloud
- [ ] `/dashboard sync` si site
- [ ] `/quests panel` dans le bon salon
- [ ] Poster Discord (4 msgs max)
- [ ] Ping role notifs à la main sur le dernier msg
