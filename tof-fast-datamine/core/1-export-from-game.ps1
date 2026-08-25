[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$GamePath = '',

  [Parameter(Mandatory = $false)]
  [string]$AesKey = '0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8',

  [Parameter(Mandatory = $false)]
  [string]$OutputDir = '',

  [Parameter(Mandatory = $false)]
  $CreateZip = $true,

  [Parameter(Mandatory = $false)]
  [ValidateSet('Full', 'Small')]
  [string]$ExportMode = 'Full'
)

$ErrorActionPreference = 'Continue'
$exitCode = 0

$scriptDir = $PSScriptRoot
$rootDir = Split-Path -Parent $scriptDir
if (-not $OutputDir) {
  $OutputDir = Join-Path $rootDir 'raw_exports'
}
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$isSmallExport = $ExportMode -eq 'Small'
$archiveBaseName = if ($isSmallExport) { 'raw_exports_small.zip' } else { 'raw_exports_full.zip' }
$imageIgnoreFile = Join-Path $rootDir 'exported-images-ignore.txt'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Tower of Fantasy - Datamine Exporter ($ExportMode mode)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Select-FolderDialog {
  param([string]$Title = "Select Tower of Fantasy Installation Folder")

  try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $Title
    $dialog.ShowNewFolderButton = $false

    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    $form.BringToFront()
    $result = $dialog.ShowDialog($form)
    $form.Dispose()

    if ($result -eq [System.Windows.Forms.DialogResult]::OK -and $dialog.SelectedPath) {
      return $dialog.SelectedPath
    }
  } catch {
    try {
      $shell = New-Object -ComObject Shell.Application
      $folder = $shell.BrowseForFolder(0, $Title, 0, 0)
      if ($folder -and $folder.Self.Path) {
        return $folder.Self.Path
      }
    } catch {
      # Fallback
    }
  }
  return $null
}

function Test-ExportRequirement {
  param(
    [string]$Label,
    [string[]]$RelativePaths
  )

  foreach ($relativePath in $RelativePaths) {
    if (Test-Path -LiteralPath (Join-Path $OutputDir $relativePath)) {
      return [PSCustomObject]@{ Label = $Label; Found = $true; Detail = $relativePath }
    }
  }
  return [PSCustomObject]@{ Label = $Label; Found = $false; Detail = ($RelativePaths -join ' OR ') }
}

function Get-GameClientVersion {
  param([string]$GameFolder)

  $versionInfo = [PSCustomObject]@{
    version = ''
    appVersion = '3.0.0'
    section = ''
    branch = 'TestPC_KR2New'
    clientName = 'Korea Dev 1'
    clientNameRu = 'Корея Dev 1'
    hash = ''
    sourceFile = ''
    lastUpdate = (Get-Date -Format 'dd.MM.yyyy')
    lastUpdateIso = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  }

  $branchNamesMap = @{
    'TestPC_KR2New'   = @{ en = 'Korea Dev 1';   ru = 'Корея Dev 1' }
    'TestPC_KRNew'    = @{ en = 'Korea Dev 2';   ru = 'Корея Dev 2' }
    'TestPC_IW_3_0_0' = @{ en = 'Taiwan Dev 1';  ru = 'Тайвань Dev 1' }
    'TestPC_IW_2_5_0' = @{ en = 'Taiwan Dev 2';  ru = 'Тайвань Dev 2' }
    'OBPC_Xianqian'   = @{ en = 'Global Pioneer'; ru = 'Глобал Pioneer' }
    'AdvLaunch52'     = @{ en = 'CN Client';      ru = 'CN Клиент' }
  }

  # Search for config.xml
  $xmlCandidates = @(
    (Join-Path $GameFolder 'WmGpLaunch\UserData\Patcher\PatcherSDK\config.xml'),
    (Join-Path $GameFolder 'WmGpLaunch\UserData\internal\config.xml'),
    (Join-Path $GameFolder 'WmGpLaunch\UserData\Patcher\PatcherSDK\internal\config.xml'),
    (Join-Path $GameFolder 'WmGpLaunch\UserData\Patcher\PatcherSDK\tmp\config.xml'),
    (Join-Path $GameFolder 'config.xml')
  )

  $foundXml = $null
  foreach ($candidate in $xmlCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      $foundXml = $candidate
      break
    }
  }

  if (-not $foundXml) {
    $foundXmlFile = Get-ChildItem -LiteralPath $GameFolder -Filter 'config.xml' -File -Recurse -Depth 5 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundXmlFile) {
      $foundXml = $foundXmlFile.FullName
    }
  }

  # Search for PatcherConfig.json
  $jsonCandidates = @(
    (Join-Path $GameFolder 'WmGpLaunch\ResFilesM\200123\PatcherConfig\PatcherConfig.json')
  )
  $foundJson = $null
  foreach ($candidate in $jsonCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      $foundJson = $candidate
      break
    }
  }
  if (-not $foundJson) {
    $foundJsonFile = Get-ChildItem -LiteralPath $GameFolder -Filter 'PatcherConfig.json' -File -Recurse -Depth 5 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundJsonFile) {
      $foundJson = $foundJsonFile.FullName
    }
  }

  if ($foundJson) {
    try {
      $rawJson = Get-Content -LiteralPath $foundJson -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
      if ($rawJson.branchName) {
        $versionInfo.branch = "$($rawJson.branchName)".Trim()
      }
      if ($rawJson.appVersion) {
        $versionInfo.appVersion = "$($rawJson.appVersion)".Trim()
      }
    } catch {}
  }

  if ($foundXml) {
    try {
      $versionInfo.sourceFile = $foundXml
      $xmlObj = [xml](Get-Content -LiteralPath $foundXml -Raw -ErrorAction SilentlyContinue)
      if ($xmlObj.config.ResVersion) {
        $versionInfo.version = "$($xmlObj.config.ResVersion)".Trim()
      } elseif ($xmlObj.config.Version) {
        $versionInfo.version = "$($xmlObj.config.Version)".Trim()
      }
      if ($xmlObj.config.AppVersion) {
        $versionInfo.appVersion = "$($xmlObj.config.AppVersion)".Trim()
      }
      if ($xmlObj.config.Section) {
        $versionInfo.section = "$($xmlObj.config.Section)".Trim()
      }
      if ($xmlObj.config.Hash) {
        $versionInfo.hash = "$($xmlObj.config.Hash)".Trim()
      }
      if ($xmlObj.config.LocalBranch -and -not $versionInfo.branch) {
        $versionInfo.branch = "$($xmlObj.config.LocalBranch)".Trim()
      }
    } catch {}
  }

  if (-not $versionInfo.branch) {
    if ($GameFolder -match 'KR2|kr1|kr_1') {
      $versionInfo.branch = 'TestPC_KR2New'
    } elseif ($GameFolder -match 'KR|kr2|kr_2') {
      $versionInfo.branch = 'TestPC_KRNew'
    } else {
      $versionInfo.branch = 'TestPC_KR2New'
    }
  }

  if ($branchNamesMap.ContainsKey($versionInfo.branch)) {
    $versionInfo.clientName = $branchNamesMap[$versionInfo.branch].en
    $versionInfo.clientNameRu = $branchNamesMap[$versionInfo.branch].ru
  }

  if (-not $versionInfo.section -and $versionInfo.version) {
    $parts = $versionInfo.version.Split('.')
    if ($parts.Count -ge 2) {
      $versionInfo.section = "$($parts[0]).$($parts[1])"
    }
  }

  if (-not $versionInfo.version) {
    throw 'Unable to determine the snapshot version from the selected game client.'
  }

  return $versionInfo
}

try {
  # 1. Resolve Game Directory (via parameter, GAME_PATH.txt, or dialog)
  $gamePathTxtFile = Join-Path $rootDir 'GAME_PATH.txt'
  if (-not (Test-Path -LiteralPath $gamePathTxtFile) -and (Test-Path -LiteralPath (Join-Path $scriptDir 'GAME_PATH.txt'))) {
    $gamePathTxtFile = Join-Path $scriptDir 'GAME_PATH.txt'
  }

  if (-not $GamePath) {
    if (Test-Path -LiteralPath $gamePathTxtFile) {
      $savedPath = (Get-Content -LiteralPath $gamePathTxtFile -Raw -ErrorAction SilentlyContinue)
      if ($savedPath) {
        $savedPath = $savedPath.Trim()
      }

      if (-not $savedPath) {
        Write-Host "`n [!] Notice: 'GAME_PATH.txt' was found but it is EMPTY." -ForegroundColor Yellow
        Write-Host "     Please select your game installation folder in the dialog." -ForegroundColor Gray
      } elseif (Test-Path -LiteralPath $savedPath) {
        $GamePath = $savedPath
        Write-Host "`n [+] Using game folder from GAME_PATH.txt: $GamePath" -ForegroundColor Green
      } else {
        Write-Host "`n [!] Warning: Path saved in 'GAME_PATH.txt' does not exist:" -ForegroundColor DarkYellow
        Write-Host "     '$savedPath'" -ForegroundColor Red
        Write-Host "     Please select the new game installation folder." -ForegroundColor Yellow
      }
    }
  }

  if (-not $GamePath -or -not (Test-Path -LiteralPath $GamePath)) {
    Write-Host "`n [?] Opening folder selection dialog..." -ForegroundColor Yellow
    $pickedPath = Select-FolderDialog
    if ($pickedPath -and (Test-Path -LiteralPath $pickedPath)) {
      $GamePath = $pickedPath
    } else {
      Write-Host " Dialog was cancelled or closed." -ForegroundColor Yellow
      $inputPath = Read-Host " Please enter path to game folder manually (e.g. D:\Games\Tower of Fantasy)"
      if ($inputPath -and (Test-Path -LiteralPath $inputPath.Trim())) {
        $GamePath = $inputPath.Trim()
      } else {
        throw "No valid game folder selected or found. Exiting."
      }
    }
  }

  $GamePath = [System.IO.Path]::GetFullPath($GamePath)
  Write-Host "`n [+] Selected game folder: $GamePath" -ForegroundColor Green

  # Save path to GAME_PATH.txt for future runs
  try {
    Set-Content -LiteralPath $gamePathTxtFile -Value $GamePath -Encoding UTF8 -Force
    Write-Host " [+] Saved game path to 'GAME_PATH.txt' for future one-click runs." -ForegroundColor Gray
  } catch {
    # Non-fatal if writing txt fails
  }

  $outputRoot = [System.IO.Path]::GetPathRoot($OutputDir)
  $protectedPaths = @(
    $outputRoot,
    [System.IO.Path]::GetFullPath($rootDir),
    [System.IO.Path]::GetFullPath($scriptDir),
    [System.IO.Path]::GetFullPath($GamePath)
  )
  if ($protectedPaths -contains $OutputDir) {
    throw "Refusing to clean unsafe export path: $OutputDir"
  }

  if (Test-Path -LiteralPath $OutputDir) {
    Write-Host "`n[0/4] Removing previous export folder: $OutputDir" -ForegroundColor Yellow
    Remove-Item -LiteralPath $OutputDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  $previousZipPaths = @(
    (Join-Path $rootDir $archiveBaseName)
  )
  foreach ($previousZip in $previousZipPaths) {
    if (Test-Path -LiteralPath $previousZip) {
      Remove-Item -LiteralPath $previousZip -Force
    }
  }

  # 2. Find and Copy Mapping Files (MappingItemId.json, etc.)
  Write-Host "`n[1/4] Searching for Config Mapping JSON files..." -ForegroundColor Yellow

  $configDir = $null
  $candidateConfigDirs = @(
    (Join-Path $GamePath 'Client\WindowsNoEditor\Hotta\Config'),
    (Join-Path $GamePath 'Hotta\Config'),
    (Join-Path $GamePath 'Config'),
    $GamePath
  )

  foreach ($dir in $candidateConfigDirs) {
    if (Test-Path -LiteralPath (Join-Path $dir 'MappingItemId.json')) {
      $configDir = $dir
      break
    }
  }

  if (-not $configDir) {
    Write-Host "  -> Searching subfolders for MappingItemId.json..." -ForegroundColor Gray
    $found = Get-ChildItem -LiteralPath $GamePath -Filter 'MappingItemId.json' -File -Recurse -Depth 5 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
      $configDir = $found.DirectoryName
    }
  }

  $mappingFiles = @('MappingItemId.json', 'MappingItemIdAndName.json', 'MappingItemIdAndColor.json')
  $copiedConfigs = 0

  if ($configDir) {
    Write-Host "  -> Found Config directory: $configDir" -ForegroundColor Green
    foreach ($file in $mappingFiles) {
      $src = Join-Path $configDir $file
      if (Test-Path -LiteralPath $src) {
        $dest = Join-Path $OutputDir $file
        Copy-Item -LiteralPath $src -Destination $dest -Force
        Write-Host "  -> Copied: $file" -ForegroundColor Gray
        $copiedConfigs++
      } else {
        Write-Host "  [!] Missing file in config: $file" -ForegroundColor DarkYellow
      }
    }
  } else {
    Write-Host "  [!] Warning: MappingItemId*.json files not found in game folder." -ForegroundColor DarkYellow
  }

  # 2.5 Extract Client Version & Metadata (export-version.json, config.xml)
  Write-Host "`n[1.5/4] Extracting Game Client Version & Metadata..." -ForegroundColor Yellow
  $versionMeta = Get-GameClientVersion -GameFolder $GamePath

  $exportVersionFile = Join-Path $OutputDir 'export-version.json'
  $versionMeta | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $exportVersionFile -Encoding UTF8
  Write-Host "  -> Client Version: $($versionMeta.version) (App: $($versionMeta.appVersion), Branch: $($versionMeta.branch))" -ForegroundColor Green
  Write-Host "  -> Client Name:    $($versionMeta.clientName) ($($versionMeta.clientNameRu))" -ForegroundColor Green
  Write-Host "  -> Generated:      $exportVersionFile" -ForegroundColor Gray

  if ($versionMeta.sourceFile -and (Test-Path -LiteralPath $versionMeta.sourceFile)) {
    $destXml = Join-Path $OutputDir 'config.xml'
    Copy-Item -LiteralPath $versionMeta.sourceFile -Destination $destXml -Force
    Write-Host "  -> Copied config.xml from: $($versionMeta.sourceFile)" -ForegroundColor Gray
  }

  # 3. Find Paks Folder and Run UnrealExporter
  Write-Host "`n[2/4] Searching for game PAK files and running UnrealExporter..." -ForegroundColor Yellow

  $paksDir = $null
  $candidatePaksDirs = @(
    (Join-Path $GamePath 'Client\WindowsNoEditor\Hotta\Content\Paks'),
    (Join-Path $GamePath 'Hotta\Content\Paks'),
    (Join-Path $GamePath 'Content\Paks'),
    (Join-Path $GamePath 'Paks')
  )

  foreach ($dir in $candidatePaksDirs) {
    if (Test-Path -LiteralPath $dir) {
      $hasPak = Get-ChildItem -LiteralPath $dir -Filter '*.pak' -File -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($hasPak) {
        $paksDir = $dir
        break
      }
    }
  }

  if (-not $paksDir) {
    Write-Host "  -> Deep scanning for .pak files..." -ForegroundColor Gray
    $foundPak = Get-ChildItem -LiteralPath $GamePath -Filter '*.pak' -File -Recurse -Depth 5 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundPak) {
      $paksDir = $foundPak.DirectoryName
    }
  }

  # Find UnrealExporter.exe
  $exporterExeCandidates = @(
    (Join-Path $scriptDir 'UnrealExporter.exe'),
    (Join-Path $scriptDir 'unreal\UnrealExporter.exe'),
    (Join-Path (Split-Path -Parent $scriptDir) 'unreal\UnrealExporter.exe'),
    (Join-Path (Split-Path -Parent $scriptDir) 'datamine-pipeline\unreal\UnrealExporter.exe')
  )

  $exporterExe = $null
  foreach ($exe in $exporterExeCandidates) {
    if (Test-Path -LiteralPath $exe) {
      $exporterExe = [System.IO.Path]::GetFullPath($exe)
      break
    }
  }

  # Find export-datamine-config.json
  $templateConfigCandidates = @(
    (Join-Path $scriptDir 'export-datamine-config.json'),
    (Join-Path $scriptDir 'unreal\configs\export-datamine-config.json'),
    (Join-Path (Split-Path -Parent $scriptDir) 'unreal\configs\export-datamine-config.json'),
    (Join-Path (Split-Path -Parent $scriptDir) 'datamine-pipeline\export-datamine-config.json')
  )

  $templateConfig = $null
  foreach ($cfg in $templateConfigCandidates) {
    if (Test-Path -LiteralPath $cfg) {
      $templateConfig = [System.IO.Path]::GetFullPath($cfg)
      break
    }
  }

  if ($paksDir -and $exporterExe -and $templateConfig) {
    Write-Host "  -> Found PAK files directory: $paksDir" -ForegroundColor Green
    Write-Host "  -> Using UnrealExporter: $exporterExe" -ForegroundColor Gray
    Write-Host "  -> Target Output Directory: $OutputDir" -ForegroundColor Gray

    $unrealWorkingDir = Split-Path -Parent $exporterExe
    $configsFolder = Join-Path $unrealWorkingDir 'configs'
    if (-not (Test-Path -LiteralPath $configsFolder)) {
      New-Item -ItemType Directory -Path $configsFolder -Force | Out-Null
    }
    $tempConfigFile = Join-Path $configsFolder 'current-export-run.json'

    # Build config with correct CUE4Parse / UnrealExporter schema
    $configJson = Get-Content -LiteralPath $templateConfig -Raw | ConvertFrom-Json
    if ($configJson -is [array]) {
      $configJson = $configJson[0]
    }
    $configJson.ConfigTitle = "Tower of Fantasy Datamine"
    $configJson.GamePath = $paksDir
    $configJson.OutputPath = $OutputDir
    $configJson.EngineVersion = "TowerOfFantasy"
    $configJson.AesKeys = @($AesKey)

    if ($isSmallExport) {
      # Small mode is configured at the UnrealExporter level: all JSON inputs,
      # plus only new images from void and WorldBossList.
      $jsonExportPaths = @($configJson.ExportPaths | Where-Object { $_ -match ':json$' })
      $smallImageExportPaths = @(
        'Hotta/Content/Resources/UI/void/.*\.uasset:png',
        'Hotta/Content/Resources/UI/WorldBossList/.*\.uasset:png'
      )
      $configJson.ExportPaths = @($jsonExportPaths + $smallImageExportPaths)

      $indexedImagePaths = @()
      if (Test-Path -LiteralPath $imageIgnoreFile) {
        $indexedImagePaths = @(
          Get-Content -LiteralPath $imageIgnoreFile -ErrorAction Stop |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ -and -not $_.StartsWith('#') }
        )
      } else {
        Write-Host "  [!] Image ignore index was not found: $imageIgnoreFile" -ForegroundColor DarkYellow
      }
      $configJson.ExcludePaths = $indexedImagePaths
      Write-Host "  -> SMALL config: $($jsonExportPaths.Count) JSON rules, 2 image rules, $($indexedImagePaths.Count) indexed images ignored." -ForegroundColor Green
    } else {
      Write-Host "  -> FULL config: all JSON data and all configured image folders." -ForegroundColor Green
    }

    $configJson | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $tempConfigFile -Encoding UTF8

    Push-Location $unrealWorkingDir
    try {
      Write-Host "`n  Running UnrealExporter.exe (this may take 1-3 minutes)..." -ForegroundColor Cyan
      $proc = Start-Process -FilePath $exporterExe -ArgumentList "current-export-run.json" -Wait -NoNewWindow -PassThru
      Write-Host "  UnrealExporter exited with code: $($proc.ExitCode)" -ForegroundColor Gray
    } catch {
      Write-Host "  [!] Error executing UnrealExporter: $_" -ForegroundColor Red
    } finally {
      Pop-Location
    }
  } else {
    if (-not $paksDir) { Write-Host "  [!] Error: No .pak files directory found inside $GamePath" -ForegroundColor Red }
    if (-not $exporterExe) { Write-Host "  [!] Error: UnrealExporter.exe was not found" -ForegroundColor Red }
    if (-not $templateConfig) { Write-Host "  [!] Error: export-datamine-config.json was not found" -ForegroundColor Red }
  }

  # 4. Validate the complete handoff before packaging.
  Write-Host "`n[3/4] Validating required Datamine inputs..." -ForegroundColor Yellow
  $requirements = @(
    (Test-ExportRequirement 'Items: ID mapping' @('MappingItemId.json')),
    (Test-ExportRequirement 'Items: name mapping' @('MappingItemIdAndName.json')),
    (Test-ExportRequirement 'Items: rarity mapping' @('MappingItemIdAndColor.json')),
    (Test-ExportRequirement 'Items: Global StringTable' @('Hotta\Content\Resources\Text\Oversea\ST_Item_Oversea.json')),
    (Test-ExportRequirement 'Localization: English' @('Hotta\Content\Localization\Game\en\Game.json')),
    (Test-ExportRequirement 'Localization: Russian' @('Hotta\Content\Localization\Game\ru\Game.json')),
    (Test-ExportRequirement 'OOW/Sequential: monster HP' @(
      'Hotta\Content\ResourcesOverSea\CoreBlueprints\DataTable\Dungeon\DT_MonsterStaticData_Overseas.json',
      'Hotta\Content\Resources\CoreBlueprints\DataTable\DT_MonsterStaticData.json'
    )),
    (Test-ExportRequirement 'OOW: season config' @('Hotta\Content\ResourcesOverSea\CoreBlueprints\DataTable\Dungeon\OriginWarSeasonConfigDataTable_Overseas.json')),
    (Test-ExportRequirement 'OOW: round config' @('Hotta\Content\ResourcesOverSea\CoreBlueprints\DataTable\Dungeon\OriginWarRoundConfigDataTable_Overseas.json')),
    (Test-ExportRequirement 'OOW: monster pools' @('Hotta\Content\ResourcesOverSea\CoreBlueprints\DataTable\Dungeon\OriginWarMonsterPoolDataTable_Overseas.json')),
    (Test-ExportRequirement 'FCE: ordered boss catalog' @(
      'Hotta\Content\ResourcesOverSea\CoreBlueprints\DataTable\Dungeon\VoidCloneBossConfigDataTable_Overseas.json',
      'Hotta\Content\Resources\CoreBlueprints\DataTable\VoidClone\VoidCloneBossConfigDataTable.json'
    )),
    (Test-ExportRequirement 'Client Version: Metadata' @('export-version.json', 'config.xml'))
  )

  if (-not $isSmallExport) {
    $iconGroups = @(
      @{ Label = 'FCE boss icons'; RelativePath = 'Hotta\Content\Resources\UI\void\boss' },
      @{ Label = 'FCE large boss art'; RelativePath = 'Hotta\Content\Resources\UI\plugin\FB\bigmon' },
      @{ Label = 'OOW enemy art'; RelativePath = 'Hotta\Content\Resources\UI\SHTT\guaiwu' }
    )
    foreach ($iconGroup in $iconGroups) {
      $iconDir = Join-Path $OutputDir $iconGroup.RelativePath
      $iconCount = @(Get-ChildItem -LiteralPath $iconDir -Filter '*.png' -File -ErrorAction SilentlyContinue).Count
      $requirements += [PSCustomObject]@{
        Label = $iconGroup.Label
        Found = $iconCount -gt 0
        Detail = if ($iconCount -gt 0) { "$iconCount PNG files" } else { $iconGroup.RelativePath }
      }
    }
  }

  $validationLines = @('Tower of Fantasy Datamine export validation', '')
  foreach ($requirement in $requirements) {
    $status = if ($requirement.Found) { 'OK' } else { 'MISSING' }
    $color = if ($requirement.Found) { 'Green' } else { 'Red' }
    Write-Host "  [$status] $($requirement.Label): $($requirement.Detail)" -ForegroundColor $color
    $validationLines += "[$status] $($requirement.Label): $($requirement.Detail)"
  }
  $validationFile = Join-Path $OutputDir 'export-validation.txt'
  Set-Content -LiteralPath $validationFile -Value $validationLines -Encoding UTF8

  $missingRequirements = @($requirements | Where-Object { -not $_.Found })
  if ($missingRequirements.Count -gt 0) {
    throw "Export validation failed: $($missingRequirements.Count) required data groups are missing. See $validationFile"
  }

  # 5. Package into ZIP
  if ($CreateZip) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
    $zipPath = Join-Path $rootDir $archiveBaseName
    Write-Host "`n[4/4] Creating zip archive: $zipPath..." -ForegroundColor Yellow
    if (Test-Path -LiteralPath $zipPath) {
      Remove-Item -LiteralPath $zipPath -Force
    }
    Start-Sleep -Milliseconds 400
    [System.IO.Compression.ZipFile]::CreateFromDirectory($OutputDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Write-Host "  -> Archive created successfully: $zipPath" -ForegroundColor Green
  }

  Write-Host "`n========================================================" -ForegroundColor Cyan
  Write-Host " [SUCCESS] $ExportMode export completed!" -ForegroundColor Green
  Write-Host " Please send the file '$archiveBaseName' to the developer." -ForegroundColor Cyan
  Write-Host "========================================================" -ForegroundColor Cyan

  $completedZip = Join-Path $rootDir $archiveBaseName
  if (Test-Path -LiteralPath $completedZip) {
    explorer.exe /select,$completedZip
  }

} catch {
  $exitCode = 1
  Write-Host "`n========================================================" -ForegroundColor Red
  Write-Host " [ERROR OCCURRED]" -ForegroundColor Red
  Write-Host " $_" -ForegroundColor Red
  Write-Host "========================================================" -ForegroundColor Red
}

exit $exitCode
