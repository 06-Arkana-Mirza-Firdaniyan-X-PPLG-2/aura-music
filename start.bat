@echo off
title Aura - Modern Music Player
cd /d "%~dp0"
echo ======================================================
echo   AURA - MODERN AD-FREE MUSIC STREAMING (HP & PC)
echo ======================================================
echo Memulai server pemutar musik...
start http://localhost:3000
node server.js
pause
