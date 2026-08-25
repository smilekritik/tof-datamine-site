const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const multypeCore = read('datamine/multype/js/datamine-multype-core.js');
const multypeUi = read('datamine/multype/js/datamine-multype.js');
const itemsCore = read('datamine/items/js/items-core.js');
const itemsBoot = read('datamine/items/js/items.js');
const fce = read('datamine/fce/js/datamine-fce.js');
const wheelFixture = read('tests/fixtures/stage7-multype-wheel.html');
const mobileFixture = read('tests/fixtures/stage7-mobile-routes.html');

assert(/return \{ mode: "manual", value: 0\.8 \}/.test(multypeCore), 'New Multype users must start at 80%');
assert(/resetZoom\(\) \{[\s\S]*?tableZoom = 0\.8/.test(multypeCore), 'Reset must return to the product-defined 80% state');
assert(/Math\.min\(1\.25, Math\.max\(0\.05, parsed\.value\)\)/.test(multypeCore), 'Saved scale must remain compatible and clamp to 5–125%');
assert(/return \[0\.05,[\s\S]*?1\.25\]/.test(multypeCore), 'Manual controls must expose the full 5–125% range');
assert(/calculateFitScale\(\)[\s\S]*?Math\.min\(1\.25, Math\.max\(0\.05/.test(multypeCore), 'Fit must remain a separate operation inside the same allowed range');
assert(/handleViewportWheel\(event\)[\s\S]*?event\.ctrlKey \|\| event\.metaKey[\s\S]*?event\.preventDefault\(\)/.test(multypeCore), 'Ctrl/Meta+wheel must suppress the browser default before changing scale');
assert(/addEventListener\("wheel", this\.handleViewportWheel, \{ passive: false \}\)/.test(multypeCore), 'The wheel listener must remain non-passive');
assert(/aria-label="\$\{escapeHtml\([\s\S]*?tableScale/.test(multypeCore), 'The scale group ARIA label must use the localized Table scale copy');
assert(/tableScale: "Table scale"/.test(multypeUi), 'English scale copy must say Table scale');
assert(/tableScale: "Масштаб таблицы"/.test(multypeUi), 'Russian scale copy must say Масштаб таблицы');
assert(/tof\.datamine\.multype\.tableZoom/.test(multypeCore), 'The existing Multype scale storage key must remain unchanged');
assert(/new pageWindow\.WheelEvent\('wheel'[\s\S]*?ctrlKey: true/.test(wheelFixture), 'The browser fixture must dispatch a real DOM wheel event with ctrlKey=true');
assert(/ctrlWheel\.defaultPrevented/.test(wheelFixture) && /ordinaryWheel\.defaultPrevented/.test(wheelFixture), 'The browser fixture must distinguish modified and ordinary wheel cancellation');
assert(/width="390" height="844"/.test(mobileFixture), 'Stage 7 mobile route verification must use a real narrow viewport');

assert(/async load\(\) \{\s*await this\.loadMode\(this\.state\.mode\)/.test(itemsCore), 'Items initial load must fetch only the active mode');
assert(/modeLoadPromises = new Map\(\)/.test(itemsCore), 'Concurrent Items mode requests must be deduplicated');
assert(/loadedModes = new Set\(\)/.test(itemsCore), 'Loaded Items modes must remain cached');
assert(/await this\.loadMode\(nextMode\)/.test(itemsCore), 'MMO data must load on mode switch');
assert(/merged_mapping_with_original\.json/.test(itemsBoot), 'The Global Items monolith URL must remain compatible');
assert(/merged_mapping_with_original_mmo\.json/.test(itemsBoot), 'The MMO Items monolith URL must remain compatible');
assert(/renderVirtualWindow\(force\)/.test(itemsCore), 'Existing bounded Items DOM rendering must remain in place');

assert(!/prefetchBossData/.test(fce), 'FCE must not prefetch every mechanics JSON after initial render');
assert(!/queueRemainingFullArtPrefetch|startPrefetchQueue|prefetchQueue/.test(fce), 'FCE must not enqueue every full artwork after initial render');
assert(/state\.bossCache\.has\(slug\)/.test(fce), 'Opened FCE mechanics must remain cached by boss');
assert(/imageLoadCache\.get\(path\)/.test(fce), 'Opened FCE artwork must remain cached by path');
assert(/renderBossLoadError\(shell, slug\)/.test(fce) && /fce-card-retry/.test(fce), 'Lazy FCE boss failures must expose a retry action');
assert(/bossLoadError: "Could not load this boss\."/.test(fce), 'FCE retry errors must have English copy');
assert(/bossLoadError: "Не удалось загрузить этого босса\."/.test(fce), 'FCE retry errors must have Russian copy');

console.log('✓ Stage 7 Multype policy, Items lazy mode loading, and FCE interaction-only payload contracts are present.');
