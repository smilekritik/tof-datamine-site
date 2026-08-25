const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const publicHtml = read('datamine/oow/index.html');
const builderHtml = read('datamine-builder/oow/index.html');
const support = read('datamine/oow/js/support.js');
const bootstrap = read('datamine/oow/js/oow-bootstrap.js');
const domainSource = read('datamine/oow/js/domain/oow-domain.js');
const adapterSource = read('datamine/oow/js/adapters/oow-view-adapters.js');
const domainPath = path.join(root, 'datamine/oow/js/domain/oow-domain.js');

assert(!publicHtml.includes('data-dc-script') && !builderHtml.includes('data-dc-script'), 'OOW HTML must not contain executable controller source');
assert(publicHtml.includes('type="module" src="./js/oow-bootstrap.js?v=1"'), 'Public OOW must load the static module bootstrap');
assert(builderHtml.includes('type="module" src="./js/oow-bootstrap.js?v=1"'), 'Builder OOW must load the same static module bootstrap');
assert(publicHtml.indexOf('./js/support.js') < publicHtml.indexOf('./js/oow-bootstrap.js'), 'Runtime facade must load before the module bootstrap');
assert(builderHtml.indexOf('./js/support.js') < builderHtml.indexOf('./js/oow-bootstrap.js'), 'Builder runtime facade must load before the module bootstrap');
assert(/registerRootController\(OowController\)/.test(bootstrap), 'Bootstrap must register a normal controller class');
assert(/runtime\.registerLogic\(rootName, registeredRootController\)/.test(support), 'Runtime must adopt the registered controller directly');

for (const [name, source] of [['support', support], ['bootstrap', bootstrap], ['domain', domainSource], ['adapters', adapterSource]]) {
  assert(!/\bnew\s+Function\b/.test(source), `${name} must not use Function constructor`);
  assert(!/\beval\s*\(/.test(source), `${name} must not use eval`);
  assert(!/Babel|babel-7\.29/.test(source), `${name} must not retain Babel loader code`);
}
assert(!/walkXImport|createExternalModules/.test(support), 'Orphan x-import execution branches must be removed');
assert(!fs.existsSync(path.join(root, 'datamine/vendor/babel-7.29.0.min.js')), 'Babel asset must be removed');

(async () => {
  const domain = await import(pathToFileURL(domainPath).href + '?stage10');
  const fixtures = new Map([
    ['boss001', 1],
    ['Boss_#00042', 42],
    ['BlueprintGeneratedClass /Game/Monster/Boss_hum_017.Boss_hum_017_C', 17],
    ['MON_BOSS_009_ID', 9],
    ['', null],
    ['elite_009', null]
  ]);
  for (const [value, expected] of fixtures) {
    assert.strictEqual(domain.extractBossNumber(value), expected, `boss-number fixture failed: ${value}`);
  }

  const seasons = [
    { season: 1, startISO: '2026-01-01', endISO: '2026-01-31' },
    { season: 2, startISO: '2026-02-01', endISO: '2026-02-28' }
  ];
  assert.strictEqual(domain.getActiveSeasonNumber(seasons, new Date('2026-02-10T12:00:00')), 2);
  assert.strictEqual(domain.getActiveSeasonNumber(seasons, new Date('2026-03-10T12:00:00')), 2);
  assert.strictEqual(domain.getActiveSeasonNumber(seasons, new Date('2025-12-10T12:00:00')), 2);
  assert.deepStrictEqual(
    domain.parseOowDeepLink({ read: () => ({ s: '10', mode: 'mmo', tab: 'charts', floor: '28', mob: 'boss_030_EX' }) }),
    { mode: 'mmo', season: 10, tab: 'charts', floor: 28, mob: 'boss_030_EX' }
  );
  assert.strictEqual(
    domain.resolveFceBoss(
      { monsterType: 'BS_MONSTER_BOSS', blueprint: 'BlueprintGeneratedClass /Game/Boss_hum_017_C' },
      { bosses: [{ slug: 'boss-17', boss_num: 17 }] }
    ).slug,
    'boss-17'
  );
  assert.strictEqual(domain.pluralRu(22, 'сезон', 'сезона', 'сезонов'), 'сезона');

  console.log('✓ Stage 10 static controller registration, no-eval runtime, no-Babel cleanup, module order, and pure domain fixtures are valid.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
