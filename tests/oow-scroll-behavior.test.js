const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '../datamine/oow/index.html'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '../datamine/oow/js/oow-bootstrap.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../datamine/oow/styles/oow.css'), 'utf8');

const revealMatch = controller.match(/_scrollRailToSeason\(seasonNum, comfortable = false, preservedScrollTop = null\) \{([\s\S]*?)\n  \}\n\n  getMainBoss/);
assert(revealMatch, 'The inner Seasons reveal helper must exist');
const revealSource = revealMatch[1];

assert(!/\.scrollIntoView\s*\(/.test(revealSource), 'Season reveal must not call scrollIntoView');
assert(!revealSource.includes('window.scroll'), 'Season reveal must not scroll the document');
assert(revealSource.includes('list.scrollTop ='), 'Season reveal must update only the list scrollTop');
assert(revealSource.includes('list.scrollTop = preservedScrollTop'), 'Season changes must restore the prior internal list position before revealing');
assert(revealSource.includes('getBoundingClientRect'), 'Season reveal must use the real list/item hierarchy');
assert(revealSource.includes('if (targetTop >= visibleTop && targetBottom <= visibleBottom) return'), 'Visible selections must not move the list');

assert(/showRailExpanded:\s*!st\.railCollapsed/.test(controller), 'The rail must remain mounted across right-side tabs');
assert(/showRailCollapsed:\s*!!st\.railCollapsed/.test(controller), 'Collapsed rail state must not depend on the active tab');
assert(/this\._scrollRailToSeason\(season, true\)/.test(controller), 'Deep-linked seasons must be revealed inside the rail');
assert(/this\.forceUpdate\(\);\s*\/\/ The first reveal ran against the lightweight season-index[\s\S]*?this\._scrollExpandedFloorIntoView\(f\.floor\);/.test(controller), 'Lazy-loaded floor details must be repositioned after their full height renders');
assert(/fullDataPromise\.then\(\(\) => \{[\s\S]*?this\._scrollExpandedFloorIntoView\(dl\.floor\);/.test(controller), 'Deep-linked floor details must be repositioned after full data renders');
assert(/if \(!drawerEl\) \{[\s\S]*?setTimeout\(\(\) => this\._scrollExpandedFloorIntoView\(floorNum, attemptsRemaining - 1\), 50\);/.test(controller), 'Floor focus must wait for the expanded drawer instead of accepting the row alone');
assert(/if \(this\._prevExpandedFloor !== this\.state\.expandedFloor\)[\s\S]*?this\._scrollExpandedFloorIntoView\(this\.state\.expandedFloor\);/.test(controller), 'Floor focus must run from the post-render lifecycle for clicks and URL state');
assert(/this\.loadDatamineData\(\)\.then\(\(\) => \{[\s\S]*?\[250, 1000\]\.forEach[\s\S]*?this\._scrollExpandedFloorIntoView\(floor\);/.test(controller), 'Initial floor deep links must re-check focus after bootstrap layout settles');

assert(/\.oow-season-aside\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?align-self:\s*flex-start;/.test(css), 'The outer Seasons rail must be viewport-sticky');
assert(/height:\s*calc\(100vh - var\(--oow-season-sticky-top\)/.test(css), 'Rail height must stay below the fixed header at every document scroll position');
assert(!/margin-bottom:\s*calc\(-1/.test(css), 'Desktop layout must not use negative margin-bottom that pulls footer under the season rail');
assert(/\.oow-main-layout\s*\{[\s\S]*?min-height:\s*calc\(100dvh - var\(--oow-season-sticky-top\)/.test(css), 'Desktop layout maintains containing-block travel');
assert(!/rail\.style\.transform/.test(controller), 'Sticky clearance must be layout-owned rather than corrected with a scroll-time transform');
assert(/\.oow-season-rail-scroll\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior-y:\s*contain;/.test(css), 'Only the inner Seasons list must own vertical overflow');
assert(/@media \(max-width: 900px\)[\s\S]*?\.oow-season-aside\s*\{[^}]*position:\s*static\s*!important;/.test(css), 'The existing narrow/mobile rail behavior must remain static');
assert(/<button type="button"[^>]*data-season-pill/.test(html), 'Season pills must be native keyboard controls');
assert(/data-season-pill[^>]*aria-current=/.test(html), 'The active season must expose aria-current instead of a pressed-state approximation');
assert(/data-oow-dialog="boss" role="dialog" aria-modal="true"/.test(html), 'Boss modal must expose the dialog contract');
assert(/data-oow-dialog="lightbox" role="dialog" aria-modal="true"/.test(html), 'Nested lightbox must expose the dialog contract');
assert(/event\.key === 'Escape'[\s\S]*?event\.key !== 'Tab'/.test(controller), 'Dialogs must support Escape and a Tab focus trap');
assert(/_modalReturnFocus\.focus\(\)/.test(controller) && /_zoomReturnFocus\.focus\(\)/.test(controller), 'Both dialog layers must return focus');
assert(/_syncDialogInertState\(modalOpen, zoomOpen\)/.test(controller), 'Background and underlying dialogs must follow the active dialog stack');
assert(/closeImageLabel:\s*'Закрыть изображение'/.test(controller) && /closeImageLabel:\s*'Close image'/.test(controller), 'Image-dialog close labels must follow EN/RU locale');

console.log('✓ OOW document scrolling and Seasons-list scrolling are contractually independent.');
