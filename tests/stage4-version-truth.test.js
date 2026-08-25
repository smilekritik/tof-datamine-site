const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(ROOT, 'pipeline/build/generate-release-manifest.js');
const makeRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tof-stage4-'));
function runGenerator(metadata) {
  const root = makeRoot();
  const raw = path.join(root, 'raw');
  fs.mkdirSync(raw, { recursive: true });
  fs.writeFileSync(path.join(raw, 'export-version.json'), JSON.stringify(metadata));
  const result = spawnSync(process.execPath, [GENERATOR, `--project-root=${root}`, `--raw-dir=${raw}`], { encoding: 'utf8' });
  return { root, raw, result };
}

test('fresh 6.3.0 export owns manifest and both projections', () => {
  const { root, result } = runGenerator({ version: '6.3.0', lastUpdateIso: '2026-08-24T00:00:00Z', clientName: 'Korea Dev 1', branch: 'TestPC_KR2New' });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'datamine/release-manifest.json')));
  const legacy = JSON.parse(fs.readFileSync(path.join(root, 'datamine/data/export-version.json')));
  const summary = JSON.parse(fs.readFileSync(path.join(root, 'datamine/data/datamine-summary.json')));
  assert.equal(manifest.snapshot.version, '6.3.0');
  assert.equal(legacy.version, manifest.snapshot.version);
  assert.deepEqual(legacy.sources, manifest.snapshot.sources);
  assert.deepEqual(summary.snapshot, manifest.snapshot);
});

test('multiple source clients are preserved in order without selecting an owner', () => {
  const sources = [
    { client: 'Korea Dev 1', branch: 'TestPC_KR2New' },
    { client: 'Global', branch: 'WindowsNoEditor' }
  ];
  const { root, result } = runGenerator({ snapshot: { version: '6.3.0', exportedAt: '2026-08-24T00:00:00Z', sources } });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'datamine/release-manifest.json')));
  assert.deepEqual(manifest.snapshot.sources, sources);
});

test('missing snapshot version exits non-zero and publishes no manifest', () => {
  const { root, result } = runGenerator({ lastUpdateIso: '2026-08-24T00:00:00Z', clientName: 'Korea Dev 1', branch: 'TestPC_KR2New' });
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(root, 'datamine/release-manifest.json')), false);
});

test('runtime metadata has neutral unavailable state and supports every source', () => {
  delete require.cache[require.resolve('../datamine/shared/data-meta.js')];
  const meta = require('../datamine/shared/data-meta.js');
  assert.equal(meta.getSync().version, 'unavailable');
  assert.equal(meta.getSync().available, false);
  meta.set({ schemaVersion: 1, snapshot: { version: '6.3.0', exportedAt: '2026-08-24T00:00:00Z', sources: [
    { client: 'Korea Dev 1', branch: 'TestPC_KR2New' }, { client: 'Global', branch: 'WindowsNoEditor' }
  ] } });
  assert.equal(meta.getSync().version, '6.3.0');
  assert.equal(meta.getSync().sources.length, 2);
});

test('header/About/Changelog contain no independent current-version fallback', () => {
  const header = fs.readFileSync(path.join(ROOT, 'datamine/shared/header.js'), 'utf8');
  const about = fs.readFileSync(path.join(ROOT, 'datamine/about/js/datamine-about.js'), 'utf8');
  const changelog = fs.readFileSync(path.join(ROOT, 'datamine/changelog/js/datamine-changelog.js'), 'utf8');
  assert.doesNotMatch(header, /version:\s*"6\./);
  assert.doesNotMatch(header, /sourceClients\s*\[\s*0\s*\]/);
  assert.match(header, /Version unavailable/);
  assert.match(about, /snapshotLive/);
  assert.doesNotMatch(changelog, /Active \/ Up-to-date/);
});

test('header/About/Changelog format exported snapshot date using DatamineMeta.formatSnapshotDate', () => {
  const header = fs.readFileSync(path.join(ROOT, 'datamine/shared/header.js'), 'utf8');
  const about = fs.readFileSync(path.join(ROOT, 'datamine/about/js/datamine-about.js'), 'utf8');
  const changelog = fs.readFileSync(path.join(ROOT, 'datamine/changelog/js/datamine-changelog.js'), 'utf8');

  assert.match(header, /formatSnapshotDate/);
  assert.match(about, /formatSnapshotDate/);
  assert.match(changelog, /formatSnapshotDate/);

  const meta = require('../datamine/shared/data-meta.js');
  const testIso = '2026-08-24T16:58:14.846Z';
  assert.equal(meta.formatSnapshotDate(testIso, 'en'), '24 Aug 2026');
  assert.equal(meta.formatSnapshotDate(testIso, 'ru'), '24 августа 2026');
});

test('historical, tracker, and Multype provenance boundaries remain intact', () => {
  const history = fs.readFileSync(path.join(ROOT, 'datamine/changelog/js/changelog-data.js'), 'utf8');
  assert.match(history, /version:\s*"6\.3\.0"/);
  assert.equal(fs.existsSync(path.join(ROOT, 'version-current.json')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'datamine/multype/data/version.txt')), true);
});
