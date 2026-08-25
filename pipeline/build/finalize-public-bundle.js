#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootArg = process.argv.find((value) => value.startsWith('--project-root='));
const contractArg = process.argv.find((value) => value.startsWith('--contract='));
if (!rootArg) throw new Error('Usage: finalize-public-bundle.js --project-root=<stage> [--contract=<outputs.json>]');
const root = path.resolve(rootArg.slice('--project-root='.length));
const contractPath = contractArg
  ? path.resolve(contractArg.slice('--contract='.length))
  : path.resolve(__dirname, '../contracts/outputs.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const datamineRoot = path.join(root, 'datamine');

for (const relative of contract.buildIntermediates || []) {
  const target = path.resolve(datamineRoot, relative);
  const boundary = `${path.resolve(datamineRoot)}${path.sep}`;
  if (!target.startsWith(boundary)) throw new Error(`Refusing to remove build intermediate outside Datamine: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
}
console.log(`[PUBLIC CONTRACT] Removed ${(contract.buildIntermediates || []).length} build-only OOW artifacts.`);
