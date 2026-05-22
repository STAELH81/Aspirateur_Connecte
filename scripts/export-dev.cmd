@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

set "BUNDLE=dev-bundle"
if not exist "%BUNDLE%" mkdir "%BUNDLE%"

set COPIED=0
for %%F in (
  ".env"
  "data\birthdays.json"
  "data\economy.json"
  "data\economy.json.backup.json"
  "data\giveaways.json"
  "data\birthday-announce-state.json"
  "data\xp.json"
  "data\afk.json"
  "data\jackpot.json"
  "data\quotes-pending.json"
  "data\shop-roles.json"
  "data\birthday-vip.json"
) do (
  if exist "%%~F" (
    set "DEST=%BUNDLE%\%%~F"
    for %%D in ("!DEST!") do mkdir "%%~dpD" 2>nul
    copy /Y "%%~F" "!DEST!" >nul
    echo   + %%~F
    set /a COPIED+=1
  )
)

echo.
echo OK - %COPIED% fichier(s) dans dev-bundle\
echo Copie dev-bundle\ sur USB/Drive, puis sur le nouveau PC : scripts\import-dev.cmd
endlocal
