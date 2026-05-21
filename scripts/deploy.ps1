# Enregistre les slash commands (deploy-commands.js doit exister)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path ".env")) {
    Write-Host ".env introuvable - copie .env.example vers .env et remplis les valeurs." -ForegroundColor Yellow
    exit 1
}

node deploy-commands.js
