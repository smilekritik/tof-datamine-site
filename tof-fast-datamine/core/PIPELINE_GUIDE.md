# Packaged exporter handoff guide

This package is the game-PC half of the Datamine workflow.

1. Use `RUN_EXPORT_SMALL.bat` for routine handoffs. It keeps all structured inputs current and checks only the `void` and `WorldBossList` image collections, skipping images recorded in `exported-images-ignore.txt`.
2. Use `RUN_EXPORT_FULL.bat` when all configured image collections must be refreshed.
3. Send the resulting `raw_exports_small.zip` or `raw_exports_full.zip` to the processing maintainer.

The configuration has 27 exact JSON/locres rules and 9 image rules. Both modes validate the three item mappings, Global item string table, EN/RU localization, monster static table, OOW season/round/pool tables, FCE catalog, and client metadata: 12 structured groups. Full additionally checks 3 image groups. A missing group prevents ZIP creation.

Downstream public formats:

- Items: two merged Gacha/MMO JSON files; manual renames are preserved by stable ID.
- Sequential: generated cache/stage limit plus curated overrides.
- FCE: `fce-index.json` and curated `bosses/*.json` (not monolithic `fce-bosses*.json`).
- OOW: standard, deep-intelligence, MMO, current-season, date, and buff datasets.
- Multype: separate scanner; not updated by this package.

The repository-side processor is `scripts/2-process-datamine.ps1`. Its release archive copies the public `datamine/` tree and raw inputs, not `datamine-builder/`.
