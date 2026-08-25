#!/usr/bin/env node
/**
 * build-fce-index.js
 *
 * Rebuilds datamine/fce/data/fce-index.json — the lightweight manifest that the
 * site (and the boss-id/name consumers) read — by scanning the per-boss source
 * files in datamine/fce/data/bosses/*.json.
 *
 * Ordering rule: curated boss-card `order`, then slug. Generated index output is
 * never used as an input or as evidence that a missing card is acceptable.
 *
 * The manifest is a STATIC build artifact — nothing generates it at runtime.
 */
const fs = require("fs");
const path = require("path");

function resolveFceDir() {
  // Explicit override: --fce-dir=<path to datamine/fce> (used by the pipeline).
  const argHit = process.argv.find((a) => a.startsWith("--fce-dir="));
  if (argHit) return argHit.slice("--fce-dir=".length);

  // scripts/ -> ../datamine/fce ; also works when copied under a pipeline core/.
  const candidates = [
    path.join(__dirname, "..", "..", "datamine", "fce"),
    path.join(__dirname, "..", "..", "..", "datamine", "fce")
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "data"))) return c;
  }
  return candidates[0];
}

const FCE_DIR = resolveFceDir();
const DATA_DIR = path.join(FCE_DIR, "data");
const BOSSES_DIR = path.join(DATA_DIR, "bosses");
const INDEX_PATH = path.join(DATA_DIR, "fce-index.json");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`[required] Invalid curated FCE boss card ${file}: ${e.message}`);
  }
}

function extractBossNumber(str) {
  if (!str) return undefined;
  const match = String(str).match(/boss(?:_hum)?_?#?0*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function getMechanicsCount(d) {
  if (!d) return 0;
  if (Array.isArray(d.en && d.en.mechanics)) return d.en.mechanics.length;
  if (Array.isArray(d.ru && d.ru.mechanics)) return d.ru.mechanics.length;
  if (Array.isArray(d.mechanics)) return d.mechanics.length;
  return 0;
}

function buildIndex() {
  if (!fs.existsSync(BOSSES_DIR)) {
    throw new Error(`Per-boss directory not found: ${BOSSES_DIR}`);
  }

  const files = fs
    .readdirSync(BOSSES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error(`[required] FCE boss-card directory is empty: ${BOSSES_DIR}`);

  const bossBySlug = new Map();
  for (const file of files) {
    const data = readJson(path.join(BOSSES_DIR, file));
    const slug = data.slug || path.basename(file, ".json");
    bossBySlug.set(slug, data);
  }

  const slugs = [...bossBySlug.keys()];
  slugs.sort((a, b) => {
    const oa = Number.isFinite(Number(bossBySlug.get(a).order)) ? Number(bossBySlug.get(a).order) : Number.POSITIVE_INFINITY;
    const ob = Number.isFinite(Number(bossBySlug.get(b).order)) ? Number(bossBySlug.get(b).order) : Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  const bosses = slugs.map((slug, i) => {
    const d = bossBySlug.get(slug);
    const bossNum = extractBossNumber(d.boss_id || slug);
    const mechanicsCount = getMechanicsCount(d);
    return {
      slug,
      order: i + 1,
      boss_id: d.boss_id || undefined,
      boss_num: bossNum !== undefined ? bossNum : undefined,
      name: (d.en && d.en.name) || d.name || slug,
      name_ru: (d.ru && d.ru.name) || undefined,
      name_color: d.name_color || undefined,
      art: d.art || `./assets/bosses/${slug}.png`,
      mechanics_count: mechanicsCount
    };
  });

  // Drop undefined keys for clean output.
  const cleaned = bosses.map((b) => {
    const o = {};
    for (const [k, v] of Object.entries(b)) if (v !== undefined) o[k] = v;
    return o;
  });
  if (cleaned.length === 0) throw new Error('[required] FCE index produced zero bosses.');

  fs.writeFileSync(INDEX_PATH, JSON.stringify({ bosses: cleaned }, null, 2) + "\n", "utf8");
  console.log(`[fce-index] Wrote ${cleaned.length} bosses -> ${path.relative(process.cwd(), INDEX_PATH)}`);
  return cleaned.length;
}

if (require.main === module) {
  buildIndex();
}

module.exports = { buildIndex };
