const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const shared = read('datamine/shared/scrollbars.css');
const oowCss = read('datamine/oow/styles/oow.css');
const oowHtml = read('datamine/oow/index.html');
const multypeCore = read('datamine/multype/js/datamine-multype-core.js');
const multypeHtml = read('datamine/multype/index.html');
const seqHtml = read('datamine/seq/index.html');
const itemsCore = read('datamine/items/js/items-core.js');

assert(/\.dm-scrollbar\s*\{[\s\S]*?scrollbar-width:\s*thin;[\s\S]*?scrollbar-color:/.test(shared), 'Shared primitive must include standard scrollbar properties');
assert(/\.dm-scrollbar::\-webkit-scrollbar\s*\{[\s\S]*?width:\s*8px;[\s\S]*?height:\s*8px;/.test(shared), 'Shared primitive must style both native axes');
assert(/\.dm-scrollbar::\-webkit-scrollbar-corner/.test(shared), 'Shared primitive must style the scrollbar corner');
assert(/dm-scrollbar dm-scrollbar--slim/.test(oowHtml), 'OOW Seasons rail must consume the approved slim shared variant');
assert(/<html lang="en" class="dm-scrollbar dm-scrollbar--slim">/.test(oowHtml), 'OOW scrolling root must keep the Seasons rail appearance');
assert(!/oow-season-rail-scroll::\-webkit-scrollbar/.test(oowCss), 'OOW must not retain duplicate rail scrollbar rules');
assert(/multype-viewport dm-scrollbar/.test(multypeCore), 'Multype matrix must consume the shared scrollbar');
assert(/<html lang="en" class="dm-scrollbar dm-scrollbar--slim">/.test(multypeHtml), 'Multype scrolling root must match OOW Seasons');
assert(/seq-table-wrap dm-scrollbar/.test(seqHtml), 'Sequential table overflow must consume the shared scrollbar');
assert(/<html lang="en" class="dm-scrollbar dm-scrollbar--slim">/.test(seqHtml), 'Sequential scrolling root must match OOW Seasons');
assert(/items-table-wrap dm-scrollbar/.test(itemsCore), 'Items virtual table must consume the shared scrollbar');

console.log('✓ Datamine data scrollers share the extracted OOW scrollbar primitive.');
