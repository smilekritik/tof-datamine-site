# Agent data-source reference

Use `scripts/PIPELINE_GUIDE.md` as the authoritative source-to-output map. Do not assume a `datamine-pipeline/` directory exists.

| Area | Current public output | Generator |
| --- | --- | --- |
| Gacha items | `datamine/items/data/merged_mapping_with_original.json` | `pipeline/processors/build-items-json.js` / `scripts/build-items-gacha-json.js` |
| MMO items | `datamine/items/data/merged_mapping_with_original_mmo.json` | `pipeline/processors/build-items-json.js` / `scripts/build-items-mmo-json.js` |
| Sequential | `datamine/seq/data/seq-boss-cache.json`, stage limit, overrides | `pipeline/processors/build-seq-data.js`, `scripts/build-seq-boss-cache.js` |
| FCE | `datamine/fce/data/fce-index.json` + `bosses/*.json` | parser review outputs + curated boss files + `build-fce-index.js` |
| OOW | `datamine/oow/data/oow_*.json`, dates, buffs | `pipeline/processors/build-user-stats.js`, `pipeline/processors/extract-oow-deep-intel.js` |
| Multype | `datamine/multype/data/module_extra_to_files_mapping3.json` | separate scanner project |

Rules that must survive rebuilds:

- Item `rename` is manual state keyed by the stable string ID.
- FCE `bosses/*.json` is the curated runtime layer; parser review files do not replace it automatically.
- Sequential manual overrides remain authoritative for their listed stages.
- Multype is outside `2-process-datamine.ps1`.

The packaged export handoff is `tof-fast-datamine/`. Small and Full modes both validate 12 structured groups; Full validates 3 additional image groups. The scripts-side broad export config is a separate legacy/development path.
