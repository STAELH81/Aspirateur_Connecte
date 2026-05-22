@echo off
setlocal
cd /d "%~dp0.."

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd introuvable. Installe Node.js depuis https://nodejs.org/
  exit /b 1
)

if not exist "package.json" (
  call npm.cmd init -y
)

call npm.cmd install

if not exist ".env" if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
  echo Fichier .env cree depuis .env.example - remplis DISCORD_TOKEN et DISCORD_GUILD_ID.
)

echo OK - dependances installees.
endlocal
