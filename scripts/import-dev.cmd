@echo off
setlocal
cd /d "%~dp0.."

if not exist "dev-bundle\" (
  echo dev-bundle\ introuvable. Lance export-dev.cmd sur l'ancien PC d'abord.
  exit /b 1
)

xcopy /E /Y /I "dev-bundle\*" "."
echo Fichiers restaures depuis dev-bundle\
echo.
echo OK - lance : scripts\setup.cmd puis scripts\deploy.cmd puis scripts\start.cmd
endlocal
