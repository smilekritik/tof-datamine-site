# Portable core file map

This directory contains the implementation behind the three launchers in the
parent `tof-fast-datamine/` directory. Normally, use those launchers instead of
running files in `core/` directly.

## Export flow

`../RUN_EXPORT_SMALL.bat` and `../RUN_EXPORT_FULL.bat` call
`1-export-from-game.ps1` with the corresponding export mode.

`1-export-from-game.ps1`:

1. finds or asks for the Tower of Fantasy installation;
2. loads the exact export rules from `export-datamine-config.json`;
3. runs `unreal/UnrealExporter.exe` with its bundled DLLs;
4. validates the required structured-data groups and, in Full mode, the
   required image groups;
5. creates `../raw_exports_small.zip` or `../raw_exports_full.zip`.

Small mode exports every structured-data rule plus selected new images. It
uses `../exported-images-ignore.txt` to skip images already handed off. Full
mode exports every configured structured-data and image rule.

## Processing flow

`../RUN_PROCESS.bat` calls `2-process-datamine.ps1`. The processor accepts a
`../raw_exports/` directory or one of the export ZIP files and combines it with
`../curated-inputs/datamine/`.

The processing order is:

1. `build/prepare-staging.js` creates the controlled staging structure.
2. The processor scripts generate Items, Sequential, FCE, and OOW data.
3. `build/generate-release-manifest.js` records the generated release.
4. `build/validate-datamine.js` checks the staged public data.
5. `build/finalize-public-bundle.js` removes processing-only artifacts.
6. The finished replacement is published as `../dist_datamine_bundle/` and
   `../dist_datamine_bundle.zip`.

Existing output is replaced only after processing and validation succeed. Raw
exports are preserved when processing fails.

## File relationships

- `2-process-datamine.ps1` is the portable processing orchestrator.
- `build-items-json.js` builds the Gacha and MMO item datasets.
- `build-seq-data.js` builds the Sequential cache and stage-limit data.
- `parse-fce-mechanics.js` produces FCE review data, while
  `build-fce-index.js` indexes the curated per-boss runtime files.
- `build-user-stats.js` and `shard-oow-data.js` build and publish the OOW
  datasets. `extract-oow-deep-intel.js` is an additional packaged OOW
  processor and is not called by the default `RUN_PROCESS.bat` flow.
- `monster-image-mapping.json` supplies image-name mappings to the OOW
  processors.
- `generate-fce-previews.ps1` is an optional FCE preview maintenance helper;
  it is not part of the default processing flow.
- `build/` contains staging, validation, manifest, finalization, and managed
  publication tools.
- `contracts/inputs.json` and `contracts/outputs.json` define the portable
  input and output boundaries used by the build tools.
- `unreal/` contains UnrealExporter and its runtime dependencies.
- `../package-manifest.json` records hashes for synchronized processors,
  build tools, and contracts.

## Synchronization rule

Processor files, build tools, contracts, selected shared helpers, and curated
inputs are synchronized from the repository by `npm run sync:pipeline`. Do not
edit those generated portable copies independently: change their canonical
repository source and run the synchronization command again.

The export and processing entry points (`1-export-from-game.ps1` and
`2-process-datamine.ps1`) are portable-specific orchestration files and are not
replaced by that synchronization command.
