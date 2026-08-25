const fs = require('fs');
const path = require('path');
const assert = require('assert');

const core = fs.readFileSync(path.join(__dirname, '../datamine/multype/js/datamine-multype-core.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../datamine/multype/styles/datamine-multype.css'), 'utf8');

assert(/multype-toolbar__control-group[\s\S]*?displayMode[\s\S]*?multype-toolbar__modes/.test(core), 'Display modes must have a labelled control group');
assert(/multype-toolbar__control-group[\s\S]*?renameStatus[\s\S]*?multype-toolbar__toggles/.test(core), 'Rename filters must live in their own labelled control group');
assert(/multype-toolbar__control-group--zoom[\s\S]*?tableScale[\s\S]*?multype-toolbar__zoom/.test(core), 'Zoom controls must have a visible Table scale group');
assert(/multype-table-focus-link[\s\S]*?<svg/.test(core), 'Focus table must render as an identifiable icon action');
assert(/section--multype-data multype-anchor" id="table" data-multype-workspace/.test(core), 'The outer filters + matrix workspace must own #table');
assert(/data-action="focus-table"/.test(core), 'Focus table must have an explicit action handler');
assert(/getSharedHeaderHeight\(\)/.test(core), 'Table focus must measure the shared header offset');
assert(/history\.replaceState/.test(core), 'Table focus hash changes must not add browser history entries');
assert(/workspace\.getBoundingClientRect\(\)\.top > leaveThreshold/.test(core), 'Leaving the table region upward must remove focus context');
assert(!/scrollIntoView/.test(core), 'Table focus must not use un-offset scrollIntoView');
assert(/return \[0\.05, 0\.1, 0\.2, 0\.3,/.test(core), 'Manual zoom must step through 5%, 10%, 20%, and 30%');
assert(/Math\.max\(0\.05, parsed\.value\)/.test(core), 'Saved zoom must allow the 5% minimum');
assert(/return \{ mode: "manual", value: 0\.8 \}/.test(core), 'Default table scale must be 80%');
assert(/resetZoom\(\) \{[\s\S]*?tableZoom = 0\.8/.test(core), 'Reset must restore the 80% default');
assert(/addEventListener\("wheel", this\.handleViewportWheel, \{ passive: false \}\)/.test(core), 'Ctrl+wheel must retain its non-passive listener');
assert(/\.multype-table-focus-link\s*\{[\s\S]*?margin-left:\s*auto;/.test(css), 'Focus table control must align to the right of the summary strip');

const toolbarRule = css.match(/\.multype-toolbar\s*\{([^}]*)\}/);
assert(toolbarRule, 'Toolbar rule must exist');
assert(!/position:\s*sticky/.test(toolbarRule[1]), 'Toolbar must not stick over table content');
assert(/border:\s*1px/.test(toolbarRule[1]), 'Toolbar must be visually separated from the page');
assert(/padding:\s*10px/.test(toolbarRule[1]), 'Toolbar must keep compact technical-strip padding');

const viewportRule = css.match(/\.multype-viewport\s*\{([^}]*)\}/);
assert(viewportRule, 'Viewport rule must exist');
assert(/height:\s*auto/.test(viewportRule[1]), 'Table height must follow its scaled content');
assert(/overflow-x:\s*auto/.test(viewportRule[1]), 'Table must retain horizontal scrolling');
assert(/overflow-y:\s*hidden/.test(viewportRule[1]), 'Table must not create a nested vertical scroller');

console.log('✓ Multype controls and table scrolling remain visually and structurally independent.');
