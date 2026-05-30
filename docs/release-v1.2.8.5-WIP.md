# v1.2.8.5 — patch correctif (après drop v1.2.8)

**Annonce :** [`annonce-v1.2.8.5-discord.md`](annonce-v1.2.8.5-discord.md) — 1 message court.

## Contenu

- [x] Tableau membres : padding visuel (Unicode / emoji) — plus de décalage pastilles
- [x] Coop serveur : **100** parties/jour (env `COOP_GOAL_GAMES` optionnel)
- [x] Docs / help / infos-panel alignés

## Drop

- [ ] Push + `.\scripts\deploy.ps1` + restart Discloud
- [ ] `/quests refresh` ou attendre maj auto panneau
- [ ] `/money admin infos-panel` si besoin
- [ ] Poster annonce v1.2.8.5 (ping notifs à la main)

## Env prod (optionnel)

```env
COOP_GOAL_GAMES=100
```

Défaut code = **100** sans variable.
