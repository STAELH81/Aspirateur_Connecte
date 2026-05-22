$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root "dev-bundle"

New-Item -ItemType Directory -Force -Path $bundle | Out-Null

$files = @(
  ".env",
  "data\birthdays.json",
  "data\economy.json",
  "data\economy.json.backup.json",
  "data\giveaways.json",
  "data\birthday-announce-state.json",
  "data\xp.json",
  "data\afk.json",
  "data\jackpot.json",
  "data\quotes-pending.json",
  "data\shop-roles.json",
  "data\birthday-vip.json",
  "data\poll-votes.json",
  "data\tickets-open.json"
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
Write-Host 'Copie dev-bundle/ sur USB ou Drive, puis sur le nouveau PC : .\scripts\import-dev.ps1'
