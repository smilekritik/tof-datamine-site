#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function isRepetitive(text) {
  if (!text || typeof text !== "string") return false;
  const tokens = text.toLowerCase().split(/[\s,.-]+/).filter((t) => t.length > 2);
  const freq = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  return Object.values(freq).some((count) => count >= 5);
}

function checkSuspicious(name) {
  const reasons = [];
  if (name.length > 120) {
    reasons.push(`length ${name.length} > 120 chars`);
  }
  if (/[\r\n\x00-\x1F]/.test(name)) {
    reasons.push("contains control or newline characters");
  }
  if (isRepetitive(name)) {
    reasons.push("repetitive token generation degeneration");
  }
  return reasons;
}

function resolveProjectRoot() {
  let cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, "package.json"))) {
      return cur;
    }
    cur = path.resolve(cur, "..");
  }
  return path.resolve(__dirname, "..");
}

function importItemTranslations(options = {}) {
  const filePath = options.filePath || options.file;
  const overwrite = Boolean(options.overwrite);
  const projectRoot = options.projectRoot || resolveProjectRoot();

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Import file does not exist: ${filePath}`);
  }

  const raw = readJsonFile(filePath);
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid JSON format in file: ${filePath}`);
  }

  const dataset = String(raw.dataset || "").trim().toLowerCase();
  if (dataset !== "gacha" && dataset !== "mmo") {
    throw new Error(
      `Invalid or missing dataset in ${filePath}. Expected "dataset": "gacha" or "mmo", got "${raw.dataset}".`
    );
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  if (items.length === 0) {
    throw new Error(`No items array found or items array is empty in ${filePath}.`);
  }

  const targetFilename = dataset === "gacha" ? "gacha-translations.json" : "mmo-translations.json";
  const curatedDir = path.join(projectRoot, "datamine", "items", "curated");
  fs.mkdirSync(curatedDir, { recursive: true });
  const targetPath = path.join(curatedDir, targetFilename);

  const existingData = readJsonFile(targetPath) || {};
  const resultMap = {};

  // Copy existing entries into resultMap
  for (const [id, entry] of Object.entries(existingData)) {
    if (entry && typeof entry.name === "string" && entry.name.trim()) {
      resultMap[id] = { name: entry.name.trim() };
    }
  }

  let totalRows = items.length;
  let imported = 0;
  let skippedEmpty = 0;
  let existingPreserved = 0;
  let conflicts = 0;
  const suspiciousList = [];

  for (const item of items) {
    const id = String(item?.id || "").trim();
    const incomingName = String(item?.name || "").trim();

    if (!id || !incomingName) {
      skippedEmpty++;
      continue;
    }

    const suspiciousReasons = checkSuspicious(incomingName);
    if (suspiciousReasons.length > 0) {
      suspiciousList.push({ id, name: incomingName, reasons: suspiciousReasons });
    }

    if (resultMap[id]) {
      const existingName = resultMap[id].name;
      if (existingName !== incomingName) {
        conflicts++;
        if (overwrite) {
          resultMap[id] = { name: incomingName };
          imported++;
        } else {
          existingPreserved++;
          console.warn(`[CONFLICT] ${id}: preserved existing "${existingName}" (incoming: "${incomingName}")`);
        }
      } else {
        imported++;
      }
    } else {
      resultMap[id] = { name: incomingName };
      imported++;
    }
  }

  // Sort deterministically by string item ID
  const sortedMap = {};
  const sortedIds = Object.keys(resultMap).sort((a, b) => a.localeCompare(b, "en"));
  for (const id of sortedIds) {
    sortedMap[id] = resultMap[id];
  }

  fs.writeFileSync(targetPath, `${JSON.stringify(sortedMap, null, 2)}\n`, "utf8");

  console.log(`\n=== Import Summary for [${dataset.toUpperCase()}] ===`);
  console.log(`Source File:        ${filePath}`);
  console.log(`Target File:        ${targetPath}`);
  console.log(`Total Rows:         ${totalRows}`);
  console.log(`Imported / Active:  ${Object.keys(sortedMap).length}`);
  console.log(`Skipped Empty:      ${skippedEmpty}`);
  console.log(`Existing Preserved: ${existingPreserved}`);
  console.log(`Conflicts:          ${conflicts}`);
  console.log(`Suspicious Items:   ${suspiciousList.length}`);

  if (suspiciousList.length > 0) {
    console.log(`\n--- Suspicious Translations (${suspiciousList.length} items flagged) ---`);
    for (const item of suspiciousList.slice(0, 10)) {
      console.log(`  [SUSPICIOUS] ${item.id}: "${item.name.slice(0, 60)}..." (${item.reasons.join(", ")})`);
    }
    if (suspiciousList.length > 10) {
      console.log(`  ... and ${suspiciousList.length - 10} more.`);
    }
  }

  return {
    dataset,
    targetPath,
    totalRows,
    imported: Object.keys(sortedMap).length,
    skippedEmpty,
    existingPreserved,
    conflicts,
    suspiciousCount: suspiciousList.length,
    suspiciousList
  };
}

function main() {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const fileArgs = args.filter((a) => !a.startsWith("--"));

  if (fileArgs.length === 0) {
    console.error("Usage: node scripts/import-item-translations.js <path-to-translated-json> [--overwrite]");
    process.exit(1);
  }

  try {
    for (const file of fileArgs) {
      importItemTranslations({ filePath: path.resolve(file), overwrite });
    }
    process.exit(0);
  } catch (err) {
    console.error(`Import failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  importItemTranslations,
  checkSuspicious,
  isRepetitive
};
