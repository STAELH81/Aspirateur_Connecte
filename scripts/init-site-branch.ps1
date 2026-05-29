# Branche site pour Netlify - a lancer UNE FOIS en local
# Usage : .\scripts\init-site-branch.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$branch = "site"
if ($env:GITHUB_SITE_BRANCH) {
  $branch = $env:GITHUB_SITE_BRANCH
}

$staging = Join-Path $env:TEMP "aspirateur-site-staging"
$required = @(
  "dashboard\public\index.html",
  "dashboard\public\stats.json",
  "dashboard\site\netlify.toml"
)

foreach ($f in $required) {
  if (-not (Test-Path $f)) {
    Write-Host "Erreur : $f introuvable. Branche main a jour ?" -ForegroundColor Red
    exit 1
  }
}

Write-Host "Branche cible : $branch" -ForegroundColor Cyan
git fetch origin 2>$null

$exists = git ls-remote --heads origin $branch
if ($exists) {
  Write-Host "La branche $branch existe deja sur GitHub." -ForegroundColor Yellow
  Write-Host 'Netlify : import repo, branche site, publish racine.'
  exit 0
}

Write-Host "Copie des fichiers du site..." -ForegroundColor Green
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $staging | Out-Null
Copy-Item "dashboard\public\index.html" (Join-Path $staging "index.html")
Copy-Item "dashboard\public\stats.json" (Join-Path $staging "stats.json")
Copy-Item "dashboard\site\netlify.toml" (Join-Path $staging "netlify.toml")

$prevBranch = git branch --show-current
try {
  Write-Host "Creation branche $branch ..." -ForegroundColor Green
  git checkout --orphan $branch
  git rm -rf . 2>$null

  Copy-Item (Join-Path $staging "index.html") "index.html"
  Copy-Item (Join-Path $staging "stats.json") "stats.json"
  Copy-Item (Join-Path $staging "netlify.toml") "netlify.toml"

  git add index.html stats.json netlify.toml
  git commit -m "init: site Netlify dashboard Les Girlsss"
  git push -u origin $branch
}
finally {
  git checkout main 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    git checkout $prevBranch 2>&1 | Out-Null
  }
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "OK branche site creee sur GitHub." -ForegroundColor Green
Write-Host 'Netlify : import repo, branche site, publish racine.' -ForegroundColor Cyan
