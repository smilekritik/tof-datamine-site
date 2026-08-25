[CmdletBinding()]
param(
  [string]$RawDir = '',
  [string]$OutputDir = '',
  [switch]$CreateZip = $true
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$processorsDir = Join-Path $projectRoot 'pipeline\processors'
$buildToolsDir = Join-Path $projectRoot 'pipeline\build'
$contractsDir = Join-Path $projectRoot 'pipeline\contracts'
$curatedInputDir = Join-Path $projectRoot 'datamine'
if (-not $OutputDir) { $OutputDir = Join-Path $projectRoot 'dist_datamine_bundle' }
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$workRoot = Join-Path $projectRoot '.pipeline-work'
$stageRoot = Join-Path $workRoot 'build'
$extractedRaw = $false

function Invoke-CanonicalProcessor([string]$Name, [string[]]$Arguments = @()) {
  $scriptPath = Join-Path $processorsDir $Name
  if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Required canonical processor not found: $scriptPath" }
  & node $scriptPath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Processor failed ($LASTEXITCODE): $Name" }
}

function Invoke-BuildTool([string]$Name, [string[]]$Arguments = @()) {
  $scriptPath = Join-Path $buildToolsDir $Name
  if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Required build tool not found: $scriptPath" }
  & node $scriptPath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Build tool failed ($LASTEXITCODE): $Name" }
}

function Assert-SafeChild([string]$Candidate, [string]$Parent) {
  $candidateFull = [System.IO.Path]::GetFullPath($Candidate)
  $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  if (-not $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing filesystem cleanup outside the expected parent: $candidateFull"
  }
}

try {
  if (-not (Test-Path -LiteralPath $processorsDir)) { throw "Canonical processor directory is missing: $processorsDir" }
  if (-not (Test-Path -LiteralPath $curatedInputDir)) { throw "Main Datamine input directory is missing: $curatedInputDir" }

  if (-not $RawDir) {
    $directoryCandidate = Join-Path $projectRoot 'raw_exports'
    if (Test-Path -LiteralPath $directoryCandidate) {
      $RawDir = $directoryCandidate
    } else {
      $zipCandidate = @('raw_exports_full.zip', 'raw_exports_small.zip') |
        ForEach-Object { Join-Path $projectRoot $_ } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
      if (-not $zipCandidate) { throw 'No raw_exports directory or SMALL/FULL export ZIP was found.' }
      $RawDir = Join-Path $workRoot 'raw_exports'
      Assert-SafeChild $RawDir $projectRoot
      if (Test-Path -LiteralPath $RawDir) { Remove-Item -LiteralPath $RawDir -Recurse -Force }
      New-Item -ItemType Directory -Path $RawDir -Force | Out-Null
      Expand-Archive -LiteralPath $zipCandidate -DestinationPath $RawDir -Force
      $extractedRaw = $true
    }
  }
  $RawDir = [System.IO.Path]::GetFullPath($RawDir)
  if (-not (Test-Path -LiteralPath $RawDir)) { throw "Raw export path not found: $RawDir" }

  Assert-SafeChild $stageRoot $projectRoot
  if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
  New-Item -ItemType Directory -Path (Join-Path $stageRoot 'datamine') -Force | Out-Null
  Copy-Item -Path (Join-Path $curatedInputDir '*') -Destination (Join-Path $stageRoot 'datamine') -Recurse -Force
  Invoke-BuildTool 'prepare-staging.js' @("--project-root=$stageRoot", "--contract=$(Join-Path $contractsDir 'outputs.json')")

  $common = @("--raw-dir=$RawDir", "--project-root=$stageRoot")
  Invoke-CanonicalProcessor 'build-items-json.js' $common
  if ($env:TOF_STAGE3_FAIL_AFTER -eq 'items') { throw 'Injected Stage 3 failure after Items.' }
  Invoke-CanonicalProcessor 'build-seq-data.js' $common
  Invoke-CanonicalProcessor 'parse-fce-mechanics.js' $common
  Invoke-CanonicalProcessor 'build-fce-index.js' @("--fce-dir=$(Join-Path $stageRoot 'datamine\fce')")
  Invoke-CanonicalProcessor 'build-user-stats.js' $common
  Invoke-CanonicalProcessor 'shard-oow-data.js' @("--project-root=$stageRoot")
  Invoke-BuildTool 'generate-release-manifest.js' @("--project-root=$stageRoot", "--raw-dir=$RawDir")
  Invoke-BuildTool 'validate-datamine.js' @("--project-root=$stageRoot")
  Invoke-BuildTool 'finalize-public-bundle.js' @("--project-root=$stageRoot", "--contract=$(Join-Path $contractsDir 'outputs.json')")

  $requiredOutputs = ((Get-Content -LiteralPath (Join-Path $contractsDir 'outputs.json') -Raw | ConvertFrom-Json).managed | Where-Object { $_.required } | ForEach-Object { "datamine/$($_.path)" })

  # Prepare the replacement bundle (and ZIP) before touching public data.
  $outputParent = Split-Path -Parent $OutputDir
  $outputLeaf = Split-Path -Leaf $OutputDir
  $pendingOutput = Join-Path $outputParent (".$outputLeaf.stage3-pending-$PID")
  $backupOutput = Join-Path $outputParent (".$outputLeaf.stage3-backup-$PID")
  Assert-SafeChild $pendingOutput $outputParent
  if (Test-Path -LiteralPath $pendingOutput) { Remove-Item -LiteralPath $pendingOutput -Recurse -Force }
  New-Item -ItemType Directory -Path $pendingOutput -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $stageRoot 'datamine') -Destination (Join-Path $pendingOutput 'datamine') -Recurse -Force
  if ($CreateZip) {
    $zipPath = "$($OutputDir.TrimEnd('\')).zip"
    $pendingZip = "$($OutputDir.TrimEnd('\')).stage3-pending-$PID.zip"
    Compress-Archive -Path (Join-Path $pendingOutput '*') -DestinationPath $pendingZip -CompressionLevel Optimal
  }

  # Only now may the public managed data roots change. The tool rolls every root
  # back if any rename fails.
  Invoke-BuildTool 'publish-managed.js' @("--stage-root=$(Join-Path $stageRoot 'datamine')", "--target-root=$curatedInputDir", "--contract=$(Join-Path $contractsDir 'outputs.json')")

  if (Test-Path -LiteralPath $OutputDir) { Move-Item -LiteralPath $OutputDir -Destination $backupOutput }
  try {
    Move-Item -LiteralPath $pendingOutput -Destination $OutputDir
    if (Test-Path -LiteralPath $backupOutput) { Remove-Item -LiteralPath $backupOutput -Recurse -Force }
  } catch {
    if (Test-Path -LiteralPath $backupOutput) { Move-Item -LiteralPath $backupOutput -Destination $OutputDir }
    throw
  }

  if ($CreateZip) {
    if (Test-Path -LiteralPath $zipPath) { Move-Item -LiteralPath $zipPath -Destination "$zipPath.stage3-backup-$PID" }
    Move-Item -LiteralPath $pendingZip -Destination $zipPath
    if (Test-Path -LiteralPath "$zipPath.stage3-backup-$PID") { Remove-Item -LiteralPath "$zipPath.stage3-backup-$PID" -Force }
    Write-Host "Replacement ZIP: $zipPath" -ForegroundColor Green
  }

  if ($extractedRaw) {
    Assert-SafeChild $RawDir $projectRoot
    Remove-Item -LiteralPath $RawDir -Recurse -Force
  }
  if (Test-Path -LiteralPath $stageRoot) {
    Assert-SafeChild $stageRoot $projectRoot
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
  if ((Test-Path -LiteralPath $workRoot) -and -not (Get-ChildItem -LiteralPath $workRoot -Force | Select-Object -First 1)) {
    Assert-SafeChild $workRoot $projectRoot
    Remove-Item -LiteralPath $workRoot -Force
  }
  Write-Host "Fresh replacement bundle: $OutputDir" -ForegroundColor Green
  exit 0
} catch {
  Write-Host "BUILD FAILED: $_" -ForegroundColor Red
  Write-Host 'PUBLICATION NOT PERFORMED (or transaction rolled back). Existing runtime data unchanged.' -ForegroundColor Yellow
  exit 1
}
