$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "index.js")) {
  Write-Host "index.js introuvable."
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-Host ".env introuvable — ajoute DISCORD_TOKEN."
  exit 1
}

if (-not (Test-Path "node_modules\discord.js")) {
  Write-Host "node_modules manquant. Lance d'abord : .\scripts\setup.ps1"
  exit 1
}

node index.js
