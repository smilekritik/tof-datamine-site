const fs = require('fs');
const path = require('path');

const rootArg = process.argv.find((arg) => arg.startsWith('--project-root='));
const projectRoot = rootArg
  ? path.resolve(rootArg.slice('--project-root='.length))
  : path.resolve(__dirname, '..', '..');
const OOW_DIR = path.join(projectRoot, 'datamine', 'oow', 'data');
const SEASONS_DIR = path.join(OOW_DIR, 'seasons');
const CURRENT_DIR = path.join(OOW_DIR, 'current');

function createLightweightFloor(fl) {
  return {
    floor: fl.floor,
    unlockDay: fl.unlockDay,
    mobCount: fl.mobCount || (fl.enemies ? fl.enemies.length : 1),
    totalHp: fl.totalHp || fl.maxHp || 0,
    totalHpBillions: fl.totalHpBillions || 0,
    maxHp: fl.maxHp || fl.totalHp || 0,
    maxHpBillions: fl.maxHpBillions || 0,
    rewardDropId: fl.rewardDropId,
    helpPoints: fl.helpPoints,
    difficultySchedule: fl.difficultySchedule || null,
    mutatorCount: (fl.stageMutators || []).length,
    dropBuffCount: (fl.dropBuffs || []).length,
    waveCount: Math.max(1, ...(fl.enemies || []).map(e => e.wave || 1))
  };
}

function createLightweightSeason(s) {
  return {
    season: s.season,
    title: s.title,
    startDate: s.startDate,
    endDate: s.endDate,
    floorCount: s.floorCount || (s.floors ? s.floors.length : 0),
    minFloor: s.minFloor || 1,
    maxFloor: s.maxFloor || (s.floors ? s.floors.length : 28),
    totalSeasonHp: s.totalSeasonHp,
    totalSeasonHpBillions: s.totalSeasonHpBillions,
    finalBossHp: s.finalBossHp,
    maxDifficulty: s.maxDifficulty,
    curveProfile: s.curveProfile,
    difficultySummary: s.difficultySummary,
    floors: (s.floors || []).map(createLightweightFloor)
  };
}

function createSeasonMetadata(s) {
  return {
    season: s.season,
    title: s.title,
    startDate: s.startDate,
    endDate: s.endDate,
    floorCount: s.floorCount || (s.floors ? s.floors.length : 0),
    minFloor: s.minFloor || 1,
    maxFloor: s.maxFloor || (s.floors ? s.floors.length : 28)
  };
}

function parseSeasonDate(value, endOfDay = false) {
  if (!value) return null;
  const normalized = String(value).replace(/-/g, '/');
  const parsed = new Date(normalized + (endOfDay ? ' 23:59:59' : ''));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function selectCurrentSeason(seasons, now = new Date()) {
  if (!Array.isArray(seasons) || !seasons.length) return null;
  const active = seasons.find((season) => {
    const start = parseSeasonDate(season.startDate);
    const end = parseSeasonDate(season.endDate, true);
    return start && end && now >= start && now <= end;
  });
  if (active) return active;
  const started = seasons.filter((season) => {
    const start = parseSeasonDate(season.startDate);
    return start && now >= start;
  });
  return started[started.length - 1] || seasons[seasons.length - 1];
}

function shardOowData() {
  const standardStatsPath = path.join(OOW_DIR, 'oow_stats.json');
  const mmoStatsPath = path.join(OOW_DIR, 'oow_mmo_stats.json');
  const datesPath = path.join(OOW_DIR, 'season_dates.json');
  const buffsPath = path.join(OOW_DIR, 'oow_buffs_catalog.json');

  if (!fs.existsSync(standardStatsPath)) {
    throw new Error(`[required] Missing ${standardStatsPath}; refusing to write an empty index.`);
  }
  const standardData = JSON.parse(fs.readFileSync(standardStatsPath, 'utf8'));
  const mmoData = fs.existsSync(mmoStatsPath) ? JSON.parse(fs.readFileSync(mmoStatsPath, 'utf8')) : { seasons: [] };
  const datesData = fs.existsSync(datesPath) ? JSON.parse(fs.readFileSync(datesPath, 'utf8')) : {};
  const buffsData = fs.existsSync(buffsPath) ? JSON.parse(fs.readFileSync(buffsPath, 'utf8')) : {};

  // 1. Write individual season deep files
  const standardSeasons = standardData.seasons || [];
  if (!Array.isArray(standardSeasons) || standardSeasons.length === 0) {
    throw new Error('[required] oow_stats.json contains zero seasons; existing shards were left untouched.');
  }
  if (!fs.existsSync(mmoStatsPath)) throw new Error(`[required] Missing ${mmoStatsPath}; refusing to retain stale MMO shards.`);
  if (!Array.isArray(mmoData.seasons) || mmoData.seasons.length === 0) throw new Error('[required] oow_mmo_stats.json contains zero seasons.');
  const token = `.stage3-${process.pid}-${Date.now()}`;
  const tempRoot = path.join(OOW_DIR, token);
  const tempSeasons = path.join(tempRoot, 'seasons');
  const tempCurrent = path.join(tempRoot, 'current');
  fs.mkdirSync(tempSeasons, { recursive: true });
  fs.mkdirSync(tempCurrent, { recursive: true });
  standardSeasons.forEach((s) => {
    const pad = String(s.season).padStart(2, '0');
    const filename = `s${pad}.json`;
    const filePath = path.join(tempSeasons, filename);
    fs.writeFileSync(filePath, JSON.stringify(s, null, 2), 'utf8');
  });

  const mmoSeasons = mmoData.seasons || [];
  mmoSeasons.forEach((s) => {
    const pad = String(s.season).padStart(2, '0');
    const filename = `mmo_s${pad}.json`;
    const filePath = path.join(tempSeasons, filename);
    fs.writeFileSync(filePath, JSON.stringify(s, null, 2), 'utf8');
  });

  // 2. Write optional lightweight bootstrap metadata. Full season payloads
  // always come from shards, including the default/current season.
  const currentStandard = selectCurrentSeason(standardSeasons);
  const currentMmo = selectCurrentSeason(mmoSeasons);
  const recentStandard = standardSeasons.slice(-3).map(createSeasonMetadata);
  const recentMmo = mmoSeasons.slice(-2).map(createSeasonMetadata);
  const currentSummary = {
    schemaVersion: 2,
    meta: {
      generatedAt: new Date().toISOString(),
      standardActiveSeason: currentStandard ? currentStandard.season : null,
      mmoActiveSeason: currentMmo ? currentMmo.season : null
    },
    recentSeasons: recentStandard,
    mmoRecentSeasons: recentMmo,
    currentSeason: currentStandard ? createSeasonMetadata(currentStandard) : null,
    mmoCurrentSeason: currentMmo ? createSeasonMetadata(currentMmo) : null
  };
  fs.writeFileSync(path.join(tempCurrent, 'summary.json'), JSON.stringify(currentSummary, null, 2), 'utf8');

  // 3. Write lightweight index.json
  const indexData = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalStandardSeasons: standardSeasons.length,
      totalMmoSeasons: mmoSeasons.length,
      standardActiveSeason: currentStandard ? currentStandard.season : null,
      mmoActiveSeason: currentMmo ? currentMmo.season : null
    },
    standard: {
      seasons: standardSeasons.map(createLightweightSeason)
    },
    mmo: {
      seasons: mmoSeasons.map(createLightweightSeason)
    },
    dates: datesData,
    buffs: buffsData
  };
  const tempIndex = path.join(tempRoot, 'index.json');
  fs.writeFileSync(tempIndex, JSON.stringify(indexData), 'utf8');

  const swaps = [
    [tempSeasons, SEASONS_DIR],
    [tempCurrent, CURRENT_DIR],
    [tempIndex, path.join(OOW_DIR, 'index.json')]
  ];
  const done = [];
  try {
    for (const [source, target] of swaps) {
      const backup = `${target}${token}-backup`;
      if (fs.existsSync(target)) fs.renameSync(target, backup);
      try { fs.renameSync(source, target); } catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup, target); throw error; }
      done.push({ target, backup });
    }
  } catch (error) {
    for (const x of done.reverse()) {
      fs.rmSync(x.target, { recursive: true, force: true });
      if (fs.existsSync(x.backup)) fs.renameSync(x.backup, x.target);
    }
    throw error;
  }
  for (const x of done) {
    try { fs.rmSync(x.backup, { recursive: true, force: true }); }
    catch (error) { console.warn(`[oow-shards] Backup cleanup failed after successful swap: ${error.message}`); }
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (_) { /* non-public scratch */ }

  const indexSizeBytes = fs.statSync(path.join(OOW_DIR, 'index.json')).size;
  const currentSizeBytes = fs.statSync(path.join(CURRENT_DIR, 'summary.json')).size;

  return {
    standardCount: standardSeasons.length,
    mmoCount: mmoSeasons.length,
    indexSizeBytes,
    currentSizeBytes
  };
}

if (require.main === module) {
  console.log('--- Sharding OOW Datasets ---');
  const res = shardOowData();
  console.log(`✓ Generated ${res.standardCount} standard seasons + ${res.mmoCount} MMO seasons`);
  console.log(`✓ Generated index.json (${(res.indexSizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`✓ Generated current/summary.json (${(res.currentSizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`✓ Startup bundle size reduced to ~${((res.indexSizeBytes + res.currentSizeBytes) / 1024).toFixed(1)} KB!`);
}

module.exports = {
  shardOowData,
  createLightweightFloor,
  createLightweightSeason,
  createSeasonMetadata,
  selectCurrentSeason
};
