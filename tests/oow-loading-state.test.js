const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');

(async () => {

// Build a standalone test environment
const BaseClass = class {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  setState(patch, cb) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (cb) cb();
  }
  forceUpdate() {}
  toast() {}
};

const testWindow = {
  location: { pathname: '/datamine/oow/', search: '', hash: '' },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  innerHeight: 900,
  React: {
    Component: BaseClass,
    createRef: () => ({ current: null }),
    createElement: () => ({})
  },
};
const testDocument = {
  documentElement: { lang: 'en' },
  querySelector: () => null,
  querySelectorAll: () => [],
  cookie: ''
};
global.window = testWindow;
global.document = testDocument;
global.location = testWindow.location;
Object.defineProperty(global, 'navigator', {
  configurable: true,
  value: { clipboard: { writeText: () => {} } }
});
let registeredController = null;
testWindow.TofDatamine = {
  dcRuntime: {
    getDependencies: () => ({ React: testWindow.React, DCLogic: BaseClass }),
    registerRootController: (Controller) => {
      registeredController = Controller;
    }
  }
};
const controllerUrl = pathToFileURL(path.join(__dirname, '../datamine/oow/js/oow-bootstrap.js')).href;
const controllerModule = await import(controllerUrl + '?loading-state-test');
const Component = controllerModule.OowController;
assert.strictEqual(registeredController, Component, 'Module bootstrap must register the exported OOW controller');

console.log('--- Testing OOW Initial Loading State & Real Data Transition ---');

// 1. Instantiate Component in initial pre-data state
const comp = new Component({});
comp.state = {
  tab: 'table',
  mode: 'standard',
  seasonIdx: 22,
  filter: 'all',
  diffFilter: 'all',
  unit: 'G',
  active: [19, 20, 21, 22],
  compareOpen: false,
  compareIdx: 21,
  chartTheme: 'dark',
  chartMetric: 'boss',
  chartMode: 'ehp',
  chartRange: 'all',
  jumpMode: 'floor',
  lang: 'en'
};
comp._datasets = null;
comp._seasonCache = new Map();
comp._datesMap = {};
comp._sc = {};

// Test buildSeasons() before data arrives
const preSeasons = comp.buildSeasons('standard');
assert.strictEqual(preSeasons.length, 0, 'buildSeasons() must return 0 seasons when dataset is not yet loaded');
console.log('✓ buildSeasons() returns empty array before dataset arrives (no mock formula).');

// Test renderVals() during initial loading state
const preRender = comp.renderVals();
assert.strictEqual(!!preRender, true, 'preRender must be defined');
assert.strictEqual(preRender.isDataLoaded, false, 'isDataLoaded must be false during initial load');

// Check Season selector placeholders
assert.strictEqual(preRender.seasonPills.length, 3, 'Must render exactly 3 season card placeholders');
preRender.seasonPills.forEach((pill, i) => {
  assert.strictEqual(pill.label, '', `Season placeholder #${i + 1} must have empty label`);
  assert.strictEqual(pill.dates, '', `Season placeholder #${i + 1} must have empty dates`);
  assert.strictEqual(pill.boss, '', `Season placeholder #${i + 1} must have empty boss value`);
  assert.strictEqual(pill.floors, '', `Season placeholder #${i + 1} must have empty floors`);
  assert.strictEqual(pill.color, 'transparent', `Season placeholder #${i + 1} must be transparent`);
});
console.log('✓ Exactly 3 blank season placeholders with zero game data rendered.');

// Check Toolbar and Header state
assert.strictEqual(preRender.activeSeasonLabel, '', 'Active season label must be empty during initial load');
assert.strictEqual(preRender.hasActiveSeasonLabel, false, 'hasActiveSeasonLabel must be false during initial load');
assert.strictEqual(preRender.seasonCountLabel, '', 'Season count label must be empty during initial load');
assert.strictEqual(preRender.heroImg, '', 'Hero boss image must be empty during initial load');
assert.strictEqual(preRender.heroImgVisible, false, 'heroImgVisible must be false during initial load');
console.log('✓ Toolbar, header badge, and floating boss artwork are blank with no placeholder text.');

// Check Floor row placeholders
assert.strictEqual(preRender.rows.length, 10, 'Must render 10 structural floor placeholders');
preRender.rows.forEach((row, i) => {
  assert.strictEqual(row.n, '', `Floor placeholder #${i + 1} must have empty floor number`);
  assert.strictEqual(row.hp, '', `Floor placeholder #${i + 1} must have empty HP`);
  assert.strictEqual(row.max, '', `Floor placeholder #${i + 1} must have empty Max Mob`);
  assert.strictEqual(row.mobs, '', `Floor placeholder #${i + 1} must have empty mobs count`);
  assert.strictEqual(row.chev, '', `Floor placeholder #${i + 1} must have empty chevron`);
  assert.strictEqual(row.segs.length, 0, `Floor placeholder #${i + 1} must have 0 wave segments (dark empty track)`);
});
console.log('✓ Floor table renders 10 structural placeholders with dark empty tracks and ZERO game data.');

// Check Charts & Compare safety
assert.strictEqual(preRender.compareStats.length, 0, 'compareStats must be empty');
assert.strictEqual(preRender.compareOptions.length, 0, 'compareOptions must be empty');
assert.strictEqual(preRender.diffSteps.length, 0, 'diffSteps must be empty');
assert.strictEqual(preRender.diffRows.length, 0, 'diffRows must be empty');
console.log('✓ Charts, comparison, and difficulty tabs safely initialized to empty structures without errors.');

// 2. Test Real Data Transition
const realIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../datamine/oow/data/index.json'), 'utf8'));
const realSummary = JSON.parse(fs.readFileSync(path.join(__dirname, '../datamine/oow/data/current/summary.json'), 'utf8'));

comp.loadSeasonData = async () => null;
comp._showInitialDatasets({
  standard: realIndex.standard,
  mmo: realIndex.mmo
});
comp._datesMap = realIndex.dates || {};

const postSeasons = comp.buildSeasons('standard');
assert.strictEqual(postSeasons.length >= 22, true, `Real dataset must contain at least 22 seasons, got ${postSeasons.length}`);

comp.state.filter = 'all';
const postRender = comp.renderVals();
assert.strictEqual(postRender.isDataLoaded, true, 'isDataLoaded must be true after real data arrives');
assert.strictEqual(postRender.seasonPills.length >= 22, true, 'seasonPills must contain all real seasons');
assert.strictEqual(postRender.seasonPills[0].label, 'S1', 'First season must be S1');
assert.strictEqual(postRender.activeSeasonLabel.includes('Season 22') || postRender.activeSeasonLabel.includes('Сезон 22'), true, 'activeSeasonLabel must reflect Season 22');
assert.strictEqual(postRender.rows.length >= 25, true, 'Floor rows must reflect real season floors');
assert.strictEqual(postRender.rows[0].n, 'F1', 'First floor row must be F1');
assert.strictEqual(postRender.rows[0].hp.length > 0, true, 'Floor row must have real HP');
assert.strictEqual(postRender.rows[0].segs.length > 0, true, 'Floor row must have real wave segments');
assert.strictEqual(postRender.heroImgVisible, true, 'Hero boss art must be visible with real data');

console.log('✓ Real data transitions cleanly: 23 seasons, real F1..F28 floors, real HP values, and boss images.');
console.log('--- ALL OOW LOADING STATE TESTS PASSED ---');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
