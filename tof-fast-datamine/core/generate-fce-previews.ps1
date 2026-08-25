[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$SourceDir = '',

  [Parameter(Mandatory = $false)]
  [string]$TargetDir = '',

  [Parameter(Mandatory = $false)]
  [int]$MaxDimension = 384,

  [Parameter(Mandatory = $false)]
  [switch]$Force = $false
)

$ErrorActionPreference = 'Stop'

$coreDir = $PSScriptRoot
$pipelineRoot = Split-Path -Parent $coreDir
$projectRoot = Split-Path -Parent $pipelineRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'datamine'))) {
  $projectRoot = $pipelineRoot
}

if (-not $SourceDir) {
  $SourceDir = Join-Path $projectRoot 'datamine\fce\assets\bosses'
}

if (-not $TargetDir) {
  $TargetDir = Join-Path $projectRoot 'datamine\fce\assets\bosses-preview'
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

if (-not (Test-Path -LiteralPath $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Add-Type -AssemblyName System.Drawing

function Resize-ImageFile {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxSize
  )

  $sourceBytes = [System.IO.File]::ReadAllBytes($InputPath)
  $memoryStream = New-Object System.IO.MemoryStream(,$sourceBytes)
  $sourceImage = [System.Drawing.Image]::FromStream($memoryStream)

  try {
    $srcWidth = $sourceImage.Width
    $srcHeight = $sourceImage.Height

    if ($srcWidth -le 0 -or $srcHeight -le 0) {
      return $false
    }

    $scale = [Math]::Min($MaxSize / $srcWidth, $MaxSize / $srcHeight)
    if ($scale -gt 1.0) {
      $scale = 1.0
    }

    $targetWidth = [Math]::Max(1, [int][Math]::Round($srcWidth * $scale))
    $targetHeight = [Math]::Max(1, [int][Math]::Round($srcHeight * $scale))

    $targetBitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)
      $graphics.DrawImage($sourceImage, $destRect, 0, 0, $srcWidth, $srcHeight, [System.Drawing.GraphicsUnit]::Pixel)

      $targetBitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $targetBitmap.Dispose()
    }

    return $true
  } finally {
    $sourceImage.Dispose()
    $memoryStream.Dispose()
  }
}

$sourceFiles = Get-ChildItem -LiteralPath $SourceDir -Filter '*.png' -File
$processed = 0

foreach ($file in $sourceFiles) {
  $targetFile = Join-Path $TargetDir $file.Name
  $shouldProcess = $Force -or (-not (Test-Path -LiteralPath $targetFile)) -or ($file.LastWriteTimeUtc -gt (Get-Item -LiteralPath $targetFile).LastWriteTimeUtc)

  if ($shouldProcess) {
    $ok = Resize-ImageFile -InputPath $file.FullName -OutputPath $targetFile -MaxSize $MaxDimension
    if ($ok) {
      $processed++
    }
  }
}

Write-Host "Generated $processed preview images in $TargetDir" -ForegroundColor Green
