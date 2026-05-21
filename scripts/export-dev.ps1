# Exporte .env + data locales (gitignore) pour changer de PC
$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root "dev-bundle"

New-Item -ItemType Directory -Force -Path $bundle | Out-Null

$files = @(
  ".env",
  "data\birthdays.json",
  "data\economy.json",
  "data\giveaways.json",
  "data\birthday-announce-state.json"
)

$copied = 0
foreach ($rel in $files) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) { continue }
  $dest = Join-Path $bundle $rel
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $src $dest -Force
  $copied++
  Write-Host "  + $rel"
}

Write-Host ""
Write-Host "OK - $copied fichier(s) dans dev-bundle/"
Write-Host 'Copie le dossier dev-bundle/ sur USB, Drive ou zip, puis sur le nouveau PC.'
Write-Host 'Puis sur le nouveau PC : .\scripts\import-dev.ps1'
