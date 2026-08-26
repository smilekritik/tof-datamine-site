const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const { processUserOowStats } = require('../pipeline/processors/build-user-stats.js');
const GENERATOR = path.join(ROOT, 'pipeline/build/generate-release-manifest.js');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tof-oow-test-'));
}

test('1. Season dates are generated directly from in-game config tables without manual fallback', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    const oowDir = path.join(tmp, 'datamine', 'oow', 'data');
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(oowDir, { recursive: true });

    // Minimal monster data
    fs.writeFileSync(
      path.join(rawDir, 'DT_MonsterStaticData.json'),
      JSON.stringify([{ Rows: { mob1: { MaxHealth: 1000, PhyDefBase: 100, CommonAtkBase: 50 } } }])
    );

    // Minimal Season Config
    fs.writeFileSync(
      path.join(rawDir, 'OriginWarSeasonConfigDataTable_Overseas.json'),
      JSON.stringify([{
        Rows: {
          '1': { SeasonBeginTime: '2023/2/1 5:00', SeasonEndTime: '2023/4/1 23:59' },
          '22': { SeasonBeginTime: '2026-7-12 5:00:00', SeasonEndTime: '2026-9-11 23:59:59' },
          '23': { SeasonBeginTime: '2026-9-12 5:00:00', SeasonEndTime: '2026-11-11 23:59:59' }
        }
      }])
    );

    // Minimal Round Config
    fs.writeFileSync(
      path.join(rawDir, 'OriginWarRoundConfigDataTable_Overseas.json'),
      JSON.stringify([{
        Rows: {
          r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'], ShowBuffs: [], DropBuffs: [] },
          r22: { OriginSeasonID: 22, OriginRound: 1, WaveMonsterPool: ['p1'], ShowBuffs: [], DropBuffs: [] },
          r23: { OriginSeasonID: 23, OriginRound: 1, WaveMonsterPool: ['p1'], ShowBuffs: [], DropBuffs: [] }
        }
      }])
    );

    // Minimal Pool Config
    fs.writeFileSync(
      path.join(rawDir, 'OriginWarMonsterPoolDataTable_Overseas.json'),
      JSON.stringify([{
        Rows: {
          p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1, MonsterLevel: 70 }] }
        }
      }])
    );

    // Minimal MMO tables
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2026-1-1 0:00:00', SeasonEndTime: '2026-3-1 0:00:00' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_MMO.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData_MMO.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 2000 } } }]));

    processUserOowStats(rawDir, tmp);

    const generatedDates = JSON.parse(fs.readFileSync(path.join(oowDir, 'season_dates.json'), 'utf8'));
    assert.deepEqual(generatedDates['1'], { startDate: '2023-02-01', endDate: '2023-04-01' });
    assert.deepEqual(generatedDates['22'], { startDate: '2026-07-12', endDate: '2026-09-11' });
    assert.deepEqual(generatedDates['23'], { startDate: '2026-09-12', endDate: '2026-11-11' });

    // Assert that season_dates.json contains no manual fallback dates
    assert.notEqual(generatedDates['1'].startDate, '2023-01-15');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('2. Buff catalog is generated from GameplayEffectTipsDataTable and season floors', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    const oowDir = path.join(tmp, 'datamine', 'oow', 'data');
    const buffAssetsDir = path.join(tmp, 'datamine', 'oow', 'assets', 'buffs');
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(oowDir, { recursive: true });
    fs.mkdirSync(buffAssetsDir, { recursive: true });
    fs.writeFileSync(path.join(buffAssetsDir, 'buff_fire.png'), 'existing-public-buff-icon');

    fs.writeFileSync(
      path.join(rawDir, 'DT_MonsterStaticData.json'),
      JSON.stringify([{ Rows: { mob1: { MaxHealth: 1000 } } }])
    );

    // Buff Effect Tips Table
    fs.writeFileSync(
      path.join(rawDir, 'GameplayEffectTipsDataTable_Overseas.json'),
      JSON.stringify([{
        Rows: {
          buff_custom_fire: {
            BuffName: 'Fire Buff Test',
            BuffDescribe: 'Increases Fire damage by 25%.',
            IconPath: '/Game/Resources/Icon/Buff/buff_fire.png'
          }
        }
      }])
    );

    // Localization
    const locDir = path.join(rawDir, 'Hotta', 'Content', 'Localization', 'Game');
    fs.mkdirSync(path.join(locDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(locDir, 'ru'), { recursive: true });
    fs.writeFileSync(
      path.join(locDir, 'en', 'Game.json'),
      JSON.stringify({
        BuffDes: {
          buff_custom_fire_name: 'Fire Mastery',
          buff_custom_fire_des: 'Increases flame damage.'
        }
      })
    );
    fs.writeFileSync(
      path.join(locDir, 'ru', 'Game.json'),
      JSON.stringify({
        BuffDes: {
          buff_custom_fire_name: 'Мастерство огня',
          buff_custom_fire_des: 'Увеличивает урон огнем.'
        }
      })
    );

    fs.writeFileSync(
      path.join(rawDir, 'OriginWarSeasonConfigDataTable_Overseas.json'),
      JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2023/2/1 5:00', SeasonEndTime: '2023/4/1 23:59' } } }])
    );
    fs.writeFileSync(
      path.join(rawDir, 'OriginWarRoundConfigDataTable_Overseas.json'),
      JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'], ShowBuffs: [{ AssetPathName: 'buff_custom_fire' }], DropBuffs: [] } } }])
    );
    fs.writeFileSync(
      path.join(rawDir, 'OriginWarMonsterPoolDataTable_Overseas.json'),
      JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }])
    );

    // MMO tables
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2026-1-1 0:00:00', SeasonEndTime: '2026-3-1 0:00:00' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_MMO.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData_MMO.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 2000 } } }]));

    processUserOowStats(rawDir, tmp);

    const generatedBuffs = JSON.parse(fs.readFileSync(path.join(oowDir, 'oow_buffs_catalog.json'), 'utf8'));
    assert(generatedBuffs.buff_custom_fire, 'Expected buff_custom_fire in catalog');
    assert.equal(generatedBuffs.buff_custom_fire.nameEn, 'Fire Mastery');
    assert.equal(generatedBuffs.buff_custom_fire.nameRu, 'Мастерство огня');
    assert.equal(generatedBuffs.buff_custom_fire.icon, 'assets/buffs/buff_fire.png');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('3. Strict build failure when required season tables are missing', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    assert.throws(() => {
      processUserOowStats(rawDir, tmp);
    }, /Standard OOW inputs incomplete/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('4. Real 6.3.0 dataset meets all OOW contract invariants', () => {
  const seasonDates = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/oow/data/season_dates.json'), 'utf8'));
  const buffCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/oow/data/oow_buffs_catalog.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/oow/data/index.json'), 'utf8'));

  // Season count
  assert.equal(Object.keys(seasonDates).length, 23);
  assert.equal(index.meta.totalStandardSeasons, 23);
  assert.equal(index.meta.totalMmoSeasons, 4);

  // Authoritative season dates
  assert.deepEqual(seasonDates['1'], { startDate: '2023-02-01', endDate: '2023-04-01' });
  assert.deepEqual(seasonDates['22'], { startDate: '2026-07-12', endDate: '2026-09-11' });
  assert.deepEqual(seasonDates['23'], { startDate: '2026-09-12', endDate: '2026-11-11' });

  // Active season is S22 on August 25, 2026
  assert.equal(index.meta.standardActiveSeason, 22);

  // Buff count
  assert(Object.keys(buffCatalog).length > 4000, `Expected > 4000 buffs, got ${Object.keys(buffCatalog).length}`);
});

test('5. Hub season preview layout uses balanced 3-column / 2-row grid', () => {
  const hubCss = fs.readFileSync(path.join(ROOT, 'datamine/styles/hub.css'), 'utf8');
  assert.match(hubCss, /\.oow-season-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(hubCss, /\.oow-season\s*\{[^}]*min-height:\s*52px;/);
});

test('6. Header export details uses 2-column grid alignment', () => {
  const headerCss = fs.readFileSync(path.join(ROOT, 'datamine/shared/header.css'), 'utf8');
  assert.match(headerCss, /\.datamine-header__export-tooltip-row\s*\{[^}]*grid-template-columns:\s*68px 1fr;/);
});

test('7. About snapshot strip uses structured 2-row grid layout without / separators', () => {
  const aboutCss = fs.readFileSync(path.join(ROOT, 'datamine/about/styles/datamine-about.css'), 'utf8');
  assert.match(aboutCss, /\.about-snapshot\s*\{[^}]*grid-template-columns:\s*auto 1fr;/);
  assert.match(aboutCss, /\.about-snapshot__grid\s*\{[^}]*grid-template-columns:\s*minmax\(180px,\s*auto\)\s*1fr;/);

  const aboutJs = fs.readFileSync(path.join(ROOT, 'datamine/about/js/datamine-about.js'), 'utf8');
  assert.doesNotMatch(aboutJs, /about-snapshot__sep/);
});

test('8. OOW enemy placeholder assets exist and hydration maps fallback by enemy type', () => {
  const bootstrapJs = fs.readFileSync(path.join(ROOT, 'datamine/oow/js/oow-bootstrap.js'), 'utf8');
  assert.match(bootstrapJs, /placeholder-boss\.png/);
  assert.match(bootstrapJs, /placeholder-elite\.png/);
  assert.match(bootstrapJs, /placeholder-mob\.png/);
  assert.match(bootstrapJs, /im\.onerror\s*=\s*\(\)\s*=>/);
  assert.match(bootstrapJs, /data-fallback-src/);

  const mobPath = path.join(ROOT, 'datamine/oow/assets/monsters/placeholder-mob.png');
  const elitePath = path.join(ROOT, 'datamine/oow/assets/monsters/placeholder-elite.png');
  const bossPath = path.join(ROOT, 'datamine/oow/assets/monsters/placeholder-boss.png');

  assert.equal(fs.existsSync(mobPath), true, 'mob placeholder png exists');
  assert.equal(fs.existsSync(elitePath), true, 'elite placeholder png exists');
  assert.equal(fs.existsSync(bossPath), true, 'boss placeholder png exists');
});

test('9. Missing Standard Season table when MMO Season table exists FAILS build (forbidden cross-mode recovery)', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    // Standard monster, round, pool present; Standard season MISSING
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 1000 } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_Overseas.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_Overseas.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));

    // MMO tables all present
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2026-1-1 0:00:00', SeasonEndTime: '2026-3-1 0:00:00' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_MMO.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData_MMO.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 2000 } } }]));

    assert.throws(() => {
      processUserOowStats(rawDir, tmp);
    }, /Standard OOW inputs incomplete \(season=false/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('10. Missing Standard Round or Pool table when MMO tables exist FAILS build', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    // Standard monster, season present; Standard round and pool MISSING
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 1000 } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_Overseas.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2023/2/1 5:00', SeasonEndTime: '2023/4/1 23:59' } } }]));

    // MMO tables all present
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2026-1-1 0:00:00', SeasonEndTime: '2026-3-1 0:00:00' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_MMO.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData_MMO.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 2000 } } }]));

    assert.throws(() => {
      processUserOowStats(rawDir, tmp);
    }, /Standard OOW inputs incomplete \(season=true, round=false, pool=false/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('11. Standard base aliases without _Overseas build Standard OOW successfully', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    const oowDir = path.join(tmp, 'datamine', 'oow', 'data');
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(oowDir, { recursive: true });

    // Standard tables using base aliases (no _Overseas)
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 1000 } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2023/2/1 5:00', SeasonEndTime: '2023/4/1 23:59' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));

    // MMO tables
    fs.writeFileSync(path.join(rawDir, 'OriginWarSeasonConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { '1': { SeasonBeginTime: '2026-1-1 0:00:00', SeasonEndTime: '2026-3-1 0:00:00' } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarRoundConfigDataTable_MMO.json'), JSON.stringify([{ Rows: { r1: { OriginSeasonID: 1, OriginRound: 1, WaveMonsterPool: ['p1'] } } }]));
    fs.writeFileSync(path.join(rawDir, 'OriginWarMonsterPoolDataTable_MMO.json'), JSON.stringify([{ Rows: { p1: { PoolMonsters: [{ AttributeID: 'mob1', MonsterCount: 1 }] } } }]));
    fs.writeFileSync(path.join(rawDir, 'DT_MonsterStaticData_MMO.json'), JSON.stringify([{ Rows: { mob1: { MaxHealth: 2000 } } }]));

    const result = processUserOowStats(rawDir, tmp);
    assert.equal(result.seasonsCount, 1);
    assert(fs.existsSync(path.join(oowDir, 'season_dates.json')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('12. generate-release-manifest fails when fresh export-version.json is missing even if stale release-manifest.json is present in rawDir', () => {
  const tmp = createTempDir();
  try {
    const rawDir = path.join(tmp, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    // Put a stale release-manifest.json in rawDir, but NO export-version.json
    fs.writeFileSync(
      path.join(rawDir, 'release-manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        snapshot: { version: '6.1.0-stale', exportedAt: '2024-01-01T00:00:00Z', sources: [{ client: 'Old', branch: 'Old' }] }
      })
    );

    const result = spawnSync(process.execPath, [GENERATOR, `--project-root=${tmp}`, `--raw-dir=${rawDir}`], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr || result.stdout, /Fresh export metadata missing.*export-version\.json/);
    assert.equal(fs.existsSync(path.join(tmp, 'datamine', 'release-manifest.json')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
