$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) {
  Write-Host ".env introuvable — copie .env.example vers .env et remplis les valeurs."
  exit 1
}

if (-not (Test-Path "node_modules\discord.js")) {
  Write-Host "node_modules manquant. Lance d'abord : .\scripts\setup.ps1"
  exit 1
}

node deploy-commands.js
