# TOF Datamine Archive

Static data tools and a reproducible update pipeline for the Tower of Fantasy Datamine Archive.

The public site is [tof.smilekritik.beer/datamine/](https://tof.smilekritik.beer/datamine/). The repository also contains the game-export pipeline, local authoring tools, a portable updater, and contract tests; it is not only a collection of HTML pages.

## What is included

| Route | Purpose |
| --- | --- |
| `/datamine/` | Archive hub, dataset counts, and snapshot metadata |
| `/datamine/oow/` | Origin of War seasons, floors, enemy waves, HP/EHP, buffs, and rewards |
| `/datamine/fce/` | EN/RU boss-mechanics cards with preview loading and PNG download |
| `/datamine/seq/` | Sequential boss HP/EHP tables, charts, and CSV/PNG export |
| `/datamine/multype/` | Searchable buff groups, stacking relationships, themes, and PNG export |
| `/datamine/items/` | Separate Global/Gacha and MMO item-identifier datasets with JSON export |
| `/datamine/about/` | Data sources, calculations, and update workflow |
| `/datamine/projects/` | Related Tower of Fantasy resources |
| `/datamine/contribute/` | Instructions for contributing a fresh game export |
| `/datamine/changelog/` | Dataset and site change history |
| `/datamine/privacy/` | Privacy and browser-storage disclosure |

`datamine/404.html` is the shared HTML 404 response. Local authoring tools live separately under `/datamine-builder/`: the hub, OOW image binder, FCE card builder, Sequential editor, Multype rename editor, and Items rename editor. All six Builder entry points are `noindex,nofollow`; they are build-time tools, not public Datamine routes. Builder localization varies by tool: FCE, Items, and Multype expose EN/RU controls, while the hub, OOW binder, and Sequential editor are English interfaces.

## Screenshots

These screenshots were captured from the current local build with the English interface enabled.

| Archive hub | Origin of War |
| --- | --- |
| ![TOF Datamine Archive hub](docs/screenshots/datamine-hub.png) | ![Origin of War season and floor data](docs/screenshots/datamine-oow.png) |

| FCE boss mechanics | Sequential scaling |
| --- | --- |
| ![FCE Ground Controller boss-mechanics card](docs/screenshots/datamine-fce.png) | ![Sequential boss-scaling charts](docs/screenshots/datamine-seq.png) |

| Multiplicative buffs | Item identifiers |
| --- | --- |
| ![Multiplicative buff groups and stacking data](docs/screenshots/datamine-multype.png) | ![Item identifier database](docs/screenshots/datamine-items.png) |

## Architecture

### Public Datamine runtime

`datamine/` is the self-contained publishable surface. It uses local HTML, CSS, JavaScript, fonts, data, and vendored browser libraries; no public page loads runtime JS or CSS from a CDN. Most routes use plain scripts. OOW is the exception: it uses locally vendored React 18/ReactDOM plus an ES-module controller. Babel, `eval`, and `new Function` are not part of the current public runtime.

Shared navigation, persisted EN/RU language state, snapshot metadata, live-version comparison, footer rendering, and URL state live in `datamine/shared/`. Language is stored in both local storage and a `/datamine/` cookie. The public routes share one header and footer, while route-specific scripts own their content.

Important runtime data contracts:

- OOW loads `oow/data/index.json`, the lightweight `oow/data/current/summary.json`, and individual `oow/data/seasons/*.json` shards. Build monoliths are removed before publication and there is no public monolith fallback.
- FCE loads `fce/data/fce-index.json`, then one `fce/data/bosses/<slug>.json` record for the selected boss. Preview art is upgraded to the full image; the current card can be rendered to PNG in the browser.
- Items loads Global/Gacha first. The separate MMO mapping is fetched only when MMO is selected. JSON export serializes the complete active dataset rather than the filtered table view.
- Multype keeps the complete filtered model in memory but mounts only the nearby horizontal Sub columns on screen. Its PNG path uses the full, non-virtualized renderer.

### Data and build pipeline

`pipeline/processors/` owns the canonical processors. `pipeline/contracts/` declares required, optional, curated-preserve, generated, and build-only paths. `pipeline/build/` prepares staging, creates release metadata, validates outputs, removes intermediates, and publishes managed roots transactionally.

The main flow is:

```text
fresh raw game export + curated inputs
  -> isolated staging tree
  -> Items / Sequential / FCE / OOW processors
  -> OOW season shards + release metadata
  -> output validation
  -> atomic managed-root publication
  -> dist_datamine_bundle/ and optional ZIP
```

Required inputs or empty required outputs fail the build. Optional inputs, such as RU FCE localization and some item enrichment tables, may be absent without taking ownership away from the required sources. Curated inputs are copied into staging before generated outputs are removed. A failed staged build does not publish an empty or partially rebuilt Datamine tree, and old generated files are not accepted as a silent release fallback.

### Portable package

`tof-fast-datamine/` is a standalone Windows handoff package with two explicit stages:

1. `RUN_EXPORT_SMALL.bat` or `RUN_EXPORT_FULL.bat` extracts files from an installed PC client using the bundled UnrealExporter. Small exports all required structured data and selected/new images; Full exports all configured structured data and the complete configured image set. These launchers only export game files and create `raw_exports_small.zip` or `raw_exports_full.zip`; they do not process or replace site data.
2. `RUN_PROCESS.bat` accepts either export ZIP or a `raw_exports/` directory and builds `dist_datamine_bundle/datamine` plus `dist_datamine_bundle.zip`.

Export requires Windows, PowerShell, an installed Tower of Fantasy PC client, and the bundled exporter files. The launcher reads the game directory from `tof-fast-datamine/GAME_PATH.txt`; if that file is missing, empty, or points to a directory that no longer exists, it opens a folder-selection dialog. A successfully selected path is saved to `GAME_PATH.txt` for later runs. Delete that file when you need to select a different installation. Processing additionally requires Node.js. The package can run without the main repository or an existing `datamine/` directory.

Do not edit packaged processor copies independently. The source of truth is `pipeline/processors/`; `npm run sync:pipeline` copies processors, build tools, contracts, and curated inputs into the portable package and records hashes in `tof-fast-datamine/package-manifest.json`. `npm run check:processors` verifies byte/hash parity and rejects unregistered copies.

### Local server and helper tooling

`server.js` serves `/datamine` with route-specific cache headers and also intentionally exposes the repository through a generic static root for the legacy site and local tools. It enables CORS, logs requests, proxies live client versions with a short in-memory cache, supports the legacy `/leaks` description store, and retains item read/rename helper endpoints. Public Items is read-only; the current Items Builder is client-side and export-based.

At startup the server checks the age of `datamine/data/datamine-summary.json`. If it is at least 24 hours old, it schedules a background summary/Sequential-cache refresh and rebuilds the FCE index only when per-boss files changed; subsequent refreshes run daily. There is no public endpoint that lets a page trigger Sequential cache generation.

## Data provenance

Published fields fall into three categories:

| Category | Examples |
| --- | --- |
| Game data | item mappings and string tables, monster stats, OOW season/round/pool tables, FCE localization and boss catalog |
| Calculated | HP/EHP projections, Sequential cache values, OOW indexes/shards, counts, and release projections |
| Manually maintained | item renames and fallback translations, FCE card records and boss art, Sequential mechanics overrides, Multype rename mappings |

Generated runtime JSON is an output, not the source of truth. Curated files are versioned inputs and must remain distinct from claims about official game data.

### Items identity and names

Global/Gacha and MMO are separate datasets and have separate curated maps.

- In Global/Gacha, `MappingItemId.json` owns the developer numeric `NUM` for each stable string item ID. Developer rows are sorted numerically.
- Entries found only in `ST_Item_Oversea.json` receive deterministic synthetic `NUM` values after the maximum developer `NUM`; those numbers are regenerated and are not manually curated.
- `original` is text read from game tables. `quality` comes from the game color mapping when available. `rename` is an explicit manual display override keyed by string item ID.
- `name` first uses a curated authoritative name from `gacha-overrides.json` or `mmo-overrides.json`; otherwise it may use the matching machine-translated fallback map. These fallbacks are persistent curated aids, not official localization and never own `NUM`, `original`, `quality`, or `rename`.
- Translation maps live at `datamine/items/curated/gacha-translations.json` and `datamine/items/curated/mmo-translations.json`. Import reviewed user exports with `node tools/import-item-translations.js <export.json>`; use `--overwrite` only when an existing curated value should be replaced.

The public Export JSON action includes the complete active Global/Gacha or MMO dataset and snapshot information. It is independent of the current search and filter state.

### OOW, FCE, and Multype ownership

OOW Standard and MMO are rebuilt from their own season, round, monster-pool, and monster tables; one mode cannot substitute for the other. Season dates are generated from the season configuration tables. The buff catalog is assembled from game effect-tip/localization data and buffs referenced by the generated seasons, with limited display fallbacks for missing labels or icons.

FCE mechanics and the game boss catalog are extracted from `Game/en/Game.json`, optional RU localization, and the Void Clone boss table. Those generated review/catalog files identify new or missing bosses. The public list, ordering, card copy, presentation fields, and art remain curated per-boss records under `datamine/fce/data/bosses/`; `build:fce-index` generates the lightweight manifest from them. Full boss art and 384px previews are maintained under `datamine/fce/assets/`, and preview regeneration is an explicit command.

Multype consumes `datamine/multype/data/module_extra_to_files_mapping3.json`, produced by the separate `Tower-of-fantasy-exporter-scanner-master/` full-game modifier scan, plus `renames.base.json`. It is not rebuilt by `process:datamine`. Manual table scale runs from 5% to 125%, Reset returns to 80%, and Fit is a separate responsive mode. PNG export preserves the full filtered matrix rather than the virtualized screen window.

## Release and version metadata

Fresh export metadata has one authoritative path:

```text
raw_exports/export-version.json
  -> pipeline/build/generate-release-manifest.js
  -> datamine/release-manifest.json
  -> datamine/data/export-version.json
  -> datamine/data/datamine-summary.json
```

`release-manifest.json` owns the published snapshot version, `exportedAt`, and source list. The other files are compatibility/summary projections and validation requires them to match. Missing fresh `export-version.json` blocks publication; a stale manifest cannot replace it.

The optional live Global version comes from the server proxy and is used only to show update status. It does not overwrite the dataset snapshot. Korea branch normalization is intentionally:

- `korea1` / `TestPC_KR2New` -> `Korea Dev 1`
- `korea2` / `TestPC_KRNew` -> `Korea Dev 2`

## Social metadata, SEO, and localization

All 11 public Datamine pages use one OG/Twitter image: `datamine/social/datamine-social.png` (1731x909). `scripts/datamine-social-meta.js` holds the shared URL/dimensions and synchronizes `og:image`, `twitter:image`, and `summary_large_image` metadata without changing route-specific titles or descriptions.

Public pages have canonical, description, Open Graph, and Twitter metadata. The root `robots.txt` allows `/datamine/`, disallows `/datamine-builder/`, and points to the root sitemap. The Datamine 404 page is `noindex`; all Builder pages are `noindex,nofollow`.

Public navigation and route UI support EN/RU through the shared language state. Individual data fields depend on available source localization and curated content, so a fallback or untranslated game string can still appear.

## Run locally

Install Node.js, then from the repository root:

```powershell
npm install
npm start
```

Open `http://127.0.0.1:3001/datamine/`. `npm run dev` starts the same server through nodemon. `start-fcebuilder.bat` is a convenience launcher for `http://localhost:3001/datamine-builder/fce/`.

## Common commands

Validation commands are read-only except for temporary test fixtures.

| Command | Purpose |
| --- | --- |
| `npm test` | Run the complete runtime, data-contract, pipeline, and metadata test suite |
| `npm run lint` | Lint server, shared/runtime JS, processors, scripts, and tests |
| `npm run check:datamine` | Validate all 11 public pages, shared assets, metadata, and runtime data contracts |
| `npm run check:builder` | Validate all six Builder entry points and their offline/noindex contract |
| `npm run check:processors` | Verify canonical/portable processor parity and manifest hashes |
| `npm run check:versions` | Query and record configured live client versions |

Build and data commands may rewrite generated files. They do not replace the game-export launchers in `tof-fast-datamine/`.

| Command | Purpose |
| --- | --- |
| `npm run process:datamine` | Stage, rebuild, validate, publish managed data, and create a replacement bundle from a fresh raw export |
| `npm run build:items` | Run the canonical Global/Gacha and MMO item processor |
| `npm run build:items-gacha` | Run the development-side Global/Gacha item helper |
| `npm run build:items-mmo` | Run the development-side MMO item helper |
| `npm run build:seq` | Rebuild Sequential outputs from fresh monster data |
| `npm run build:seq-cache` | Rebuild the current Sequential browser cache |
| `npm run build:fce` | Extract FCE localization and boss-catalog review outputs |
| `npm run build:fce-index` | Rebuild `fce-index.json` from curated per-boss cards |
| `npm run build:fce-previews` | Regenerate FCE preview images from full boss art |
| `npm run build:fce-presets` | Refresh FCE Builder presets |
| `npm run shard:oow` | Convert OOW build outputs into index, summary, and season shards |
| `npm run cache:datamine` | Refresh the Sequential cache and compact Datamine summary from the current release manifest |
| `npm run sync:social-meta` | Apply the shared social-image metadata to all public routes |
| `npm run sync:pipeline` | Synchronize canonical processors/contracts/curated inputs into the portable package |

The root `update-datamine.ps1` is a direct export/process wrapper and may start a game export when it discovers an installed client. Prefer the explicit portable launchers when only one stage is intended. In particular, `tof-fast-datamine/RUN_EXPORT_FULL.bat` performs only the full game-file export; site-data processing begins only with `RUN_PROCESS.bat`.

## Project structure

```text
datamine/                    public, self-contained Datamine site
  shared/                    navigation, language, metadata, footer, common CSS
  data/                      compact snapshot/version projections
  oow/ fce/ seq/             major data tools and route-owned data
  multype/ items/            lookup/export tools and route-owned data
  about/ projects/           supporting public pages
  contribute/ changelog/     update instructions and release history
  privacy/ social/ vendor/   policy, shared preview, local browser libraries
datamine-builder/            six noindex authoring tools
pipeline/
  processors/                canonical data processors
  contracts/                 input/output ownership contracts
  build/                     staging, validation, metadata, publication
scripts/                     repository-side checks, helpers, and wrappers
tools/                       curated-data import utilities
tests/                       runtime and data-contract tests
tof-fast-datamine/
  RUN_EXPORT_SMALL.bat       structured data + selected/new images
  RUN_EXPORT_FULL.bat        structured data + complete configured images
  RUN_PROCESS.bat            build a replacement Datamine bundle
  core/                      physical portable processor/build copies
  curated-inputs/            portable curated-preserve inputs
server.js                    local/static server and helper APIs
package.json                 npm command surface
```

## Important contracts

- Treat `pipeline/processors/` as canonical; portable copies are synchronized artifacts.
- Treat `datamine/release-manifest.json` as snapshot truth; live Global is supplemental status only.
- Preserve curated item overrides/translations, FCE per-boss cards/art, Sequential mechanics overrides, and Multype rename mappings during rebuilds.
- Do not publish OOW build monoliths or replace shard loading with a monolith fallback.
- Do not infer that generated runtime JSON is safe to edit as source data.
- Keep public runtime assets local and Builder routes out of search indexes.
