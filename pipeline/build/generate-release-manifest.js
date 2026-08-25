#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const getArg = (name) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? path.resolve(hit.slice(name.length + 3)) : null;
};

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { throw new Error(`[required] Invalid snapshot metadata ${file}: ${error.message}`); }
}

const BRANCH_NAMES_MAP = {
  TestPC_KR2New: { en: 'Korea Dev 1', ru: 'Корея Dev 1' },
  TestPC_KRNew: { en: 'Korea Dev 2', ru: 'Корея Dev 2' },
  TestPC_IW_3_0_0: { en: 'Taiwan Dev 1', ru: 'Тайвань Dev 1' },
  TestPC_IW_2_5_0: { en: 'Taiwan Dev 2', ru: 'Тайвань Dev 2' },
  OBPC_Xianqian: { en: 'Global Pioneer', ru: 'Глобал Pioneer' },
  AdvLaunch52: { en: 'CN Client', ru: 'CN Клиент' }
};

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }

function normalizeSource(source) {
  const branch = clean(source.branch);
  let client = clean(source.client || source.clientName);
  if (branch === 'TestPC_KR2New' && client === 'Korea Dev 2') client = 'Korea Dev 1';
  if (branch === 'TestPC_KRNew' && client === 'Korea Dev 1') client = 'Korea Dev 2';
  if (!client || !branch) throw new Error('[required] Every snapshot source must contain client/clientName and branch.');
  let clientRu = clean(source.clientRu || source.clientNameRu);
  if (branch === 'TestPC_KR2New' && clientRu === 'Корея Dev 2') clientRu = 'Корея Dev 1';
  if (branch === 'TestPC_KRNew' && clientRu === 'Корея Dev 1') clientRu = 'Корея Dev 2';
  return {
    client,
    branch,
    ...(clientRu ? { clientRu } : {}),
    ...(clean(source.appVersion) ? { appVersion: clean(source.appVersion) } : {}),
    ...(clean(source.hash) ? { hash: clean(source.hash) } : {})
  };
}

function normalizeMetadata(raw) {
  const snapshot = raw.snapshot && typeof raw.snapshot === 'object' ? raw.snapshot : raw;
  const version = clean(snapshot.version || raw.version);
  const exportedAt = clean(snapshot.exportedAt || raw.exportedAt || raw.lastUpdateIso);
  if (!version) throw new Error('[required] Snapshot metadata has no version; no publication is allowed.');
  if (!exportedAt || !Number.isFinite(Date.parse(exportedAt))) throw new Error('[required] Snapshot metadata has no valid exportedAt/lastUpdateIso.');
  let sourceRows = snapshot.sources || raw.sources || raw.sourceClients;
  if (!Array.isArray(sourceRows)) sourceRows = [raw];
  const sources = sourceRows.map(normalizeSource);
  if (!sources.length) throw new Error('[required] Snapshot metadata contains no sources.');
  return { version, exportedAt: new Date(exportedAt).toISOString(), sources };
}

function countObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length : 0; }

function main() {
  const projectRoot = getArg('project-root');
  const rawDir = getArg('raw-dir');
  if (!projectRoot || !rawDir) throw new Error('Usage: generate-release-manifest.js --project-root=<stage> --raw-dir=<raw>');

  const exportVersionFile = path.join(rawDir, 'export-version.json');
  if (!fs.existsSync(exportVersionFile)) {
    throw new Error(`[required] Fresh export metadata missing: ${exportVersionFile} not found. Stale release-manifest fallback is forbidden.`);
  }
  const snapshot = normalizeMetadata(readJson(exportVersionFile));
  const datamineRoot = path.join(projectRoot, 'datamine');
  const dataDir = path.join(datamineRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    snapshot,
    build: { builtAt: new Date().toISOString(), status: 'fresh-success' }
  };
  const projection = {
    schemaVersion: 1,
    version: snapshot.version,
    exportedAt: snapshot.exportedAt,
    lastUpdateIso: snapshot.exportedAt,
    sources: snapshot.sources
  };
  const readDataset = (rel) => {
    const file = path.join(datamineRoot, rel);
    return fs.existsSync(file) ? readJson(file) : null;
  };
  const oow = readDataset('oow/data/index.json');
  const fce = readDataset('fce/data/fce-index.json');
  const seq = readDataset('seq/data/seq-boss-cache.json');
  const items = readDataset('items/data/merged_mapping_with_original.json');
  const multype = readDataset('multype/data/module_extra_to_files_mapping3.json');
  const summary = {
    schemaVersion: 1,
    generatedAt: manifest.build.builtAt,
    snapshot,
    oow: {
      seasonCount: Array.isArray(oow?.standard?.seasons) ? oow.standard.seasons.length : 0,
      seasons: Array.isArray(oow?.standard?.seasons) ? oow.standard.seasons.map((season) => ({
        season: Number(season.season), startDate: season.startDate || '', endDate: season.endDate || '',
        floorCount: Number(season.floorCount || season.floors?.length || 0)
      })) : []
    },
    fce: { bossCount: Array.isArray(fce?.bosses) ? fce.bosses.length : 0 },
    sequential: { floorCount: Number(seq?.meta?.cachedUpToStage || 0), rowCount: Number(seq?.meta?.rowCount || 0) },
    multype: { buffCount: countObject(multype) },
    items: { itemCount: countObject(items) }
  };

  fs.writeFileSync(path.join(datamineRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, 'export-version.json'), `${JSON.stringify(projection, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, 'datamine-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`[release-manifest] snapshot=${snapshot.version}, sources=${snapshot.sources.length}, exported=${snapshot.exportedAt}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { normalizeMetadata, normalizeSource, BRANCH_NAMES_MAP, main };
