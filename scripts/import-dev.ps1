$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root "dev-bundle"

if (-not (Test-Path $bundle)) {
  Write-Host 'dev-bundle/ introuvable - lance export-dev.ps1 sur l ancien PC avant.'
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
Write-Host 'OK - .\scripts\setup.ps1 puis .\scripts\deploy.ps1 puis .\scripts\start.ps1'
