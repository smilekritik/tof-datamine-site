const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  MultypeColumnWindow,
  getMainWidth,
  DESKTOP_GEOMETRY,
  MOBILE_GEOMETRY
} = require('../datamine/multype/js/multype-column-window.js');
const multypeCore = require('../datamine/multype/js/datamine-multype-core.js');

const core = fs.readFileSync(
  path.join(__dirname, '../datamine/multype/js/datamine-multype-core.js'),
  'utf8'
);
const css = fs.readFileSync(
  path.join(__dirname, '../datamine/multype/styles/datamine-multype.css'),
  'utf8'
);
const publicHtml = fs.readFileSync(
  path.join(__dirname, '../datamine/multype/index.html'),
  'utf8'
);
const builderHtml = fs.readFileSync(
  path.join(__dirname, '../datamine-builder/multype/index.html'),
  'utf8'
);

function groups(counts) {
  return counts.map((count) => ({
    subEntries: Array.from({ length: count }, (_, index) => ({ subKey: `sub-${index}` }))
  }));
}

const model = groups([214, 31, 11, 4, 15, 12, 8, 2, 13, 1, 3, 3, 1, 2, 1, 2]);
const controller = new MultypeColumnWindow({ overscanColumns: 2 }).setModel(model, {
  viewportWidth: 1280
});

assert.strictEqual(controller.groups.length, 16, 'All logical Main groups must remain in the geometry model');
assert.strictEqual(
  controller.totalWidth,
  107830,
  'Desktop Together geometry must retain the full logical matrix width'
);
assert.strictEqual(
  getMainWidth(31, DESKTOP_GEOMETRY),
  10310,
  'Main width must include columns, gaps, padding, and borders'
);

const firstPlan = controller.getPlan(0, 1187, 0.8);
const firstMounted = firstPlan.groups.reduce(
  (sum, group) => sum + group.endIndex - group.startIndex,
  0
);
assert(firstMounted > 0 && firstMounted <= 8, 'The initial 80% window must mount only nearby Sub columns');
assert.strictEqual(firstPlan.groups[0].startIndex, 0, 'The first logical column must be reachable');
assert(firstPlan.groups[0].endIndex < 214, 'The giant first Main group must not be mounted in full');

const lastPlan = controller.getPlan(controller.totalWidth * 0.8 - 1187, 1187, 0.8);
assert.strictEqual(lastPlan.groups[15].endIndex, 2, 'The last logical Sub column must be reachable');
assert.strictEqual(lastPlan.groups[0].startIndex, 214, 'Far-left columns must be released at the right edge');

const tinyScalePlan = controller.getPlan(0, 1187, 0.05);
const tinyScaleMounted = tinyScalePlan.groups.reduce(
  (sum, group) => sum + group.endIndex - group.startIndex,
  0
);
assert(tinyScaleMounted < 100, 'Even at 5%, mounted columns must stay bounded by the visible window');
assert(tinyScaleMounted < 323, 'The 5% window must not fall back to rendering all columns');

for (let index = 0; index < 20; index += 1) {
  const repeatedPlan = controller.getPlan(index % 2 ? 0 : controller.totalWidth * 0.8 - 1187, 1187, 0.8);
  const repeatedMounted = repeatedPlan.groups.reduce(
    (sum, group) => sum + group.endIndex - group.startIndex,
    0
  );
  assert(repeatedMounted <= 8, 'Repeated start/end movement must not accumulate mounted columns');
  repeatedPlan.groups.forEach((group) => {
    assert(group.startIndex >= 0, 'Window ranges cannot produce a negative leading spacer');
    assert(group.endIndex >= group.startIndex, 'Window ranges cannot invert spacer geometry');
    assert(group.endIndex <= group.subCount, 'Window ranges cannot duplicate columns past a group boundary');
  });
}

const mobileController = new MultypeColumnWindow().setModel(groups([3, 2]), { viewportWidth: 390 });
assert.strictEqual(mobileController.geometry.subWidth, MOBILE_GEOMETRY.subWidth, 'Narrow viewports must use mobile column geometry');
assert(mobileController.getPlan(0, 390, 0.8).groups[0].endIndex > 0, 'Mobile must hydrate its first visible column');

const rawDataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../datamine/multype/data/module_extra_to_files_mapping3.json'), 'utf8')
);
const rawRenames = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../datamine/multype/data/renames.base.json'), 'utf8')
);
const dataset = multypeCore.normalizeDataset(rawDataset);
const renames = multypeCore.normalizeRenameStore(rawRenames);
const offscreenSearch = multypeCore.buildViewModel(dataset, renames, {
  mode: 'combined',
  search: 'Buff_MMO2_Orange_Skill4',
  mainFilter: '',
  subFilter: '',
  renameFilter: 'all'
});
assert.strictEqual(offscreenSearch.visibleValueCount, 1, 'Search must query the full in-memory dataset');
assert.strictEqual(
  offscreenSearch.groups[0].subEntries[0].values[0].primaryValueKey,
  'Buff_MMO2_Orange_Skill4.json',
  'Search must find a representative value from the final offscreen group'
);

assert(/this\.state\.mode === "combined"/.test(core), 'Windowing must be isolated to Together/Combined screen mode');
assert(/requestAnimationFrame\(\(\) => \{[\s\S]*?updateVirtualWindow/.test(core), 'Scroll hydration must be animation-frame driven');
assert(/addEventListener\("scroll", this\.handleViewportScroll, \{ passive: true \}\)/.test(core), 'The viewport must use a passive scroll listener');
assert(/createImageExportTree[\s\S]*?renderMainColumn\(group\)/.test(core), 'PNG export must retain the canonical full renderer');
assert(/restoreVirtualFocus/.test(core), 'Remounts must implement an explicit focus restoration policy');
assert(/multype-main__body--virtual/.test(css), 'Windowed screen columns must have isolated layout CSS');
assert(/multype-column-window\.js/.test(publicHtml), 'The public Multype page must load the window controller');
assert(/multype-column-window\.js/.test(builderHtml), 'The local rename editor must load the same window controller');

console.log('✓ Stage 9 keeps Together logical data complete while bounding the screen DOM.');
