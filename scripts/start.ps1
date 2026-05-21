# Lance le bot (index.js doit exister)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path "index.js")) {
    Write-Host "index.js introuvable - cree-le d'abord (voir TUTORIAL.md etape 5)." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host ".env introuvable - ajoute DISCORD_TOKEN (voir TUTORIAL.md etape 4)." -ForegroundColor Yellow
    exit 1
}

node index.js
