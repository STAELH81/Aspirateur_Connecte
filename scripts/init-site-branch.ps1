# Branche "site" pour Netlify — a lancer UNE FOIS en local
# Usage : .\scripts\init-site-branch.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$branch = "site"
if ($env:GITHUB_SITE_BRANCH) {
  $branch = $env:GITHUB_SITE_BRANCH
}

Write-Host "Branche cible : $branch" -ForegroundColor Cyan

git fetch origin 2>$null

$exists = git ls-remote --heads origin $branch
if ($exists) {
  Write-Host "La branche $branch existe deja sur GitHub." -ForegroundColor Yellow
  Write-Host "Passe a Netlify : branche site, publish racine."
  exit 0
}

if (-not (Test-Path "dashboard\public\index.html")) {
  Write-Host "Erreur : dashboard\public\index.html introuvable." -ForegroundColor Red
  exit 1
}

Write-Host "Creation de la branche $branch ..." -ForegroundColor Green

git checkout --orphan $branch
git rm -rf . 2>$null

Copy-Item "dashboard\public\index.html" "index.html"
Copy-Item "dashboard\public\stats.json" "stats.json"
Copy-Item "dashboard\site\netlify.toml" "netlify.toml"

git add index.html stats.json netlify.toml
git commit -m "init: site Netlify dashboard Les Girlsss"
git push -u origin $branch

git checkout main

Write-Host ""
Write-Host "OK branche $branch creee sur GitHub." -ForegroundColor Green
Write-Host "Etape suivante : Netlify, import repo, branche = site" -ForegroundColor Cyan
