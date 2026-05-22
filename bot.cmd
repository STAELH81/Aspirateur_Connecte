@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" goto usage
if /i "%~1"=="setup" goto setup
if /i "%~1"=="deploy" goto deploy
if /i "%~1"=="start" goto start
if /i "%~1"=="install" goto setup
goto usage

:setup
call scripts\setup.cmd
exit /b %errorlevel%

:deploy
call scripts\deploy.cmd
exit /b %errorlevel%

:start
call scripts\start.cmd
exit /b %errorlevel%

:usage
echo.
echo  Aspirateur Connecte — lance depuis CMD (marche meme si PowerShell bloque npm)
echo.
echo    bot.cmd setup     installe les dependances
echo    bot.cmd deploy    enregistre les commandes slash Discord
echo    bot.cmd start     lance le bot
echo.
echo  Dans PowerShell, prefere :  .\bot.cmd deploy
echo  ou :  cmd /c bot.cmd deploy
echo.
exit /b 0
