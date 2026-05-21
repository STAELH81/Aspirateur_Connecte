# Restaure .env + data depuis dev-bundle/ (nouveau PC)
$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root "dev-bundle"

if (-not (Test-Path $bundle)) {
  Write-Host "dev-bundle/ introuvable. Lance export-dev.ps1 sur l'ancien PC d'abord."
  exit 1
}

Get-ChildItem -Path $bundle -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($bundle.Length + 1)
  $dest = Join-Path $root $rel
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $_.FullName $dest -Force
  Write-Host "  -> $rel"
}

Write-Host ""
Write-Host 'OK - npm install puis .\scripts\start.ps1'
