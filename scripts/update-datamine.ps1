[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$GamePath = '',

  [Parameter(Mandatory = $false)]
  [string]$RawDir = '',

  [Parameter(Mandatory = $false)]
  [string]$AesKey = '0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8',

  [Parameter(Mandatory = $false)]
  [switch]$ExportOnly = $false,

  [Parameter(Mandatory = $false)]
  [switch]$ProcessOnly = $false
)

$ErrorActionPreference = 'Stop'

$pipelineDir = $PSScriptRoot
$exportScript = Join-Path $pipelineDir '1-export-from-game.ps1'
$processScript = Join-Path $pipelineDir '2-process-datamine.ps1'

# Check if game is available on this machine
$hasGame = $false
$testGamePaths = @(
  $GamePath,
  'C:\Programs\Tower of Fantasy',
  'C:\Program Files\Tower of Fantasy',
  'C:\Programs\Tof_CN',
  'D:\Games\Tower of Fantasy',
  'D:\TofMods\tof',
  'D:\TofMods\picgit'
)

foreach ($path in $testGamePaths) {
  if ($path -and (Test-Path -LiteralPath $path)) {
    $hasGame = $true
    if (-not $GamePath) {
      $GamePath = $path
    }
    break
  }
}

if ($ExportOnly -or ($hasGame -and -not $ProcessOnly)) {
  Write-Host ">>> Running Game Export (Role 1)..." -ForegroundColor Cyan
  powershell -NoProfile -ExecutionPolicy Bypass -File $exportScript -GamePath $GamePath -AesKey $AesKey
}

if (-not $ExportOnly) {
  Write-Host "`n>>> Running Datamine Processing (Role 2)..." -ForegroundColor Cyan
  if ($RawDir) {
    powershell -NoProfile -ExecutionPolicy Bypass -File $processScript -RawDir $RawDir
  } else {
    powershell -NoProfile -ExecutionPolicy Bypass -File $processScript
  }
}
