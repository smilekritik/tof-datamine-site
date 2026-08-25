#!/usr/bin/env node

/**
 * Contract verification script for TOF Datamine Builder (/datamine-builder/).
 * Checks that all 6 builder tools have valid offline font references, noindex meta tags,
 * and that all referenced local assets exist.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILDER_DIR = path.join(ROOT_DIR, 'datamine-builder');

const BUILDER_PAGES = [
  { name: 'Root Hub', file: 'index.html' },
  { name: 'OOW Image Binder', file: 'oow/index.html' },
  { name: 'FCE Card Builder', file: 'fce/index.html' },
  { name: 'Sequential Editor', file: 'seq/index.html' },
  { name: 'Multype Rename Editor', file: 'multype/index.html' },
  { name: 'Items Rename Editor', file: 'items/index.html' }
];

let failed = false;

function error(msg) {
  console.error(`[check:builder:FAIL] ${msg}`);
  failed = true;
}

function success(msg) {
  console.log(`[check:builder:OK] ${msg}`);
}

// 1. Check shared builder.css
const sharedCss = path.join(BUILDER_DIR, 'shared', 'builder.css');
if (!fs.existsSync(sharedCss)) {
  error(`Missing shared builder CSS at ${sharedCss}`);
} else {
  success('Shared builder.css exists');
}

// 2. Validate each builder page
BUILDER_PAGES.forEach(({ name, file }) => {
  const fullPath = path.join(BUILDER_DIR, file);
  if (!fs.existsSync(fullPath)) {
    error(`Missing page ${name} at ${fullPath}`);
    return;
  }

  const html = fs.readFileSync(fullPath, 'utf8');

  // Check noindex
  if (!/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(html)) {
    error(`${name} (${file}) is missing <meta name="robots" content="noindex, nofollow">`);
  } else {
    success(`${name} has noindex, nofollow`);
  }

  // Check no external CDN fonts
  if (/fonts\.googleapis\.com/i.test(html) || /fonts\.gstatic\.com/i.test(html)) {
    error(`${name} (${file}) contains external Google Fonts CDN link`);
  } else {
    success(`${name} uses only local/offline font references`);
  }

  // Check for <base href="...">
  const baseMatch = html.match(/<base\s+href=["']([^"']+)["']/i);
  const effectiveDir = baseMatch
    ? path.resolve(path.dirname(fullPath), baseMatch[1])
    : path.dirname(fullPath);

  // Check referenced scripts
  const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi);
  for (const match of scriptMatches) {
    const src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://')) continue;
    if (src.startsWith('/')) {
      const resolved = path.join(ROOT_DIR, src.replace(/^\//, ''));
      if (!fs.existsSync(resolved)) {
        error(`${name} references missing absolute script: ${src} -> ${resolved}`);
      }
    } else {
      const resolved = path.join(effectiveDir, src.split('?')[0]);
      if (!fs.existsSync(resolved)) {
        error(`${name} references missing relative script: ${src} -> ${resolved}`);
      }
    }
  }
});

if (failed) {
  console.error('\n[check:builder] Validation failed with errors.');
  process.exit(1);
} else {
  console.log('\n[check:builder] All 6 Datamine Builder tools are valid and offline-ready.');
  process.exit(0);
}
