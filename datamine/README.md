# Tower of Fantasy Datamine

Static public pages and local data for the Tower of Fantasy Datamine project.

## Public routes

| Route | Purpose |
| --- | --- |
| `/datamine/` | Hub with compact dataset counts and current-version metadata |
| `/datamine/oow/` | Origin of War seasons, floors, waves, HP/EHP, buffs, rewards, and FCE links |
| `/datamine/fce/` | EN/RU boss-mechanics cards and PNG export |
| `/datamine/seq/` | Sequential HP/EHP tables, charts, zoom, and CSV/PNG export |
| `/datamine/multype/` | Searchable modifier groups and local rename/theme preferences |
| `/datamine/items/` | Gacha/MMO item identifiers and names |
| `/datamine/about/` | Data provenance, calculations, and update workflow |
| `/datamine/projects/` | Related projects |
| `/datamine/changelog/` | Release notes |
| `/datamine/privacy/` | Privacy and local-storage disclosure |

All ten pages use the shared header, footer, language state, local fonts, favicon, and route metadata. Public routes have canonical, description, Open Graph, and Twitter metadata.

## Runtime and source data

`datamine/` is the publishable static surface. Browser dependencies are local; public pages do not require a CDN. Route data lives under each route's `data/` directory and must not be confused with extraction inputs.

Important runtime datasets:

- OOW: authoritative `index.json`, optional lightweight `current/summary.json`, and lazy `seasons/sNN.json` / `seasons/mmo_sNN.json` shards. Full monoliths are build intermediates and are not public runtime files.
- FCE: `fce-index.json` plus one curated record per boss in `bosses/*.json`. The former monolithic `fce-bosses*.json` files are not runtime inputs.
- Sequential: `seq-boss-cache.json`, `seq-stage-limit.txt`, `seq-boss-overrides.json`, and the full source copy.
- Items: `merged_mapping_with_original.json` and `merged_mapping_with_original_mmo.json`.
- Multype: `module_extra_to_files_mapping3.json` plus `renames.base.json`. Its scanner is a separate workflow.

Multype can export the current filtered matrix as one PNG. The export preserves the selected table palette, offers 0.5×, 0.75×, 1×, and 2× output scales with 1× as the default, and is independent of the on-screen Table scale. Extremely large matrices may require a lower export quality or narrower filters to fit the browser's safe single-canvas limits.

`data/datamine-summary.json` is a compact hub/header cache. `data/export-version.json` carries client-version metadata.

## Update architecture

The repository currently has three distinct workflows:

1. `tof-fast-datamine/` is the packaged game-PC exporter used for handoffs. Small and Full modes use an exact whitelist, validate 12 structured groups, and Full additionally validates 3 image groups.
2. `scripts/` is the active processing and release workflow. `2-process-datamine.ps1` rebuilds Items, Sequential, FCE, OOW, previews, the compact cache, and the release bundle.
3. `Tower-of-fantasy-exporter-scanner-master/` updates Multype separately. The normal datamine pipeline does not rebuild Multype.

`scripts/1-export-from-game.ps1` and its broad export config are an older development path. The root `npm run export:game` command invokes that path, not the packaged fast exporter. See `scripts/README.md` and `scripts/PIPELINE_GUIDE.md` before running an export.

## Local development

From the repository root:

```powershell
npm install
npm start
```

Open `http://127.0.0.1:3001/datamine/`.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run check:datamine` | Validate all ten public pages, shared shell, metadata, and summary cache |
| `npm run check:builder` | Validate the six private Builder routes and their noindex contract |
| `npm run cache:datamine` | Refresh Sequential cache and the compact hub manifest |
| `npm run build:items` | Rebuild Gacha and MMO item outputs |
| `npm run build:seq` | Rebuild Sequential source outputs |
| `npm run build:fce` | Parse current FCE localization review outputs |
| `npm run build:fce-index` | Rebuild the curated per-boss FCE index |
| `npm run build:fce-previews` | Regenerate FCE preview images |
| `npm run process:datamine` | Process a raw export and create a release bundle |

OOW processors now live in `pipeline/processors/`; the portable package receives verified physical copies through `npm run sync:pipeline`.

## Directory map

```text
datamine/
  index.html                 public hub
  shared/                    shared shell, language, metadata, fonts, styles
  data/                      compact summary and version metadata
  fonts/                     local WOFF2 fonts
  vendor/                    pinned browser libraries
  social/                    social-card assets
  docs/screenshots/          README screenshots
  oow/ fce/ seq/             major data tools
  multype/ items/            lookup tools
  about/ projects/           supporting pages
  changelog/ privacy/        release and policy pages
```

The separate `datamine-builder/` tree contains six local authoring tools. They are marked `noindex,nofollow` and are not copied by the release bundle script, but the development server can still expose them because it serves the repository root.

## Maintenance notes

- Treat `shared/footer.js` as the single public footer implementation.
- Language state is shared through `shared/i18n.js`, although some routes and the header still contain compatibility fallbacks.
- Preserve manual item `rename` values by stable string ID during rebuilds.
- Preserve curated FCE boss files and Sequential manual overrides.
- Do not infer that a generated-looking file is disposable; review the dead-code inventory in `DATAMINE_AUDIT.md` first.
