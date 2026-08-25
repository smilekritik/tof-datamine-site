#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const arg = process.argv.find((x) => x.startsWith('--project-root='));
if (!arg) throw new Error('Usage: validate-datamine.js --project-root=<stage>');
const root = path.resolve(arg.slice('--project-root='.length));
const data = (...p) => path.join(root, 'datamine', ...p);
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const requireFile = (file) => { if (!fs.existsSync(file)) throw new Error(`[required-output] Missing ${file}`); return file; };

const manifest = read(requireFile(data('release-manifest.json')));
if (!manifest.schemaVersion || !manifest.snapshot || typeof manifest.snapshot.version !== 'string' || !manifest.snapshot.version.trim()) throw new Error('Manifest validation failed: snapshot.version is required.');
if (!manifest.snapshot.exportedAt || !Number.isFinite(Date.parse(manifest.snapshot.exportedAt))) throw new Error('Manifest validation failed: snapshot.exportedAt is invalid.');
if (!Array.isArray(manifest.snapshot.sources) || !manifest.snapshot.sources.length || manifest.snapshot.sources.some((source) => !source || !String(source.client || '').trim() || !String(source.branch || '').trim())) throw new Error('Manifest validation failed: every source requires client and branch.');
const legacyProjection = read(requireFile(data('data/export-version.json')));
const summaryProjection = read(requireFile(data('data/datamine-summary.json')));
if (legacyProjection.version !== manifest.snapshot.version || legacyProjection.exportedAt !== manifest.snapshot.exportedAt || JSON.stringify(legacyProjection.sources) !== JSON.stringify(manifest.snapshot.sources)) throw new Error('Legacy export-version projection does not match release manifest.');
if (JSON.stringify(summaryProjection.snapshot) !== JSON.stringify(manifest.snapshot)) throw new Error('Datamine summary snapshot does not match release manifest.');

const gacha = read(requireFile(data('items/data/merged_mapping_with_original.json')));
const mmoItems = read(requireFile(data('items/data/merged_mapping_with_original_mmo.json')));
const itemRows = (x) => Array.isArray(x) ? x : Array.isArray(x.items) ? x.items : Object.keys(x || {});
if (!itemRows(gacha).length || !itemRows(mmoItems).length) throw new Error('Items validation failed: empty mapping.');

const seq = read(requireFile(data('seq/data/seq-boss-cache.json')));
const stageCount = Array.isArray(seq) ? seq.length
  : Array.isArray(seq.stages) ? seq.stages.length
  : seq.rows && typeof seq.rows === 'object' ? Object.keys(seq.rows).length
  : 0;
if (!stageCount) throw new Error('Sequential validation failed: zero stages.');

const fce = read(requireFile(data('fce/data/fce-index.json')));
if (!Array.isArray(fce.bosses) || !fce.bosses.length) throw new Error('FCE validation failed: zero bosses.');
for (const boss of fce.bosses) requireFile(data('fce/data/bosses', `${boss.slug}.json`));
requireFile(data('fce/docs/NEW_BOSSES_TEXTS.md'));

const index = read(requireFile(data('oow/data/index.json')));
const summary = read(requireFile(data('oow/data/current/summary.json')));
if (!index.standard || !Array.isArray(index.standard.seasons) || !index.standard.seasons.length) throw new Error('OOW validation failed: empty index.');
if (!index.mmo || !Array.isArray(index.mmo.seasons) || !index.mmo.seasons.length) throw new Error('OOW validation failed: empty MMO index.');
if (summary.schemaVersion !== 2) throw new Error('OOW validation failed: unsupported summary schema.');
if (!Array.isArray(summary.recentSeasons) || summary.recentSeasons.length !== Math.min(3, index.standard.seasons.length)) throw new Error('OOW validation failed: invalid recent standard summary.');
if (!Array.isArray(summary.mmoRecentSeasons) || summary.mmoRecentSeasons.length !== Math.min(2, index.mmo.seasons.length)) throw new Error('OOW validation failed: invalid recent MMO summary.');
const assertMetadataOnly = (season) => {
  if (!season || season.season == null || Object.hasOwn(season, 'floors') || Object.hasOwn(season, 'enemies')) throw new Error('OOW validation failed: summary contains full season payload.');
};
summary.recentSeasons.forEach(assertMetadataOnly);
summary.mmoRecentSeasons.forEach(assertMetadataOnly);
for (const season of index.standard.seasons) {
  const shard = read(requireFile(data('oow/data/seasons', `s${String(season.season).padStart(2, '0')}.json`)));
  if (Number(shard.season) !== Number(season.season) || !Array.isArray(shard.floors)) throw new Error(`OOW validation failed: invalid standard shard ${season.season}.`);
}
for (const season of index.mmo.seasons) {
  const shard = read(requireFile(data('oow/data/seasons', `mmo_s${String(season.season).padStart(2, '0')}.json`)));
  if (Number(shard.season) !== Number(season.season) || !Array.isArray(shard.floors)) throw new Error(`OOW validation failed: invalid MMO shard ${season.season}.`);
}
console.log(`Items ........ SUCCESS (${itemRows(gacha).length} Global, ${itemRows(mmoItems).length} MMO)`);
console.log(`Sequential ... SUCCESS (${stageCount} stages)`);
console.log(`FCE .......... SUCCESS (${fce.bosses.length} bosses)`);
console.log(`OOW .......... SUCCESS (${index.standard.seasons.length} standard, ${index.mmo.seasons.length} MMO shards)`);
console.log('VALIDATION ... SUCCESS');
