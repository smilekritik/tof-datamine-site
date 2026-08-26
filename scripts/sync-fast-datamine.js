const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_DIR = path.join(ROOT, 'pipeline', 'processors');
const PACKAGE_ROOT = path.join(ROOT, 'tof-fast-datamine');
const PACKAGE_CORE = path.join(PACKAGE_ROOT, 'core');
const CURATED_ROOT = path.join(PACKAGE_ROOT, 'curated-inputs', 'datamine');
const BUILD_TOOLS = ['prepare-staging.js', 'validate-datamine.js', 'publish-managed.js', 'generate-release-manifest.js', 'finalize-public-bundle.js'];
const CONTRACTS = ['inputs.json', 'outputs.json'];

const PROCESSORS = [
  'build-user-stats.js', 'extract-oow-deep-intel.js', 'build-fce-index.js',
  'parse-fce-mechanics.js', 'build-seq-data.js', 'build-items-json.js', 'shard-oow-data.js'
];
const STATIC_CORE = [
  ['scripts/monster-image-mapping.json', 'monster-image-mapping.json'],
  ['scripts/generate-fce-previews.ps1', 'generate-fce-previews.ps1']
];
const CURATED_INPUTS = [
  'datamine/fce/data/bosses',
  'datamine/fce/data/fce-known-boss-text-ids.json',
  'datamine/seq/data/seq-mechanics-overrides.json',
  'datamine/items/curated/gacha-overrides.json',
  'datamine/items/curated/mmo-overrides.json',
  'datamine/items/curated/gacha-translations.json',
  'datamine/items/curated/mmo-translations.json',
  'datamine/items/curated/README.md'
];

function sameFile(source, destination) {
  return fs.existsSync(destination) && fs.statSync(source).isFile() && fs.statSync(destination).isFile() &&
    fs.readFileSync(source).equals(fs.readFileSync(destination));
}

function copyEntry(source, destination) {
  if (!fs.existsSync(source)) throw new Error(`Required package input is missing: ${source}`);
  if (fs.statSync(source).isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyEntry(path.join(source, entry.name), path.join(destination, entry.name));
    }
    return false;
  }
  if (sameFile(source, destination)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}
function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  fs.mkdirSync(PACKAGE_CORE, { recursive: true });
  fs.rmSync(CURATED_ROOT, { recursive: true, force: true });
  for (const name of PROCESSORS) {
    const source = path.join(CANONICAL_DIR, name);
    const destination = path.join(PACKAGE_CORE, name);
    const copied = copyEntry(source, destination);
    if (sha256(source) !== sha256(destination)) throw new Error(`Packaged processor hash mismatch: ${name}`);
    console.log(`${copied ? 'copied' : 'unchanged'} processor ${name}`);
  }
  for (const name of BUILD_TOOLS) copyEntry(path.join(ROOT, 'pipeline', 'build', name), path.join(PACKAGE_CORE, 'build', name));
  for (const name of CONTRACTS) copyEntry(path.join(ROOT, 'pipeline', 'contracts', name), path.join(PACKAGE_CORE, 'contracts', name));

  for (const [sourceRel, destinationName] of STATIC_CORE) {
    copyEntry(path.join(ROOT, sourceRel), path.join(PACKAGE_CORE, destinationName));
  }
  for (const sourceRel of CURATED_INPUTS) {
    const relativeToDatamine = path.relative('datamine', sourceRel);
    copyEntry(path.join(ROOT, sourceRel), path.join(CURATED_ROOT, relativeToDatamine));
    console.log(`✓ curated-preserve ${relativeToDatamine}`);
  }
  const manifest = {
    schemaVersion: 1,
    kind: 'portable-processor-package',
    canonicalSource: 'pipeline/processors',
    processors: Object.fromEntries(PROCESSORS.map((name) => [name, sha256(path.join(CANONICAL_DIR, name))])),
    curatedInputs: CURATED_INPUTS.map((item) => path.relative('datamine', item).replace(/\\/g, '/')),
    buildTools: Object.fromEntries(BUILD_TOOLS.map((name) => [name, sha256(path.join(ROOT, 'pipeline', 'build', name))])),
    contracts: Object.fromEntries(CONTRACTS.map((name) => [name, sha256(path.join(ROOT, 'pipeline', 'contracts', name))]))
  };
  const manifestPath = path.join(PACKAGE_ROOT, 'package-manifest.json');
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== manifestContent) {
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
    console.log('updated package-manifest.json');
  } else {
    console.log('unchanged package-manifest.json');
  }
  console.log('Portable package synchronized and verified.');
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(`[sync-fast-datamine] ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { ROOT, CANONICAL_DIR, PACKAGE_ROOT, PACKAGE_CORE, PROCESSORS, CURATED_INPUTS, BUILD_TOOLS, CONTRACTS, sha256, main };
