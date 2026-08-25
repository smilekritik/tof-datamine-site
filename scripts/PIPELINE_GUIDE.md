# Verified Datamine pipeline guide

This guide describes the implementation audited on 2026-08-24. File paths are repository-relative.

## Pipeline boundaries

- `tof-fast-datamine/`: packaged extraction handoff for a machine with the game installed. Its config contains 27 exact JSON/locres rules and 9 image rules.
- `scripts/`: processing, cache generation, and release assembly on the development machine.
- `datamine/`: public static output.
- `Tower-of-fantasy-exporter-scanner-master/`: independent Multype scan. Multype is not part of the normal processing script.
- `datamine-builder/`: local authoring tools; excluded from the release bundle but reachable through the broad development static server.

The legacy repository exporter (`scripts/1-export-from-game.ps1` plus `scripts/export-datamine-config.json`) has broader regex rules and is not equivalent to the packaged exporter. The root `export:game` npm command currently selects that legacy path.

## Packaged export modes and validation

`tof-fast-datamine/RUN_EXPORT_SMALL.bat` exports every configured structured-data rule and only the `void` and `WorldBossList` image groups, applying `exported-images-ignore.txt`. It creates `raw_exports_small.zip`.

`RUN_EXPORT_FULL.bat` exports all configured structured data and all nine image groups without the ignore list. It creates `raw_exports_full.zip`.

Both modes validate these 12 structured groups before archive creation:

1. `MappingItemId.json`
2. `MappingItemIdAndName.json`
3. `MappingItemIdAndColor.json`
4. `ST_Item_Oversea.json`
5. English `Game.json`
6. Russian `Game.json`
7. overseas monster static data
8. OOW season config
9. OOW round config
10. OOW monster pools
11. overseas FCE boss catalog
12. client version metadata (`export-version.json` or `config.xml`)

Full mode adds three image-group requirements. Missing requirements are written to `export-validation.txt` and abort archive creation.

## Processing order

`scripts/2-process-datamine.ps1` executes Items, Sequential, FCE parsing, FCE index generation, OOW stats, OOW deep intelligence, preview generation, compact-cache generation, and release bundling, in that order. The release contains `datamine/` and the raw export tree; it does not copy `datamine-builder/`.

Individual processors can preserve an existing curated output or skip optional work when a source is missing. Treat a successful export validation, successful processing log, both repository checks, and a browser smoke test as distinct release gates.

## Source-to-output map

### Items

Gacha sources:

- `MappingItemId.json`
- `MappingItemIdAndName.json`
- `MappingItemIdAndColor.json`
- `ST_Item_Oversea.json`

Output: `datamine/items/data/merged_mapping_with_original.json`.

MMO sources: `ST_Item_MMO.json`, `CookingFoodDataTable_MMO.json`, `DT_LifeJob_HarvestableItems.json`, and `DT_LifeJobCraftingConfig.json`.

Output: `datamine/items/data/merged_mapping_with_original_mmo.json`.

Manual `rename` values are retained by stable string ID; `original` remains separate.

### Sequential

`build-seq-data.js` prefers `DT_MonsterStaticData_Overseas.json`, reads `Rows.endless_special_boss_stage.MaxHealth`, scans stages 1 through 100, and isolates the Global range at the first ratio jump greater than 3.0. It writes the source/cache and stage limit used by the route.

The public page uses manual overrides from `seq-boss-overrides.json` (with a built-in fallback) and displays its default calculated EHP as `MaxHealth × 1.3471`. This is the current UI calculation, not the OOW seasonal-resistance model.

### FCE

`parse-fce-mechanics.js` reads EN/RU `Game.json` localization and `VoidCloneBossConfigDataTable_Overseas.json`. It produces localization review artifacts including `Filtered_Game*.json`, `fce-unregistered-bosses.json`, `fce-missing-boss-texts.json`, and `fce-game-boss-catalog.json`.

The public runtime does not read a monolithic `fce-bosses.json`. Curated data lives in `datamine/fce/data/bosses/<slug>.json`; `build-fce-index.js` writes `datamine/fce/data/fce-index.json` with slug, order, game identifiers, localized names, art, color, and mechanics count. `fce-new-mechanics-candidates.json` remains in the tree but has no current producer or runtime consumer.

### Origin of War

`build-user-stats.js` combines overseas season, round, pool, monster-static, effect-tip, EN/RU localization, monster-curve, balance, and MMO variants. During staging it writes `oow_stats.json` and `oow_mmo_stats.json` as build intermediates. `shard-oow-data.js` consumes them and atomically produces the authoritative public runtime set:

- `index.json`
- lightweight optional `current/summary.json`
- `seasons/sNN.json` and `seasons/mmo_sNN.json`

`season_dates.json` and `oow_buffs_catalog.json` are curated inputs embedded into the index/shards. After validation, `finalize-public-bundle.js` removes the monolith intermediates. `extract-oow-deep-intel.js` remains available as a manual research tool but is not part of normal publication and `oow_deep_intel.json` is not public output. The retired `oow_current_seasons.json` cache has no producer or runtime owner.

Season 14+ raw single-monster HP is multiplied by 100 during standard-stat generation. The current public OOW page calculates displayed EHP from a curated season resistance schedule (S1–11: `0.40 + (season - 1) × 0.006`; S12: `0.7185`; S13: `0.7393`; S14+: `0.8501`) and `EHP = raw HP / (1 - resistance)`. It does not currently use a `14106` defense formula.

OOW links a wave boss to FCE by extracting a numeric boss identifier, resolving it through `fce-index.json`, lazy-loading `bosses/<slug>.json`, and linking to `/datamine/fce/#<slug>`. There is no HP/name identity fallback or explicit alias table.

### Multype

The scanner walks exported JSON arrays and recognizes `Properties.ModuleExtraModifierInfos`, otherwise `Modifiers`, otherwise `CustomApplicationRequirement[].GameplayModifierInfos`. It stores basenames rather than complete source paths, so duplicate basenames can collide. Its primary public dataset is `module_extra_to_files_mapping3.json`; `renames.base.json` is separate and the Excel/patch-difference files are derivative.

## Verification

```powershell
npm run check:datamine
npm run check:builder
```

Review `DATAMINE_AUDIT.md` for route inventory, performance, accessibility, dead-code candidates, and owner decisions.
