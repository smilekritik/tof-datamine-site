[CmdletBinding()]
param(
  [string]$GamePath = '',
  [string]$AesKey = '0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8',
  [string]$OutputDir = '',
  $CreateZip = $true,
  [ValidateSet('Full', 'Small')][string]$ExportMode = 'Full'
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$portableExporter = Join-Path $projectRoot 'tof-fast-datamine\core\1-export-from-game.ps1'

$exportArguments = @{
  AesKey = $AesKey
  CreateZip = $CreateZip
  ExportMode = $ExportMode
}

if (-not [string]::IsNullOrWhiteSpace($GamePath)) {
  $exportArguments.GamePath = $GamePath
}
if (-not [string]::IsNullOrWhiteSpace($OutputDir)) {
  $exportArguments.OutputDir = $OutputDir
}

& $portableExporter @exportArguments
exit $LASTEXITCODE
