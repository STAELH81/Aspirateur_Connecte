# Changer de PC (dev local)

Ne mets **pas** le `.env` ni les `data/*.json` sur une branche Git, même privée : un repo public par erreur = token volé.

## Avant de quitter l’ancien PC

```powershell
cd "C:\chemin\vers\Aspirateur_Connecte"
.\scripts\export-dev.ps1
```

Ça remplit `dev-bundle/` avec `.env` + les fichiers `data/` locaux.

Copie **`dev-bundle/`** (ou un zip) sur clé USB, Google Drive, etc.

Le code : `git push` sur GitHub comme d’habitude.

## Sur le nouveau PC

```powershell
git clone https://github.com/STAELH81/Aspirateur_Connecte.git
cd Aspirateur_Connecte
.\scripts\setup.ps1
# Colle dev-bundle/ a la racine du projet
.\scripts\import-dev.ps1
.\scripts\deploy.ps1
.\scripts\start.ps1
```

`dev-bundle/` est dans `.gitignore` — il ne part jamais sur GitHub.

PowerShell bloque les scripts ? → [scripts/WINDOWS.md](scripts/WINDOWS.md)

## Discloud (prod)

Le bot tourne sur Discloud. Sur le nouveau PC tu codes et tu `git push` — pas besoin de `start.ps1` au quotidien.
