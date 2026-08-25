const fs = require('fs');
const path = require('path');
const assert = require('assert');

const corePath = path.join(__dirname, '../datamine/multype/js/datamine-multype-core.js');
const cssPath = path.join(__dirname, '../datamine/multype/styles/datamine-multype.css');
const htmlPath = path.join(__dirname, '../datamine/multype/index.html');
const translationsPath = path.join(__dirname, '../datamine/multype/js/datamine-multype.js');
const coreSource = fs.readFileSync(corePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const translations = fs.readFileSync(translationsPath, 'utf8');
const { calculateImageExportPlan } = require(corePath);

const normal = calculateImageExportPlan(7800, 3400, {
  maxDimension: 32760,
  maxPixels: 120_000_000,
  maxRawBytes: 480_000_000,
  maxWorkingBytes: 1_440_000_000
});
assert.strictEqual(normal.safe, true, 'A normal matrix must be exportable');
assert.strictEqual(normal.scale, 1, 'A safe matrix must use canonical 1x density without upscaling');
assert.deepStrictEqual([normal.finalWidth, normal.finalHeight], [7800, 3400]);

const reduced = calculateImageExportPlan(16000, 1000);
assert.strictEqual(reduced.safe, true, 'A wide canonical matrix that fits at 1x must remain exportable');
assert.strictEqual(reduced.scale, 1, 'Export quality must stay at canonical density');

const highQuality = calculateImageExportPlan(2000, 1000, {
  preferredScale: 2,
  maxDimension: 32760,
  maxPixels: 48_000_000,
  maxRawBytes: 192 * 1024 * 1024,
  maxWorkingBytes: 576 * 1024 * 1024
});
assert.strictEqual(highQuality.safe, true, '2x must be available when the resulting canvas is safe');
assert.deepStrictEqual([highQuality.finalWidth, highQuality.finalHeight], [4000, 2000]);

const lowQuality = calculateImageExportPlan(40000, 4000, { preferredScale: 0.5 });
assert.strictEqual(lowQuality.safe, true, 'An explicitly selected lower quality may make a huge matrix safe');
assert.deepStrictEqual([lowQuality.finalWidth, lowQuality.finalHeight], [20000, 2000]);
assert(Math.abs(normal.estimatedPngBytes - normal.rawBytes * (3.3 / 93.3)) < 1, 'PNG estimate must use the observed 93.3 MB to 3.3 MB ratio');

const unsafe = calculateImageExportPlan(40000, 1000);
assert.strictEqual(unsafe.safe, false, 'A canonical dimension beyond the probed limit must fail preflight');
assert.strictEqual(unsafe.reason, 'too-large');

assert(/data-action="open-image-export"/.test(coreSource), 'Export must use a real button action');
assert(/\[2, 1, 0\.75, 0\.5\]/.test(coreSource), 'Quality selector must expose only 2x, 1x, 0.75x, and 0.5x');
assert(!/\[4, 2, 1, 0\.75/.test(coreSource), '4x must be removed from the quality selector');
assert(/getCurrentImageExportModel[\s\S]*?buildViewModel\(/.test(coreSource), 'Export must reuse the canonical filtered model builder');
assert(/document\.fonts\?\.ready/.test(coreSource), 'Export must wait for fonts');
assert(/canvas\.toBlob/.test(coreSource), 'PNG must be encoded with toBlob');
assert(!/toDataURL\(/.test(coreSource), 'Multype export must not use toDataURL');
assert(/URL\.createObjectURL/.test(coreSource) && /URL\.revokeObjectURL/.test(coreSource), 'Blob URLs must be created and revoked');
assert(/cleanupImageExportTree\(\)/.test(coreSource), 'Temporary export DOM must be cleaned up');
assert(/zoom = "1"/.test(coreSource), 'Export tree must use canonical 100% density');
assert(/\.multype-export-root[\s\S]*?overflow:\s*visible/.test(css), 'Export mode must expose full overflow');
assert(/\.multype-export-root \.multype-main__header[\s\S]*?position:\s*static/.test(css), 'Sticky headers must be disabled in export mode');
assert(/\.multype-export-submit:disabled[\s\S]*?cursor:\s*not-allowed/.test(css), 'Unavailable export must show a not-allowed cursor');
assert(/\.multype-export-root[\s\S]*?left:\s*-1000000px/.test(css), 'Temporary export DOM must stay entirely outside the visible viewport');
assert(/\.\.\/fce\/js\/html2canvas\.min\.js/.test(coreSource), 'The existing local html2canvas renderer must be reused');
assert(!/html2canvas\.min\.js/.test(html), 'The renderer must be loaded on demand instead of slowing normal startup');
assert(/exportTooLarge/.test(translations) && /слишком велика/.test(translations), 'EN/RU too-large messaging must exist');

console.log('✓ Multype PNG export is content-driven, quality-selectable, Blob-based, guarded, and localized.');
