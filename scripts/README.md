# Datamine processing scripts

`scripts/` is the active development-side processing pipeline. It consumes an extracted `raw_exports` tree, rebuilds public datasets under `datamine/`, and creates a release archive. It is not the same thing as the packaged exporter in `tof-fast-datamine/`.

## Recommended two-machine workflow

1. On the game PC, run `tof-fast-datamine/RUN_EXPORT_SMALL.bat` for routine updates or `RUN_EXPORT_FULL.bat` when all image collections must be refreshed.
2. Transfer `raw_exports_small.zip` or `raw_exports_full.zip` to the processing machine and extract it as the raw input tree expected by the scripts.
3. From the repository root, run `npm run process:datamine` (or invoke `scripts/2-process-datamine.ps1`).
4. Run `npm run check:datamine` and inspect the generated `datamine-bundle-YYYY-MM-DD.zip`.

The packaged exporter uses 27 exact structured-data rules and 9 image rules. Both modes validate 12 structured source groups; Full mode additionally validates 3 required image groups. Archive creation stops when an export requirement is missing.

## Processing order

`2-process-datamine.ps1` runs the current processors in this order:

1. Items (`build-items-json.js`, including Gacha and MMO outputs)
2. Sequential (`build-seq-data.js`)
3. FCE localization parser (`parse-fce-mechanics.js`)
4. FCE curated index (`build-fce-index.js`)
5. OOW standard/MMO stats (`build-user-stats.js`)
6. OOW deep intelligence (`extract-oow-deep-intel.js`)
7. FCE preview synchronization/generation
8. compact Datamine cache (`build-datamine-cache.js`)
9. release bundle containing `datamine/` and the raw source tree

Some individual processors preserve existing curated output or skip optional work when a source is unavailable. Export validation and processing are therefore separate guarantees; read the console output and run the checks before publication.

## Commands

| Command | Current behavior |
| --- | --- |
| `npm run process:datamine` | Runs the active processing/release pipeline |
| `npm run update:datamine` | Runs the repository update wrapper |
| `npm run build:items` | Rebuilds Gacha and MMO item outputs |
| `npm run build:seq` | Rebuilds Sequential source/cache inputs |
| `npm run build:fce` | Produces FCE localization review outputs |
| `npm run build:fce-index` | Rebuilds `fce-index.json` from curated `bosses/*.json` |
| `npm run build:fce-previews` | Refreshes 384px boss previews |
| `npm run cache:datamine` | Refreshes route summary/version caches |

Known debt:

- `npm run export:game` invokes the older `scripts/1-export-from-game.ps1` and broad `scripts/export-datamine-config.json`; it does not invoke `tof-fast-datamine` and does not discover the packaged exporter binary in its current location.
- Shared processors live in `pipeline/processors/`; `npm run sync:pipeline` packages and verifies the portable copies.
- Multype is updated only by `Tower-of-fantasy-exporter-scanner-master/`.

See `PIPELINE_GUIDE.md` for the verified source-to-output map.
