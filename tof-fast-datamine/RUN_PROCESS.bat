@echo off
title Tower of Fantasy - Process Datamine Export
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\2-process-datamine.ps1"
if errorlevel 1 (
  echo Processing failed. Raw export files were preserved.
) else (
  echo Processing completed. See dist_datamine_bundle and its ZIP.
)
pause
