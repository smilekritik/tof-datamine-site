const fs = require("fs");
const path = require("path");

const TARGETS = {
  gacha: "gacha-translations.json",
  mmo: "mmo-translations.json"
};

function compareIds(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function suspiciousReasons(name) {
  const reasons = [];
  if (name.length > 120) reasons.push("longer than 120 characters");
  if (/[\r\n]/.test(name)) reasons.push("contains a newline");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(name)) {
    reasons.push("contains a control character");
  }
  const tokens = name.toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) || [];
  for (let index = 3; index < tokens.length; index += 1) {
    if (
      tokens[index] === tokens[index - 1] &&
      tokens[index] === tokens[index - 2] &&
      tokens[index] === tokens[index - 3]
    ) {
      reasons.push("contains a token repeated at least four times");
      break;
    }
  }
  return reasons;
}

function readExistingMap(targetFile) {
  if (!fs.existsSync(targetFile)) return {};
  const parsed = JSON.parse(fs.readFileSync(targetFile, "utf8").replace(/^\uFEFF/, ""));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Existing translation file must contain a JSON object: ${targetFile}`);
  }
  return parsed;
}

function writeJsonSafely(targetFile, value) {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const tempFile = `${targetFile}.tmp-${process.pid}-${Date.now()}`;
  const backupFile = `${targetFile}.bak-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  let movedExisting = false;
  try {
    if (fs.existsSync(targetFile)) {
      fs.renameSync(targetFile, backupFile);
      movedExisting = true;
    }
    fs.renameSync(tempFile, targetFile);
    if (movedExisting) fs.rmSync(backupFile, { force: true });
  } catch (error) {
    if (!fs.existsSync(targetFile) && movedExisting && fs.existsSync(backupFile)) {
      fs.renameSync(backupFile, targetFile);
    }
    throw error;
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

function importTranslations(inputFile, options = {}) {
  const sourcePath = path.resolve(inputFile);
  const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, ""));
  const dataset = String(payload?.dataset || "").trim().toLocaleLowerCase("en");
  if (!Object.hasOwn(TARGETS, dataset)) {
    throw new Error(`Top-level dataset must be "gacha" or "mmo"; received ${JSON.stringify(payload?.dataset)}.`);
  }
  if (!Array.isArray(payload.items)) {
    throw new Error("Top-level items must be an array.");
  }

  const projectRoot = options.projectRoot || path.resolve(__dirname, "..");
  const targetFile = path.join(
    projectRoot,
    "datamine",
    "items",
    "curated",
    TARGETS[dataset]
  );
  const existing = readExistingMap(targetFile);
  const next = { ...existing };
  const stats = {
    dataset,
    targetFile,
    imported: 0,
    skippedEmpty: 0,
    existingPreserved: 0,
    conflicts: 0,
    suspicious: []
  };

  for (let index = 0; index < payload.items.length; index += 1) {
    const row = payload.items[index];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`items[${index}] must be an object.`);
    }
    if (typeof row.id !== "string" || !row.id.trim()) {
      throw new Error(`items[${index}].id must be a non-empty string.`);
    }
    if (row.name != null && typeof row.name !== "string") {
      throw new Error(`items[${index}].name must be a string when present.`);
    }

    const id = row.id.trim();
    const name = String(row.name || "").trim();
    if (!name) {
      stats.skippedEmpty += 1;
      continue;
    }

    const reasons = suspiciousReasons(name);
    if (reasons.length) stats.suspicious.push({ id, value: name, reasons });

    const currentName = String(existing[id]?.name || "").trim();
    if (currentName) {
      if (currentName !== name) {
        stats.conflicts += 1;
        if (options.overwrite) {
          next[id] = { name };
          stats.imported += 1;
          continue;
        }
        console.warn(`CONFLICT ${id}\nexisting: ${currentName}\nincoming: ${name}`);
      }
      stats.existingPreserved += 1;
      continue;
    }

    next[id] = { name };
    stats.imported += 1;
  }

  const sorted = Object.fromEntries(Object.entries(next).sort(([left], [right]) => compareIds(left, right)));
  writeJsonSafely(targetFile, sorted);
  return stats;
}

function printReport(stats) {
  console.log(`Dataset: ${stats.dataset}`);
  console.log(`Target: ${stats.targetFile}`);
  console.log(`Imported: ${stats.imported}`);
  console.log(`Skipped empty: ${stats.skippedEmpty}`);
  console.log(`Existing preserved: ${stats.existingPreserved}`);
  console.log(`Conflicts: ${stats.conflicts}`);
  console.log(`Suspicious: ${stats.suspicious.length}`);
  for (const item of stats.suspicious) {
    console.warn(`SUSPICIOUS ${item.id} (${item.reasons.join(", ")})\nvalue: ${item.value}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const positional = args.filter((arg) => arg !== "--overwrite");
  if (positional.length !== 1) {
    throw new Error("Usage: node tools/import-item-translations.js <translated-export.json> [--overwrite]");
  }
  printReport(importTranslations(positional[0], { overwrite }));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[import-item-translations] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { importTranslations, suspiciousReasons };
