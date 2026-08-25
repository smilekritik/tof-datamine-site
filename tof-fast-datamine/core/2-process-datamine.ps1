[CmdletBinding()]
param(
  [string]$RawDir = '',
  [string]$OutputDir = '',
  [string]$ProcessorsDir = '',
  [string]$CuratedInputDir = '',
  [switch]$CreateZip = $true,
  [switch]$CleanupExtractedRaw = $true
)

$ErrorActionPreference = 'Stop'
$coreDir = [System.IO.Path]::GetFullPath($PSScriptRoot)
$packageRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $coreDir))
$buildToolsDir = Join-Path $coreDir 'build'
$contractsDir = Join-Path $coreDir 'contracts'
if (-not $ProcessorsDir) { $ProcessorsDir = $coreDir }
if (-not $CuratedInputDir) { $CuratedInputDir = Join-Path $packageRoot 'curated-inputs\datamine' }
if (-not $OutputDir) { $OutputDir = Join-Path $packageRoot 'dist_datamine_bundle' }
$ProcessorsDir = [System.IO.Path]::GetFullPath($ProcessorsDir)
$CuratedInputDir = [System.IO.Path]::GetFullPath($CuratedInputDir)
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$workRoot = Join-Path $packageRoot '_work'
$stageRoot = Join-Path $workRoot 'build'
$extractedRaw = $false

function Invoke-Processor([string]$Name, [string[]]$Arguments = @()) {
  $scriptPath = Join-Path $ProcessorsDir $Name
  if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Required processor not found: $scriptPath" }
  & node $scriptPath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Processor failed ($LASTEXITCODE): $Name" }
}

function Invoke-BuildTool([string]$Name, [string[]]$Arguments = @()) {
  & node (Join-Path $buildToolsDir $Name) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Build tool failed ($LASTEXITCODE): $Name" }
}

function Assert-SafeChild([string]$Candidate, [string]$Parent) {
  $candidateFull = [System.IO.Path]::GetFullPath($Candidate)
  $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  if (-not $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing filesystem cleanup outside portable package: $candidateFull"
  }
}

try {
  if (-not (Test-Path -LiteralPath $CuratedInputDir)) {
    throw "Portable curated inputs are missing: $CuratedInputDir. Run npm run sync:pipeline in the source repository before copying the package."
  }

  if (-not $RawDir) {
    $directoryCandidate = Join-Path $packageRoot 'raw_exports'
    if (Test-Path -LiteralPath $directoryCandidate) {
      $RawDir = $directoryCandidate
    } else {
      $zipCandidate = @('raw_exports_full.zip', 'raw_exports_small.zip') |
        ForEach-Object { Join-Path $packageRoot $_ } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
      if (-not $zipCandidate) { throw 'No raw_exports directory or SMALL/FULL export ZIP was found.' }
      $RawDir = Join-Path $workRoot 'raw_exports'
      Assert-SafeChild $RawDir $packageRoot
      if (Test-Path -LiteralPath $RawDir) { Remove-Item -LiteralPath $RawDir -Recurse -Force }
      New-Item -ItemType Directory -Path $RawDir -Force | Out-Null
      Expand-Archive -LiteralPath $zipCandidate -DestinationPath $RawDir -Force
      $extractedRaw = $true
    }
  }
  $RawDir = [System.IO.Path]::GetFullPath($RawDir)
  if (-not (Test-Path -LiteralPath $RawDir)) { throw "Raw export path not found: $RawDir" }

  Assert-SafeChild $stageRoot $packageRoot
  if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
  New-Item -ItemType Directory -Path (Join-Path $stageRoot 'datamine') -Force | Out-Null
  Copy-Item -Path (Join-Path $CuratedInputDir '*') -Destination (Join-Path $stageRoot 'datamine') -Recurse -Force
  Invoke-BuildTool 'prepare-staging.js' @("--project-root=$stageRoot", "--contract=$(Join-Path $contractsDir 'outputs.json')")

  $common = @("--raw-dir=$RawDir", "--project-root=$stageRoot")
  Invoke-Processor 'build-items-json.js' $common
  Invoke-Processor 'build-seq-data.js' $common
  Invoke-Processor 'parse-fce-mechanics.js' $common
  Invoke-Processor 'build-fce-index.js' @("--fce-dir=$(Join-Path $stageRoot 'datamine\fce')")
  Invoke-Processor 'build-user-stats.js' $common
  Invoke-Processor 'shard-oow-data.js' @("--project-root=$stageRoot")
  Invoke-BuildTool 'generate-release-manifest.js' @("--project-root=$stageRoot", "--raw-dir=$RawDir")
  Invoke-BuildTool 'validate-datamine.js' @("--project-root=$stageRoot")
  Invoke-BuildTool 'finalize-public-bundle.js' @("--project-root=$stageRoot", "--contract=$(Join-Path $contractsDir 'outputs.json')")

  $requiredOutputs = @(
    'datamine\items\data\merged_mapping_with_original.json',
    'datamine\items\data\merged_mapping_with_original_mmo.json',
    'datamine\seq\data\seq-boss-cache.json',
    'datamine\seq\data\seq-stage-limit.txt',
    'datamine\fce\data\fce-index.json',
    'datamine\oow\data\index.json',
    'datamine\oow\data\current\summary.json',
    'datamine\oow\data\seasons'
  )
  $missing = @($requiredOutputs | Where-Object { -not (Test-Path -LiteralPath (Join-Path $stageRoot $_)) })
  if ($missing.Count) { throw "Validation failed; required outputs missing: $($missing -join ', ')" }
  foreach ($jsonRel in $requiredOutputs | Where-Object { $_.EndsWith('.json') }) {
    $null = Get-Content -LiteralPath (Join-Path $stageRoot $jsonRel) -Raw | ConvertFrom-Json
  }

  $outputParent = Split-Path -Parent $OutputDir
  $pendingOutput = Join-Path $outputParent ("." + (Split-Path -Leaf $OutputDir) + ".stage3-pending-$PID")
  $backupOutput = Join-Path $outputParent ("." + (Split-Path -Leaf $OutputDir) + ".stage3-backup-$PID")
  Assert-SafeChild $pendingOutput $outputParent
  if (Test-Path -LiteralPath $pendingOutput) { Remove-Item -LiteralPath $pendingOutput -Recurse -Force }
  New-Item -ItemType Directory -Path $pendingOutput -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $stageRoot 'datamine') -Destination (Join-Path $pendingOutput 'datamine') -Recurse -Force
  if (Test-Path -LiteralPath $OutputDir) { Move-Item -LiteralPath $OutputDir -Destination $backupOutput }
  try {
    Move-Item -LiteralPath $pendingOutput -Destination $OutputDir
    if (Test-Path -LiteralPath $backupOutput) { Remove-Item -LiteralPath $backupOutput -Recurse -Force }
  } catch {
    if (Test-Path -LiteralPath $backupOutput) { Move-Item -LiteralPath $backupOutput -Destination $OutputDir }
    throw
  }
  Write-Host 'PUBLICATION .. SUCCESS' -ForegroundColor Green

  if ($CreateZip) {
    $zipPath = "$($OutputDir.TrimEnd('\')).zip"
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -Path (Join-Path $OutputDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "Replacement ZIP: $zipPath" -ForegroundColor Green
  }

  if ($extractedRaw -and $CleanupExtractedRaw) {
    Assert-SafeChild $RawDir $packageRoot
    Remove-Item -LiteralPath $RawDir -Recurse -Force
  }

  # Processing scratch data is retained on failure for diagnosis and removed only
  # after validation, publication, and optional ZIP creation have all succeeded.
  if (Test-Path -LiteralPath $stageRoot) {
    Assert-SafeChild $stageRoot $packageRoot
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
  if ((Test-Path -LiteralPath $workRoot) -and -not (Get-ChildItem -LiteralPath $workRoot -Force | Select-Object -First 1)) {
    Assert-SafeChild $workRoot $packageRoot
    Remove-Item -LiteralPath $workRoot -Force
  }
  Write-Host "Fresh replacement bundle: $OutputDir" -ForegroundColor Green
  exit 0
} catch {
  Write-Host "BUILD FAILED: $_" -ForegroundColor Red
  Write-Host 'PUBLICATION NOT PERFORMED. Existing bundle and raw inputs unchanged.' -ForegroundColor Yellow
  exit 1
}
