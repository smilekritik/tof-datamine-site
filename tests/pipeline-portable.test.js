const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'tof-fast-datamine/package-manifest.json'), 'utf8'));
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const portableRoot = path.join(root, 'tof-fast-datamine');

for (const entryPoint of [
  'RUN_EXPORT_SMALL.bat',
  'RUN_EXPORT_FULL.bat',
  'RUN_PROCESS.bat',
  'core/1-export-from-game.ps1',
  'core/2-process-datamine.ps1'
]) {
  assert(fs.existsSync(path.join(portableRoot, entryPoint)), `Portable entry point must exist: ${entryPoint}`);
}

assert(!fs.existsSync(path.join(portableRoot, 'GAME_PATH.txt')), 'Distributed package must not contain a machine-specific GAME_PATH.txt');
assert(!fs.existsSync(path.join(portableRoot, 'core/update-datamine.ps1')), 'Legacy combined update wrapper must not remain in the two-stage package');

for (const relative of fs.readdirSync(path.join(portableRoot, 'core'))) {
  if (!/\.(?:js|ps1|json|md)$/i.test(relative)) continue;
  const source = fs.readFileSync(path.join(portableRoot, 'core', relative), 'utf8');
  assert(!/C:\\2026\\tof/i.test(source), `${relative} must not reference the main repository`);
  assert(!/D:\\TofMods/i.test(source), `${relative} must not contain a developer-machine path`);
}

for (const [name, expected] of Object.entries(packageManifest.processors)) {
  const canonical = path.join(root, 'pipeline/processors', name);
  const packaged = path.join(root, 'tof-fast-datamine/core', name);
  assert.strictEqual(digest(canonical), expected, `${name} canonical hash must match package manifest`);
  assert.strictEqual(digest(packaged), expected, `${name} packaged copy must match canonical source`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tof-sharder-contract-'));
const result = spawnSync(process.execPath, [
  path.join(root, 'pipeline/processors/shard-oow-data.js'),
  `--project-root=${tempRoot}`
], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0, 'Sharder must fail when required oow_stats.json is missing');
assert(!fs.existsSync(path.join(tempRoot, 'datamine/oow/data/index.json')), 'Failed sharder must not publish an empty index');
fs.rmSync(tempRoot, { recursive: true, force: true });

console.log('✓ Portable entry points are self-contained, processor hashes match, and failed sharding leaves no stale release.');
