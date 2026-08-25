const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const header = fs.readFileSync(path.join(root, 'datamine/shared/header.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'datamine/shared/shell.css'), 'utf8');
const oow = fs.readFileSync(path.join(root, 'datamine/oow/index.html'), 'utf8');
const oowController = fs.readFileSync(path.join(root, 'datamine/oow/js/oow-bootstrap.js'), 'utf8');
const oowAdapters = fs.readFileSync(path.join(root, 'datamine/oow/js/adapters/oow-view-adapters.js'), 'utf8');

assert(/en:\s*"Skip to main content"/.test(header));
assert(/ru:\s*"Перейти к основному содержимому"/.test(header));
assert(/<a class="skip-link" href="#\$\{escapeHtml\(mainTarget\)\}"/.test(header));
assert(/main\.setAttribute\("tabindex", "-1"\)/.test(header));
assert(/\.skip-link:focus-visible/.test(shell));
assert(!/class="dm-skip-link"/.test(oow), 'OOW must use the shared shell skip link');
assert(/aria-current="\{\{ s\.currentAria \}\}"/.test(oow));
assert(!/data-season-pill[^>]*aria-pressed/.test(oow));
assert(/data-oow-dialog="boss"[^>]*tabindex="-1"/.test(oow));
assert(/data-oow-dialog="lightbox"[^>]*aria-label="\{\{ enlargedImageLabel \}\}"[^>]*tabindex="-1"/.test(oow));
assert(/!dialog\.contains\(document\.activeElement\)/.test(oowController), 'Focus trap must recover focus that starts outside the topmost dialog');
assert(/control\.getClientRects\(\)\.length > 0/.test(oowAdapters), 'Focus trap must query currently visible controls on each Tab');

console.log('✓ Stage 5 shared skip-link, season semantics, and dialog-stack contracts are present.');
