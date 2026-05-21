# Initialise npm et installe discord.js + dotenv
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path "package.json")) {
    npm init -y
}

npm install

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Fichier .env cree depuis .env.example - remplis DISCORD_TOKEN et DISCORD_GUILD_ID." -ForegroundColor Yellow
}

Write-Host "OK - dependances installees." -ForegroundColor Green
