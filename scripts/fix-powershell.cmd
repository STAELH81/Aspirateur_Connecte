@echo off
echo Autorise npm et scripts PowerShell pour TON compte (pas besoin d'admin)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force"
if errorlevel 1 (
  echo Echec. Utilise quand meme les .cmd :  bot.cmd deploy
  exit /b 1
)
echo OK. Tu peux maintenant taper npm install dans PowerShell.
pause
