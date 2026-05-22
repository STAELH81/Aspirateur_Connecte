# Changer de PC (dev local)

Ne mets **pas** le `.env` ni les `data/*.json` sur une branche Git, même privée : un repo public par erreur = token volé.

## Avant de quitter l’ancien PC

```bat
cd "C:\chemin\vers\Aspirateur_Connecte"
scripts\export-dev.cmd
```

Ça remplit `dev-bundle/` avec :

- `.env`
- `data/birthdays.json`, `economy.json`, `giveaways.json`, etc.

Copie **`dev-bundle/`** (ou un zip) sur clé USB, Google Drive, etc.

Le code continue sur GitHub comme d’habitude (`git push`).

## Sur le nouveau PC

```bat
git clone https://github.com/STAELH81/Aspirateur_Connecte.git
cd Aspirateur_Connecte
scripts\setup.cmd
rem Colle dev-bundle/ a la racine du projet
scripts\import-dev.cmd
scripts\deploy.cmd
scripts\start.cmd
```

`dev-bundle/` est dans `.gitignore` — il ne part jamais sur GitHub.

## Prod Discloud (plus tard)

Une app prod propre : variables au formulaire de création ou `.env` au deploy. Les données prod sur Discloud ne suivent pas automatiquement ton PC dev.
