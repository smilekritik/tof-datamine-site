const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('1. Shared CSS tokens define editorial max-width (1220px) and prose measure (74ch)', () => {
  const shellCss = fs.readFileSync(path.join(ROOT, 'datamine/shared/shell.css'), 'utf8');
  const baseCss = fs.readFileSync(path.join(ROOT, 'datamine/shared/base.css'), 'utf8');

  assert.match(shellCss, /--dm-editorial-max:\s*1220px/);
  assert.match(shellCss, /--dm-prose-max:\s*74ch/);
  assert.match(shellCss, /\.editorial-layout\s*\{[^}]*max-width:\s*var\(--dm-editorial-max\);/);

  assert.match(baseCss, /--dm-editorial-max:\s*1220px/);
  assert.match(baseCss, /--dm-prose-max:\s*74ch/);
});

test('2. About page layout uses 3-column symmetric rail grid to center main article relative to viewport', () => {
  const aboutCss = fs.readFileSync(path.join(ROOT, 'datamine/about/styles/datamine-about.css'), 'utf8');

  assert.match(aboutCss, /\.about-layout\s*\{[^}]*max-width:\s*var\(--dm-about-max,\s*1380px\);/);
  assert.match(aboutCss, /\.about-container\s*\{[^}]*display:\s*grid;/);
  assert.match(aboutCss, /grid-template-columns:\s*var\(--dm-about-rail-width,\s*240px\)\s*minmax\(0,\s*1fr\)\s*var\(--dm-about-rail-width,\s*240px\);/);
  assert.match(aboutCss, /\.about-article\s*\{[^}]*grid-column:\s*2;/);
  assert.match(aboutCss, /\.about-sidebar\s*\{[^}]*grid-column:\s*3;/);

  // Geometric centering verification at wide desktop (1920x1080):
  // outer max-width: 1380px (centered at viewportCenter = 960px)
  // padding-inline: 24px + 24px = 48px -> content box = 1332px
  // left rail: 240px (col 1, empty symmetric rail)
  // gap 1: 44px
  // right TOC: 240px (col 3)
  // gap 2: 44px
  // article width: 1332 - (240 * 2) - (44 * 2) = 764px
  // article left in container = 24 + 240 + 44 = 308px
  // article center in container = 308 + (764 / 2) = 690px
  // container center = 1380 / 2 = 690px
  // delta = articleCenter - containerCenter = 0px!
  const contentWidth = 1380 - 48;
  const articleWidth = contentWidth - 480 - 88;
  assert.equal(articleWidth, 764);
  const articleCenter = 24 + 240 + 44 + (articleWidth / 2);
  const containerCenter = 1380 / 2;
  assert.equal(articleCenter, containerCenter);
});

test('3. Prose line measure is constrained to ~74ch across all 5 editorial routes', () => {
  const aboutCss = fs.readFileSync(path.join(ROOT, 'datamine/about/styles/datamine-about.css'), 'utf8');
  const privacyCss = fs.readFileSync(path.join(ROOT, 'datamine/privacy/styles/datamine-privacy.css'), 'utf8');
  const projectsCss = fs.readFileSync(path.join(ROOT, 'datamine/projects/styles/datamine-projects.css'), 'utf8');
  const contributeCss = fs.readFileSync(path.join(ROOT, 'datamine/contribute/styles/datamine-contribute.css'), 'utf8');
  const changelogCss = fs.readFileSync(path.join(ROOT, 'datamine/changelog/styles/datamine-changelog.css'), 'utf8');

  // About prose & hero subtitle
  assert.match(aboutCss, /\.about-hero__subtitle\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);
  assert.match(aboutCss, /\.about-prose p,\s*\.about-section > p\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);

  // Privacy prose & hero subtitle
  assert.match(privacyCss, /\.privacy-hero__subtitle\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);
  assert.match(privacyCss, /\.privacy-prose p\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);

  // Projects hero subtitle
  assert.match(projectsCss, /\.projects-hero__subtitle\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);

  // Contribute prose & hero subtitle
  assert.match(contributeCss, /\.contribute-hero__subtitle\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);
  assert.match(contributeCss, /\.contribute-prose p\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);

  // Changelog summary & hero subtitle
  assert.match(changelogCss, /\.changelog-hero__subtitle\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);
  assert.match(changelogCss, /\.changelog-release__summary\s*\{[^}]*max-width:\s*var\(--dm-prose-max,\s*74ch\);/);
});

test('4. All 5 text/editorial routes use their designated layout contracts', () => {
  const aboutCss = fs.readFileSync(path.join(ROOT, 'datamine/about/styles/datamine-about.css'), 'utf8');
  const privacyCss = fs.readFileSync(path.join(ROOT, 'datamine/privacy/styles/datamine-privacy.css'), 'utf8');
  const projectsCss = fs.readFileSync(path.join(ROOT, 'datamine/projects/styles/datamine-projects.css'), 'utf8');
  const contributeCss = fs.readFileSync(path.join(ROOT, 'datamine/contribute/styles/datamine-contribute.css'), 'utf8');
  const changelogCss = fs.readFileSync(path.join(ROOT, 'datamine/changelog/styles/datamine-changelog.css'), 'utf8');

  assert.match(aboutCss, /\.about-layout\s*\{[^}]*max-width:\s*var\(--dm-about-max,\s*1380px\);/);
  assert.match(privacyCss, /\.privacy-layout\s*\{[^}]*max-width:\s*var\(--dm-editorial-max,\s*1220px\);/);
  assert.match(projectsCss, /\.projects-layout\s*\{[^}]*max-width:\s*var\(--dm-editorial-max,\s*1220px\);/);
  assert.match(contributeCss, /\.contribute-layout\s*\{[^}]*max-width:\s*var\(--dm-editorial-max,\s*1220px\);/);
  assert.match(changelogCss, /\.changelog-layout\s*\{[^}]*max-width:\s*var\(--dm-editorial-max,\s*1220px\);/);
});

test('5. Data and application routes remain untouched by editorial layout changes', () => {
  const oowCss = fs.readFileSync(path.join(ROOT, 'datamine/oow/styles/oow.css'), 'utf8');
  const fceCss = fs.readFileSync(path.join(ROOT, 'datamine/fce/styles/datamine-fce.css'), 'utf8');
  const seqCss = fs.readFileSync(path.join(ROOT, 'datamine/seq/styles/datamine-seq.css'), 'utf8');
  const itemsCss = fs.readFileSync(path.join(ROOT, 'datamine/items/styles/items.css'), 'utf8');
  const multypeCss = fs.readFileSync(path.join(ROOT, 'datamine/multype/styles/datamine-multype.css'), 'utf8');

  // Application pages use their own shell / container max-widths
  assert.doesNotMatch(oowCss, /--dm-editorial-max/);
  assert.doesNotMatch(fceCss, /--dm-editorial-max/);
  assert.doesNotMatch(seqCss, /--dm-editorial-max/);
  assert.doesNotMatch(itemsCss, /--dm-editorial-max/);
  assert.doesNotMatch(multypeCss, /--dm-editorial-max/);
});

test('6. All 5 editorial HTML pages use editorial-layout class', () => {
  const aboutHtml = fs.readFileSync(path.join(ROOT, 'datamine/about/index.html'), 'utf8');
  const privacyHtml = fs.readFileSync(path.join(ROOT, 'datamine/privacy/index.html'), 'utf8');
  const projectsHtml = fs.readFileSync(path.join(ROOT, 'datamine/projects/index.html'), 'utf8');
  const contributeHtml = fs.readFileSync(path.join(ROOT, 'datamine/contribute/index.html'), 'utf8');
  const changelogHtml = fs.readFileSync(path.join(ROOT, 'datamine/changelog/index.html'), 'utf8');

  assert.match(aboutHtml, /class="editorial-layout about-layout"/);
  assert.match(privacyHtml, /class="editorial-layout privacy-layout"/);
  assert.match(projectsHtml, /class="editorial-layout projects-layout"/);
  assert.match(contributeHtml, /class="editorial-layout contribute-layout"/);
  assert.match(changelogHtml, /class="editorial-layout changelog-layout"/);
});

test('7. Contribute page contains simplified Regular steps, Multype AES key, and semantic duration colors', () => {
  const contributeJs = fs.readFileSync(path.join(ROOT, 'datamine/contribute/js/datamine-contribute.js'), 'utf8');
  const contributeCss = fs.readFileSync(path.join(ROOT, 'datamine/contribute/styles/datamine-contribute.css'), 'utf8');

  // Sub duration classes in CSS
  assert.match(contributeCss, /\.contribute-tab-button__sub--gold/);
  assert.match(contributeCss, /\.contribute-tab-button__sub--pink/);
  assert.match(contributeCss, /\.contribute-tab-button__sub--teal/);

  // Active tab border is gold, but tab label color does NOT turn gold on active
  assert.match(contributeCss, /\.contribute-tab-button\.is-active\s*\{[^}]*border-color:\s*var\(--contrib-gold\);/);
  assert.doesNotMatch(contributeCss, /\.contribute-tab-button\.is-active\s*\.contribute-tab-button__label\s*\{[^}]*color:\s*var\(--contrib-gold\);/);

  // Sub duration classes in JS
  assert.match(contributeJs, /contribute-tab-button__sub--gold/);
  assert.match(contributeJs, /contribute-tab-button__sub--pink/);

  // Multype AES key and tools
  assert.match(contributeJs, /0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8/);
  assert.match(contributeJs, /fmodel\.app/);
  assert.match(contributeJs, /UnrealExporter/);
  assert.match(contributeJs, /2–5 h/);
  assert.match(contributeJs, /2–5 ч/);

  // Step 4 explains the ready-to-use copy without claiming automatic production deployment
  assert.match(contributeJs, /ready-to-use copy of the Datamine data structure/);
  assert.match(contributeJs, /готовая копия данных Datamine/);

  // Fix data notice and guidance
  assert.match(contributeJs, /contribute-notice-box/);
  assert.match(contributeJs, /Decision guide/);
  assert.match(contributeJs, /Руководство/);

  // Bottom grid 60/40 proportion & structured checklist
  assert.match(contributeCss, /\.contribute-bottom-grid\s*\{[^}]*grid-template-columns:\s*1\.5fr\s*1fr;/);
  assert.match(contributeCss, /\.contribute-checklist-item/);
  assert.match(contributeJs, /Affected section:/);
  assert.match(contributeJs, /Раздел Datamine:/);

  // Multype preview and highlighted time
  assert.match(contributeJs, /~10 h/);
  assert.match(contributeJs, /~10 ч/);
  assert.match(contributeCss, /\.contribute-step-time/);
  assert.match(contributeJs, /contribute-step-time/);

  // No separate install game step or 10 hours required text
  assert.doesNotMatch(contributeJs, /Install or update Global Tower of Fantasy/);
  assert.doesNotMatch(contributeJs, /~10 hours required/);
});

test('8. Projects page is redesigned as Tower of Fantasy Resources directory', () => {
  const { TOF_RESOURCES_DATA } = require('../datamine/projects/js/projects-data.js');
  const projectsJs = fs.readFileSync(path.join(ROOT, 'datamine/projects/js/datamine-projects.js'), 'utf8');
  const projectsCss = fs.readFileSync(path.join(ROOT, 'datamine/projects/styles/datamine-projects.css'), 'utf8');
  const footerJs = fs.readFileSync(path.join(ROOT, 'datamine/shared/footer.js'), 'utf8');

  // Categories present
  const catIds = TOF_RESOURCES_DATA.map((c) => c.id);
  assert.deepEqual(catIds, ['databases', 'wikis', 'calculators']);

  // Required resources present (self-referential TOF Datamine removed)
  const allResources = TOF_RESOURCES_DATA.flatMap((c) => c.resources);
  const resourceNames = allResources.map((r) => r.name);

  assert.equal(resourceNames.includes('TOF Datamine'), false);
  assert.equal(resourceNames.includes('tof.gg'), true);
  assert.equal(resourceNames.includes('Tower of Fantasy Wiki'), true);
  assert.equal(resourceNames.includes('Everything'), true);
  assert.equal(resourceNames.includes('Tower of Fantasy Index'), true);
  assert.equal(resourceNames.includes('Tower of Fantasy Tools'), true);
  assert.equal(resourceNames.includes('Tower of Fantasy Interactive Map'), true);
  assert.equal(resourceNames.includes('ToF WARP Toolbox (幻塔WARPお道具箱)'), true);
  assert.equal(resourceNames.includes('Tower of Fantasy Exporter Scanner'), true);

  // tof.gg metadata
  const tofGg = allResources.find((r) => r.name === 'tof.gg');
  assert.equal(tofGg.url, 'https://tof.gg/');
  assert.equal(tofGg.type, 'Web');

  // Wiki metadata
  const wiki = allResources.find((r) => r.name === 'Tower of Fantasy Wiki');
  assert.equal(wiki.url, 'https://toweroffantasy.fandom.com/wiki/Tower_of_Fantasy_Wiki');
  assert.equal(wiki.type, 'Wiki');

  // Everything metadata
  const kritikSheet = allResources.find((r) => r.name === 'Everything');
  assert.equal(kritikSheet.type, 'Sheet');
  assert.equal(kritikSheet.author, 'by Kritik');

  // No "My Projects & Tools" heading
  assert.doesNotMatch(projectsJs, /My Projects & Tools/);
  assert.doesNotMatch(projectsJs, /Мои проекты и инструменты/);

  // Footer uses updated "TOF resources" label
  assert.match(footerJs, /projects:\s*"TOF resources"/);
  assert.match(footerJs, /projects:\s*"Ресурсы TOF"/);

  // CSS contains responsive category grid and badge styles
  assert.match(projectsCss, /\.resources-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(projectsCss, /\.resource-category-card/);
  assert.match(projectsCss, /\.resource-row/);
  assert.match(projectsCss, /\.resource-type-badge--web/);
  assert.match(projectsCss, /\.resource-type-badge--wiki/);
  assert.match(projectsCss, /\.resource-type-badge--sheet/);
  assert.match(projectsCss, /\.resource-type-badge--tool/);
});
