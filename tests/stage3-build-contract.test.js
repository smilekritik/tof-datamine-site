const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PROCESSORS = path.join(ROOT, 'pipeline', 'processors');
const BUILD = path.join(ROOT, 'pipeline', 'build');
const RAW_FIXTURE = process.env.TOF_STAGE3_RAW_FIXTURE;
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const json = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); };
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tof-stage3-'));

test('contracts never classify generated output as curated-preserve', () => {
  const inputs = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline/contracts/inputs.json')));
  const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline/contracts/outputs.json')));
  assert.deepEqual(new Set(inputs.inputs.map((x) => x.class)), new Set(['required', 'optional', 'curated-preserve']));
  const curated = new Set(outputs.curatedPreserve);
  for (const item of outputs.managed) assert.equal(curated.has(item.path), false, item.path);
});

test('A: zero standard OOW seasons exits non-zero and preserves output', { skip: !RAW_FIXTURE }, () => {
  const root = temp();
  const raw = path.join(root, 'raw');
  const rels = [
    'Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/DT_MonsterStaticData_Overseas.json',
    'Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarRoundConfigDataTable_Overseas.json',
    'Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarMonsterPoolDataTable_Overseas.json'
  ];
  for (const rel of rels) { fs.mkdirSync(path.dirname(path.join(raw, rel)), { recursive: true }); fs.copyFileSync(path.join(RAW_FIXTURE, rel), path.join(raw, rel)); }
  json(path.join(raw, 'Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarSeasonConfigDataTable_Overseas.json'), [{ Rows: {} }]);
  const output = path.join(root, 'datamine/oow/data/oow_stats.json');
  json(output, { sentinel: 'A' });
  const before = fs.readFileSync(output);
  const result = run(path.join(PROCESSORS, 'build-user-stats.js'), [`--raw-dir=${raw}`, `--project-root=${root}`]);
  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readFileSync(output), before);
});

test('B: missing monster table exits non-zero and preserves output', { skip: !RAW_FIXTURE }, () => {
  const root = temp();
  const output = path.join(root, 'datamine/oow/data/oow_stats.json');
  json(output, { sentinel: 'B' });
  const before = fs.readFileSync(output);
  const result = run(path.join(PROCESSORS, 'build-user-stats.js'), [`--raw-dir=${path.join(root, 'empty')}`, `--project-root=${root}`]);
  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readFileSync(output), before);
});

test('C: missing OOW monolith leaves index, summary, and shards unchanged', () => {
  const root = temp();
  const files = ['index.json', 'current/summary.json', 'seasons/s99.json'];
  for (const rel of files) json(path.join(root, 'datamine/oow/data', rel), { sentinel: rel });
  const before = files.map((rel) => fs.readFileSync(path.join(root, 'datamine/oow/data', rel)));
  const result = run(path.join(PROCESSORS, 'shard-oow-data.js'), [`--project-root=${root}`]);
  assert.notEqual(result.status, 0);
  files.forEach((rel, i) => assert.deepEqual(fs.readFileSync(path.join(root, 'datamine/oow/data', rel)), before[i]));
});

test('D: missing Global Items source does not create an empty mapping or overwrite existing', () => {
  const root = temp();
  const output = path.join(root, 'datamine/items/data/merged_mapping_with_original.json');
  json(output, { sentinel: { id: 'D' } });
  const before = fs.readFileSync(output);
  const result = run(path.join(PROCESSORS, 'build-items-json.js'), [`--raw-dir=${path.join(root, 'empty')}`, `--project-root=${root}`]);
  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readFileSync(output), before);
});

test('E: missing required FCE EN Game source cannot false-succeed', () => {
  const root = temp();
  fs.mkdirSync(path.join(root, 'datamine/fce/data/bosses'), { recursive: true });
  const result = run(path.join(PROCESSORS, 'parse-fce-mechanics.js'), [`--raw-dir=${path.join(root, 'empty')}`, `--project-root=${root}`]);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(root, 'datamine/fce/data/Filtered_Game.json')), false);
});

test('F: publication failure halfway rolls all managed roots back', () => {
  const root = temp();
  const target = path.join(root, 'target');
  const stage = path.join(root, 'stage');
  for (const rel of ['items/data', 'seq/data']) {
    json(path.join(target, rel, 'old.json'), { value: `old-${rel}` });
    json(path.join(stage, rel, 'new.json'), { value: `new-${rel}` });
  }
  // fce/data and oow/data are deliberately absent, so failure occurs after two swaps.
  const before = ['items/data', 'seq/data'].map((rel) => fs.readFileSync(path.join(target, rel, 'old.json')));
  const result = run(path.join(BUILD, 'publish-managed.js'), [`--stage-root=${stage}`, `--target-root=${target}`]);
  assert.notEqual(result.status, 0);
  ['items/data', 'seq/data'].forEach((rel, i) => assert.deepEqual(fs.readFileSync(path.join(target, rel, 'old.json')), before[i]));
});
