# v1.2.8 — checklist drop (NE PAS push avant le jour J)

**Annonce prête :** [`annonce-v1.2.8-discord.md`](annonce-v1.2.8-discord.md) — style v1.2.0, 3 messages.

**Salon quêtes :** `QUESTS_BOARD_CHANNEL_ID=1510077978091061349` (Discloud le jour du drop)

---

## Checklist drop

- [ ] Relire / ajuster `annonce-v1.2.8-discord.md` si besoin
- [ ] `git push`
- [ ] `.\scripts\deploy.ps1` (`/coop` retiré, `/quests` OK)
- [ ] Restart Discloud — `.env` : `QUESTS_BOARD_CHANNEL_ID`, **pas** `DASHBOARD_PUSH=0`
- [ ] `/quests panel` (salon quêtes)
- [ ] `/money admin infos-panel` (salon infos)
- [ ] `/dashboard sync` (prod)
- [ ] Poster les 3 messages Discord
- [ ] Ping role **@🤖-Notifs Updates Bots-🔔** à la main sur le dernier msg

---

## Test local

1. Discloud **Stop**
2. `.env` : `DASHBOARD_PUSH=0`
3. `.\scripts\start.ps1`
4. Fini → `Ctrl+C` → Discloud **Start**
