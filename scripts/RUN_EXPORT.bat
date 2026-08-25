@echo off
title Tower of Fantasy - Datamine Exporter
echo Starting export script...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp01-export-from-game.ps1"
echo.
pause
