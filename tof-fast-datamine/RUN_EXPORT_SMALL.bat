@echo off
title Tower of Fantasy - SMALL Datamine Export
echo ========================================================
echo Starting SMALL export: JSON data and only new allowed images...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\1-export-from-game.ps1" -ExportMode Small
echo.
if errorlevel 1 (
  echo SMALL export failed. Review the red messages above.
) else (
  echo SMALL export completed: raw_exports_small.zip
)
pause
