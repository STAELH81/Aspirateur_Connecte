$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm introuvable. Installe Node.js : https://nodejs.org/"
  exit 1
}

npm install

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Fichier .env cree depuis .env.example - remplis les valeurs."
}

Write-Host "OK - dependances installees."
