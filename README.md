# TOF Datamine Archive

Public Tower of Fantasy data pages for Origin of War, FCE bosses, Sequential scaling, buff groups, and item identifiers.

<p align="center">
  <a href="https://tof.smilekritik.beer/datamine/">Live site</a>
  ·
  <a href="#pages">Pages</a>
  ·
  <a href="#builder">Builder</a>
  ·
  <a href="#run-locally">Local run</a>
  ·
  <a href="#screenshots">Screenshots</a>
</p>

![Datamine hub](docs/screenshots/datamine-hub.png)

## Pages

| Route | Contents |
| --- | --- |
| `/datamine/` | Compact index with live counts and the active Origin of War season |
| `/datamine/oow/` | Seasons, floor waves, enemy HP and effective HP, buffs, rewards, and difficulty schedules |
| `/datamine/fce/` | English and Russian boss mechanic cards with direct PNG export |
| `/datamine/seq/` | Pure HP, effective HP, power-creep charts, zoom, CSV/PNG export, and source values |
| `/datamine/multype/` | Searchable buff categories with additive and multiplicative grouping |
| `/datamine/items/` | Searchable item IDs, developer names, translations, and copyable identifiers |

All pages share the same local header, EN/RU switch, version badge, favicon, and visual language. Each route also has its own Open Graph text and 1200×630 social image in `social/`.

## Standalone runtime

`datamine/` contains every browser dependency it needs:

- React, ReactDOM, and Babel live in `vendor/`.
- Manrope, Spectral, and JetBrains Mono WOFF2 files live in `fonts/`.
- Each page keeps runtime code in `js/`, CSS in `styles/`, datasets in `data/`, and images in `assets/` when needed.
- `oow/index.html` is the single OOW interface source.
- Runtime code has no CDN, localhost fallback, or path into `datamine-pipeline`.

`datamine-pipeline/` contains development and extraction tools. The public pages do not load it. The only runtime component outside this directory is the repository-level `server.js`, which serves static files and the item-editor save endpoints.

Run the standalone contract check after changing paths, metadata, fonts, vendors, or social cards:

```bash
npm run check:datamine
```

The check covers all six routes, shared navigation, local runtime assets, social metadata, PNG dimensions, and forbidden external fallbacks.

## Builder

`builder/` holds unlisted, browser-only authoring tools for maintainers and contributors. They are **not** linked from the hub and are marked `noindex`. Nothing is written to the site — each tool keeps edits in `localStorage` and lets you **export files** that you drop into `datamine/` and commit.

| Tool | URL | Exports |
| --- | --- | --- |
| FCE Card Builder | `/datamine/builder/fce/` | `fce/data/bosses/{slug}.json` (+ `fce/assets/bosses/{slug}.png`) |
| Multype Rename Editor | `/datamine/builder/multype/` | `multype/data/renames.base.json` |
| OOW Image Binder | `/datamine/builder/oow/` | `oow/assets/monsters/<codeName>.png` + a mapping to merge into the pipeline's `monster-image-mapping.json` |

The Multype and FCE exports drop straight into the folders above (rerun the matching `build:*` step when noted). The OOW binder is an exact copy of the OOW page — open any enemy card, bind a portrait to its `codeName`, and export; the private extraction pipeline rebuilds those into `oow_stats.json`.

To propose a change: open the relevant builder, export the file(s), and attach them to a PR or send them over. Edits never touch the live site until the files are committed.

## Run locally

From the repository root:

```bash
npm install
npm start
```

Open [http://127.0.0.1:3001/datamine/](http://127.0.0.1:3001/datamine/).

The server refreshes stale Datamine caches on startup, then checks them every 24 hours. Opening a page does not start a rebuild.

## Data and build commands

| Command | Purpose |
| --- | --- |
| `npm run cache:datamine` | Rebuild the Sequential cache and compact hub manifest |
| `npm run build:seq` | Rebuild Sequential source data |
| `npm run build:seq-cache` | Rebuild the Sequential chart cache |
| `npm run build:fce` | Parse FCE mechanics data |
| `npm run build:fce-previews` | Regenerate FCE boss preview images |
| `npm run build:items` | Rebuild item mapping JSON |
| `npm run check:datamine` | Validate the standalone public subproject |

## Structure

```text
datamine/
  index.html                 Hub entry point
  favicon.svg                Shared 119/99 tab icon
  js/hub.js                  Hub data and interactions
  styles/hub.css             Hub-specific styles
  data/                      Hub summary and exported client version
  shared/                    Header, base styles, components, and font declarations
  fonts/                     Local WOFF2 files
  vendor/                    Pinned browser libraries
  social/                    Open Graph cards and their HTML generator
  docs/screenshots/          README screenshots
  oow/                       index.html + js/ + styles/ + data/ + assets/
  fce/                       index.html + js/ + styles/ + data/ + assets/ + docs/
  seq/                       index.html + js/ + styles/ + data/
  multype/                   index.html + js/ + styles/ + data/
  items/                     index/local HTML + js/ + styles/ + data/
builder/                     Unlisted editing tools (FCE / Multype / OOW) — export files, not live edits
  index.html                 Builder hub
  fce/  multype/  oow/        One folder per tool (own index.html + js/ + styles/)
```

## Screenshots

### Origin of War

![Origin of War seasons and floor data](docs/screenshots/datamine-oow.png)

### FCE boss mechanics

![FCE boss mechanics card](docs/screenshots/datamine-fce.png)

### Sequential

![Sequential boss scaling chart](docs/screenshots/datamine-seq.png)

### Multype

![Multype buff category viewer](docs/screenshots/datamine-multype.png)

### Items

![Item identifier table](docs/screenshots/datamine-items.png)

## Notes

- `shared/header.js` and `shared/header.css` own navigation, language state, and version display.
- `data/datamine-summary.json` keeps the hub fast by avoiding full dataset downloads.
- Social card source lives at `social/card.html`; the six generated PNG files sit beside it.
- Multype's light/dark control changes the data surface while the shared archive shell stays dark.
