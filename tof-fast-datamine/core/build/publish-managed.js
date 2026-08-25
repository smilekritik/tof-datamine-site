#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const get = (name) => { const hit = process.argv.find((x) => x.startsWith(`--${name}=`)); return hit && path.resolve(hit.slice(name.length + 3)); };
const stageRoot = get('stage-root');
const targetRoot = get('target-root');
const contractPath = get('contract') || path.resolve(__dirname, '../contracts/outputs.json');
if (!stageRoot || !targetRoot) throw new Error('Usage: publish-managed.js --stage-root=<datamine> --target-root=<datamine>');
const roots = JSON.parse(fs.readFileSync(contractPath, 'utf8')).publicationRoots;
const token = `${process.pid}-${Date.now()}`;
const moved = [];
try {
  for (const rel of roots) {
    const source = path.join(stageRoot, rel);
    const target = path.join(targetRoot, rel);
    if (!fs.existsSync(source)) throw new Error(`Validated publication root missing: ${source}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const backup = `${target}.stage3-backup-${token}`;
    if (fs.existsSync(target)) fs.renameSync(target, backup);
    try { fs.renameSync(source, target); } catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup, target); throw error; }
    moved.push({ target, backup });
  }
} catch (error) {
  for (const item of moved.reverse()) {
    fs.rmSync(item.target, { recursive: true, force: true });
    if (fs.existsSync(item.backup)) fs.renameSync(item.backup, item.target);
  }
  throw error;
}
for (const item of moved) {
  try { fs.rmSync(item.backup, { recursive: true, force: true }); }
  catch (error) { console.warn(`[publication] New data is live, but backup cleanup failed: ${item.backup}: ${error.message}`); }
}
console.log('PUBLICATION .. SUCCESS');
