@echo off
setlocal
cd /d "%~dp0.."

if not exist "package.json" (
  call npm init -y
)

call npm install

if not exist ".env" if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
  echo Fichier .env cree depuis .env.example - remplis DISCORD_TOKEN et DISCORD_GUILD_ID.
)

echo OK - dependances installees.
endlocal
