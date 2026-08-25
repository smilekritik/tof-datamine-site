const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PROCESSORS, CANONICAL_DIR, PACKAGE_ROOT, PACKAGE_CORE } = require('../scripts/sync-fast-datamine');
const { verifyProcessorSync } = require('../scripts/check-fast-datamine-processors');

verifyProcessorSync();

const mainProcessScript = fs.readFileSync(path.join(__dirname, '../scripts/2-process-datamine.ps1'), 'utf8');
assert(mainProcessScript.includes("pipeline\\processors"), 'Main processing must resolve canonical processors directly');
assert(!mainProcessScript.includes('tof-fast-datamine'), 'Main processing must not depend on the portable package');

const portableProcessScript = fs.readFileSync(path.join(PACKAGE_ROOT, 'core/2-process-datamine.ps1'), 'utf8');
assert(!/(?:\.\.\\|\.\.\/)(?:pipeline|scripts)|C:\\2026\\tof/i.test(portableProcessScript), 'Portable processing must not reference the main repository');

const sharderSource = fs.readFileSync(path.join(CANONICAL_DIR, 'shard-oow-data.js'), 'utf8');
assert(sharderSource.includes('standardSeasons.slice(-3)'), 'Canonical current summary must keep the latest 3 standard seasons');
assert(sharderSource.includes('mmoSeasons.slice(-2)'), 'Canonical current summary must keep the latest 2 MMO seasons');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tof-processor-sync-'));
const tempCore = path.join(tempRoot, 'core');
fs.mkdirSync(tempCore, { recursive: true });
fs.copyFileSync(path.join(PACKAGE_ROOT, 'package-manifest.json'), path.join(tempRoot, 'package-manifest.json'));
for (const name of PROCESSORS) fs.copyFileSync(path.join(PACKAGE_CORE, name), path.join(tempCore, name));

try {
  const drifted = PROCESSORS[0];
  fs.appendFileSync(path.join(tempCore, drifted), '\n// deliberate drift fixture\n');
  assert.throws(
    () => verifyProcessorSync({ canonicalDir: CANONICAL_DIR, packageRoot: tempRoot, packageCore: tempCore }),
    new RegExp(`processor drift: ${drifted.replace('.', '\\.')}`)
  );

  fs.copyFileSync(path.join(PACKAGE_CORE, drifted), path.join(tempCore, drifted));
  const missing = PROCESSORS[1];
  fs.unlinkSync(path.join(tempCore, missing));
  assert.throws(
    () => verifyProcessorSync({ canonicalDir: CANONICAL_DIR, packageRoot: tempRoot, packageCore: tempCore }),
    new RegExp(`missing packaged processor: ${missing.replace('.', '\\.')}`)
  );

  fs.copyFileSync(path.join(PACKAGE_CORE, missing), path.join(tempCore, missing));
  fs.writeFileSync(path.join(tempCore, 'stale-shared-copy.js'), 'module.exports = {};\n');
  assert.throws(
    () => verifyProcessorSync({ canonicalDir: CANONICAL_DIR, packageRoot: tempRoot, packageCore: tempCore }),
    /unexpected packaged processor copy: stale-shared-copy\.js/
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('✓ Processor equality check detects drift, missing files, and unexpected stale copies.');
