@echo off
setlocal
cd /d "%~dp0.."

if not exist "index.js" (
  echo index.js introuvable - voir TUTORIAL.md
  exit /b 1
)

if not exist ".env" (
  echo .env introuvable - ajoute DISCORD_TOKEN
  exit /b 1
)

node index.js
endlocal
