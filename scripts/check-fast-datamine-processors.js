const fs = require('fs');
const path = require('path');
const {
  ROOT,
  CANONICAL_DIR,
  PACKAGE_ROOT,
  PACKAGE_CORE,
  PROCESSORS,
  sha256
} = require('./sync-fast-datamine');

function verifyProcessorSync(options = {}) {
  const canonicalDir = options.canonicalDir || CANONICAL_DIR;
  const packageRoot = options.packageRoot || PACKAGE_ROOT;
  const packageCore = options.packageCore || PACKAGE_CORE;
  const manifestPath = path.join(packageRoot, 'package-manifest.json');
  const errors = [];

  if (!fs.existsSync(manifestPath)) {
    errors.push(`missing package manifest: ${manifestPath}`);
  }
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
    catch (error) { errors.push(`invalid package manifest JSON: ${error.message}`); }
  }

  const expected = new Set(PROCESSORS);
  if (fs.existsSync(canonicalDir)) {
    for (const name of fs.readdirSync(canonicalDir).filter((item) => item.endsWith('.js'))) {
      if (!expected.has(name)) errors.push(`unexpected canonical processor not registered for packaging: ${name}`);
    }
  }
  if (fs.existsSync(packageCore)) {
    for (const name of fs.readdirSync(packageCore).filter((item) => item.endsWith('.js'))) {
      if (!expected.has(name)) errors.push(`unexpected packaged processor copy: ${name}`);
    }
  }
  if (manifest) {
    const listed = new Set(Object.keys(manifest.processors || {}));
    for (const name of expected) if (!listed.has(name)) errors.push(`manifest is missing processor: ${name}`);
    for (const name of listed) if (!expected.has(name)) errors.push(`manifest has unexpected processor: ${name}`);
  }

  for (const name of PROCESSORS) {
    const canonical = path.join(canonicalDir, name);
    const packaged = path.join(packageCore, name);
    const legacy = path.join(ROOT, 'scripts', name);
    if (!fs.existsSync(canonical)) { errors.push(`missing canonical processor: ${name}`); continue; }
    if (!fs.existsSync(packaged)) { errors.push(`missing packaged processor: ${name}`); continue; }
    const canonicalHash = sha256(canonical);
    const packagedHash = sha256(packaged);
    if (canonicalHash !== packagedHash) {
      errors.push(`processor drift: ${name} (canonical ${canonicalHash}, packaged ${packagedHash})`);
    }
    if (manifest && manifest.processors && manifest.processors[name] !== canonicalHash) {
      errors.push(`manifest hash mismatch: ${name}`);
    }
    if (fs.existsSync(legacy)) errors.push(`unexpected legacy shared copy: scripts/${name}`);
  }

  if (errors.length) throw new Error(errors.join('\n'));
  return PROCESSORS.map((name) => ({ name, hash: sha256(path.join(canonicalDir, name)) }));
}

if (require.main === module) {
  try {
    const verified = verifyProcessorSync();
    for (const item of verified) console.log(`verified ${item.name} ${item.hash}`);
    console.log(`Processor sync check passed (${verified.length} files).`);
  } catch (error) {
    console.error(`[processor-sync-check] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyProcessorSync };
