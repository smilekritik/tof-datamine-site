# Curated item names

`gacha-translations.json` and `mmo-translations.json` contain machine-translated fallback names keyed by canonical string item ID. They are persistent curated build inputs, not official localization data.

Each entry has the form `{ "name": "English fallback" }`. Numeric `NUM`, original game text, quality, and manual `rename` values are intentionally excluded. Import translated user exports with `node tools/import-item-translations.js <export.json>`.
