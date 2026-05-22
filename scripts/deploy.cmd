@echo off
setlocal
cd /d "%~dp0.."

if not exist ".env" (
  echo .env introuvable - copie .env.example vers .env et remplis les valeurs.
  exit /b 1
)

if not exist "node_modules\discord.js" (
  echo node_modules manquant. Lance d'abord : bot.cmd setup
  exit /b 1
)

node deploy-commands.js
endlocal
