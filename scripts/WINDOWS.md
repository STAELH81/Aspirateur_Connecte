# Windows — PowerShell

## Activer les scripts (une fois)

Si `npm` ou les `.ps1` sont bloques (*execution de scripts desactivee*) :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Ferme et rouvre le terminal.

---

## Ce que tu utilises vraiment

| Besoin | Commande |
|--------|----------|
| Premiere install sur ce PC | `.\scripts\setup.ps1` |
| Enregistrer les `/` sur Discord | `.\scripts\deploy.ps1` |
| Tester le bot *(optionnel)* | `.\scripts\start.ps1` |
| Changer de PC | `.\scripts\export-dev.ps1` puis `import-dev.ps1` |

**Au quotidien :** tu codes, tu `git push`, Discloud fait tourner le bot.  
`deploy.ps1` seulement quand tu ajoutes ou modifies une commande slash.

---

## Tester en local (optionnel)

Le bot tourne deja sur Discloud avec le meme token :

1. **Stop** l'app sur Discloud
2. `.\scripts\start.ps1`
3. Quand tu as fini : `Ctrl+C`, puis **Start** sur Discloud

Sinon : conflit (bot qui se connecte / deconnecte en boucle).

Equivalent sans `.ps1` : `npm install`, `npm run deploy`, `npm start`.
