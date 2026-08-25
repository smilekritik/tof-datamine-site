#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootArg = process.argv.find((x) => x.startsWith('--project-root='));
if (!rootArg) throw new Error('Usage: prepare-staging.js --project-root=<stage> [--contract=<outputs.json>]');
const root = path.resolve(rootArg.slice('--project-root='.length));
const contractArg = process.argv.find((x) => x.startsWith('--contract='));
const contractPath = contractArg ? path.resolve(contractArg.slice('--contract='.length)) : path.resolve(__dirname, '../contracts/outputs.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const datamine = path.join(root, 'datamine');

function extractOverrides(source, destination) {
  if (!fs.existsSync(source)) return;
  const parsed = JSON.parse(fs.readFileSync(source, 'utf8'));
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : Object.values(parsed || {});
  const result = {};
  for (const row of rows) {
    if (!row || row.id == null) continue;
    const manual = {};
    if (typeof row.name === 'string' && row.name.trim()) manual.name = row.name;
    if (typeof row.rename === 'string' && row.rename.trim()) manual.rename = row.rename;
    if (Object.keys(manual).length) result[String(row.id)] = { id: String(row.id), ...manual };
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
}

extractOverrides(path.join(datamine, 'items/data/merged_mapping_with_original.json'), path.join(datamine, 'items/curated/gacha-overrides.json'));
extractOverrides(path.join(datamine, 'items/data/merged_mapping_with_original_mmo.json'), path.join(datamine, 'items/curated/mmo-overrides.json'));
for (const output of [...contract.managed.map((item) => item.path), ...(contract.buildIntermediates || [])]) {
  const target = path.join(datamine, output);
  fs.rmSync(target, { recursive: true, force: true });
}
console.log('[CONTRACT] Generated outputs removed from staging; curated inputs preserved.');
