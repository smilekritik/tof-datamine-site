const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('Korea Dev source mapping produces canonical human-readable labels', () => {
  // Test producer logic from generate-release-manifest
  const { normalizeSource } = require('../pipeline/build/generate-release-manifest.js');
  const kr2 = normalizeSource({ branch: 'TestPC_KR2New', client: 'Korea Dev 2', clientRu: 'Корея Dev 2' });
  assert.equal(kr2.client, 'Korea Dev 1');
  assert.equal(kr2.clientRu, 'Корея Dev 1');
  assert.equal(kr2.branch, 'TestPC_KR2New');

  const kr1 = normalizeSource({ branch: 'TestPC_KRNew', client: 'Korea Dev 1', clientRu: 'Корея Dev 1' });
  assert.equal(kr1.client, 'Korea Dev 2');
  assert.equal(kr1.clientRu, 'Корея Dev 2');
  assert.equal(kr1.branch, 'TestPC_KRNew');

  // Test data-meta.js runtime
  delete require.cache[require.resolve('../datamine/shared/data-meta.js')];
  const meta = require('../datamine/shared/data-meta.js');
  meta.set({
    schemaVersion: 1,
    snapshot: {
      version: '6.3.0',
      exportedAt: '2026-08-24T00:00:00Z',
      sources: [{ branch: 'TestPC_KR2New' }]
    }
  });
  const resolved = meta.getSync();
  assert.equal(resolved.sources[0].client, 'Korea Dev 1');
  assert.equal(resolved.sources[0].clientRu, 'Корея Dev 1');

  // Test that release manifest and projections match
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/release-manifest.json'), 'utf8'));
  const exportVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/data/export-version.json'), 'utf8'));
  const summary = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/data/datamine-summary.json'), 'utf8'));

  assert.equal(manifest.snapshot.sources[0].client, 'Korea Dev 1');
  assert.equal(manifest.snapshot.sources[0].clientRu, 'Корея Dev 1');
  assert.equal(exportVersion.sources[0].client, 'Korea Dev 1');
  assert.equal(summary.snapshot.sources[0].client, 'Korea Dev 1');

  // Internal endpoint mappings remain untouched
  const tracker = fs.readFileSync(path.join(ROOT, 'version-tracker.js'), 'utf8');
  assert.match(tracker, /'korea1':\s*'https:\/\/htkrydpatch1\.wmupd\.com\/clientRes\/TestPC_KR2New/);
  assert.match(tracker, /'korea2':\s*'https:\/\/htkrydpatch1\.wmupd\.com\/clientRes\/TestPC_KRNew/);
});

test('Season preview dates hide the year while underlying data preserves full ISO dates', () => {
  // Underlying data check
  const seasonDates = JSON.parse(fs.readFileSync(path.join(ROOT, 'datamine/oow/data/season_dates.json'), 'utf8'));
  assert.match(seasonDates['1'].startDate, /^2023-02-01$/);
  assert.match(seasonDates['23'].startDate, /^2026-09-12$/);

  // Hub script check: formatDate returns DD.MM without year
  const hubSource = fs.readFileSync(path.join(ROOT, 'datamine/js/hub.js'), 'utf8');
  assert.match(hubSource, /return `\$\{String\(parts\[2\]\)\.padStart\(2, "0"\)\}\.\$\{String\(parts\[1\]\)\.padStart\(2, "0"\)\}`;/);
  assert.doesNotMatch(hubSource, /function formatDate\([^)]*\)\s*\{[\s\S]*?parts\[0\]/);
});

test('Sequential second chart stack is spaced +10px lower and hero title matches contract', () => {
  const seqCss = fs.readFileSync(path.join(ROOT, 'datamine/seq/styles/datamine-seq.css'), 'utf8');
  assert.match(seqCss, /\.seq-chart-stack\s*\{[^}]*margin-top:\s*24px;/);
  assert.match(seqCss, /\.page--datamine-seq \.hero__title\s*\{[^}]*font-size:\s*26px;/);
  assert.match(seqCss, /\.page--datamine-seq \.hero__title\s*\{[^}]*line-height:\s*1\.25;/);
});

test('Shared footer includes Changelog in EN and RU with correct routes', () => {
  const footerSource = fs.readFileSync(path.join(ROOT, 'datamine/shared/footer.js'), 'utf8');
  assert.match(footerSource, /key:\s*"changelog",\s*href:\s*"changelog\/"/);
  assert.match(footerSource, /changelog:\s*"Changelog"/);
  assert.match(footerSource, /changelog:\s*"История изменений"/);
});

test('OOW season rail does not overlap footer at max scroll', () => {
  const oowCss = fs.readFileSync(path.join(ROOT, 'datamine/oow/styles/oow.css'), 'utf8');
  assert.doesNotMatch(oowCss, /margin-bottom:\s*calc\(-1/);
  assert.match(oowCss, /\.oow-main-layout\s*\{[^}]*margin-bottom:\s*24px;/);
  assert.match(oowCss, /--oow-season-sticky-top:\s*76px;/);
});

test('Page heading tokens and styles are unified across public routes', () => {
  const shellCss = fs.readFileSync(path.join(ROOT, 'datamine/shared/shell.css'), 'utf8');
  assert.match(shellCss, /\.dm-page-title\s*\{[^}]*font-size:\s*26px;/);
  assert.match(shellCss, /\.dm-page-title\s*\{[^}]*font-weight:\s*700;/);
  assert.match(shellCss, /\.dm-page-title\s*\{[^}]*line-height:\s*1\.25;/);

  const baseCss = fs.readFileSync(path.join(ROOT, 'datamine/shared/base.css'), 'utf8');
  assert.match(baseCss, /\.hero__title\s*\{[^}]*font-size:\s*26px;/);
  assert.match(baseCss, /\.hero__title\s*\{[^}]*line-height:\s*1\.25;/);

  const multypeCss = fs.readFileSync(path.join(ROOT, 'datamine/multype/styles/datamine-multype.css'), 'utf8');
  assert.match(multypeCss, /\.page--datamine-multype \.hero__title\s*\{[^}]*font-size:\s*26px;/);

  const itemsCss = fs.readFileSync(path.join(ROOT, 'datamine/items/styles/items.css'), 'utf8');
  assert.match(itemsCss, /\.items-title\s*\{[^}]*font-size:\s*26px;/);
  assert.match(itemsCss, /\.items-title\s*\{[^}]*line-height:\s*1\.25;/);

  const fceCss = fs.readFileSync(path.join(ROOT, 'datamine/fce/styles/datamine-fce.css'), 'utf8');
  assert.match(fceCss, /\.page--datamine-fce \.hero__title\s*\{[^}]*font-size:\s*26px;/);
});

test('About page data formatting, lineage traces, and pipeline copy conform to current architecture', () => {
  delete require.cache[require.resolve('../datamine/shared/data-meta.js')];
  const meta = require('../datamine/shared/data-meta.js');
  
  // Format snapshot date test
  const dateEn = meta.formatSnapshotDate('2026-08-24T16:58:14.846Z', 'en');
  const dateRu = meta.formatSnapshotDate('2026-08-24T16:58:14.846Z', 'ru');
  assert.equal(dateEn, '24 Aug 2026');
  assert.equal(dateRu, '24 августа 2026');

  // About script validation
  const aboutSource = fs.readFileSync(path.join(ROOT, 'datamine/about/js/datamine-about.js'), 'utf8');
  
  // No decorative numbering classes
  assert.doesNotMatch(aboutSource, /about-timeline-step__num/);
  // No legacy wrapper commands in normal about copy
  assert.doesNotMatch(aboutSource, /update:datamine/);
  assert.doesNotMatch(aboutSource, /export:game/);
  // Uses canonical process command
  assert.match(aboutSource, /npm run process:datamine/);
  
  // Data traces cover all 6 core datasets
  assert.match(aboutSource, /oow:\s*\{/);
  assert.match(aboutSource, /sequential:\s*\{/);
  assert.match(aboutSource, /fce:\s*\{/);
  assert.match(aboutSource, /items:\s*\{/);
  assert.match(aboutSource, /multype:\s*\{/);
  assert.match(aboutSource, /meta:\s*\{/);

  // Accurate OOW public files
  assert.match(aboutSource, /datamine\/oow\/data\/index\.json/);
  assert.match(aboutSource, /datamine\/oow\/data\/current\/summary\.json/);
  assert.match(aboutSource, /datamine\/oow\/data\/seasons\/sNN\.json/);

  // Multype Python scanner separation
  assert.match(aboutSource, /Tower-of-fantasy-exporter-scanner/);

  // Roles terminology
  assert.match(aboutSource, /badgeGame:\s*"GAME DATA"/);
  assert.match(aboutSource, /badgeGame:\s*"ИГРОВЫЕ ДАННЫЕ"/);
  assert.match(aboutSource, /badgeRuntime:\s*"PUBLIC RUNTIME"/);
  assert.match(aboutSource, /badgeRuntime:\s*"ДАННЫЕ САЙТА"/);

  // Technical lineage verifications
  assert.doesNotMatch(aboutSource, /virtualized-table\.js/);
  assert.match(aboutSource, /multype-column-window\.js/);
  assert.doesNotMatch(aboutSource, /1M\+/);
  assert.doesNotMatch(aboutSource, /1,277,767/);
  assert.match(aboutSource, /OriginWarSeasonConfigDataTable_Overseas\.json/);
  assert.match(aboutSource, /OriginWarRoundConfigDataTable_Overseas\.json/);
  assert.match(aboutSource, /OriginWarMonsterPoolDataTable_Overseas\.json/);
  assert.match(aboutSource, /raw_exports\/export-version\.json/);
  assert.match(aboutSource, /maxDeveloperId/);
});

test('Hub Sequential preview labels use G unit for gigabytes', () => {
  const hubHtml = fs.readFileSync(path.join(ROOT, 'datamine/index.html'), 'utf8');
  assert.match(hubHtml, /<span>F15 · 2\.4G<\/span>/);
  assert.match(hubHtml, /<span>F30 · 27\.4G<\/span>/);
  assert.doesNotMatch(hubHtml, /<span>F15 · 2\.4B<\/span>/);
  assert.doesNotMatch(hubHtml, /<span>F30 · 27\.4B<\/span>/);
});
