@echo off
title Tower of Fantasy - FULL Datamine Export
echo ========================================================
echo Starting FULL export: JSON data and the complete image base...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\1-export-from-game.ps1" -ExportMode Full
echo.
if errorlevel 1 (
  echo FULL export failed. Review the red messages above.
) else (
  echo FULL export completed: raw_exports_full.zip
)
pause
