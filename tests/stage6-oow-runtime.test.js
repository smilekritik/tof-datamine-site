const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const publicHtml = read('datamine/oow/index.html');
const builderHtml = read('datamine-builder/oow/index.html');
const support = read('datamine/oow/js/support.js');
const controller = read('datamine/oow/js/oow-bootstrap.js');
const summaryFile = path.join(root, 'datamine/oow/data/current/summary.json');
const indexFile = path.join(root, 'datamine/oow/data/index.json');
const summary = json('datamine/oow/data/current/summary.json');
const index = json('datamine/oow/data/index.json');
const outputs = json('pipeline/contracts/outputs.json');

const forbiddenRuntime = ['oow_stats.json', 'oow_mmo_stats.json', 'oow_deep_intel.json', 'oow_current_seasons.json'];
for (const artifact of forbiddenRuntime) {
  assert(!publicHtml.includes(artifact), `Public OOW must not reference ${artifact}`);
  assert(!builderHtml.includes(artifact), `OOW Builder must not reference ${artifact}`);
  assert(!fs.existsSync(path.join(root, 'datamine/oow/data', artifact)), `Public replacement data must not contain ${artifact}`);
}
assert(!controller.includes('loadFullDatamineData'), 'Public OOW must not retain a monolith loader');
assert(/dataError:\s*null/.test(controller) && /seasonError:\s*null/.test(controller), 'Controlled index and shard errors must exist');
assert(/retryRuntime/.test(controller) && /role="alert" class="oow-runtime-error"/.test(publicHtml), 'Runtime failures must expose a retryable visible alert');
assert(/requestedSeasonNum[\s\S]*?activeSeasonNum/.test(controller), 'Deep-link season must be selected before the initial shard request');
assert(/_seasonRequests = new Map\(\)/.test(controller), 'Concurrent/repeated shard loads must share an in-flight request');

assert.strictEqual(summary.schemaVersion, 2);
assert.strictEqual(summary.recentSeasons.length, Math.min(3, index.standard.seasons.length));
assert.strictEqual(summary.mmoRecentSeasons.length, Math.min(2, index.mmo.seasons.length));
for (const season of [...summary.recentSeasons, ...summary.mmoRecentSeasons, summary.currentSeason, summary.mmoCurrentSeason]) {
  assert(season && season.season != null);
  assert(!Object.hasOwn(season, 'floors'), 'Summary metadata must not contain full floors');
}
assert(fs.statSync(summaryFile).size < fs.statSync(indexFile).size / 10, 'Summary must remain materially smaller than the authoritative index');
assert.strictEqual(Number(index.meta.standardActiveSeason), Number(summary.meta.standardActiveSeason));

assert(support.includes('const parsed = parseDcDocument(doc)'), 'Runtime must parse the already-loaded document');
assert(/runtime\.markFetched\(rootName\);[\s\S]*?runtime\.registerLogic\(rootName, registeredRootController\);[\s\S]*?runtime\.adoptParsed\(rootName, parsed\)/.test(support), 'Static controller registration must precede component creation');

assert.deepStrictEqual(new Set(outputs.buildIntermediates), new Set(forbiddenRuntime.map((name) => `oow/data/${name}`)));
for (const artifact of outputs.buildIntermediates) {
  assert(!outputs.managed.some((entry) => entry.path === artifact), `${artifact} must not be a public managed output`);
}
assert(read('scripts/2-process-datamine.ps1').includes("finalize-public-bundle.js"));
assert(!read('scripts/2-process-datamine.ps1').includes("Invoke-CanonicalProcessor 'extract-oow-deep-intel.js'"));
assert(read('tof-fast-datamine/core/2-process-datamine.ps1').includes("finalize-public-bundle.js"));

console.log('✓ Stage 6 authoritative OOW index/shard runtime and public-bundle contracts are present.');
