const fs = require("fs");
const path = require("path");

const CN_JUMP_THRESHOLD = 3.0; // Ratio threshold between consecutive stages to detect unscaled CN data

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function resolveRawDir(projectRoot) {
  const customArg = process.argv.find((arg) => arg.startsWith("--raw-dir="));
  if (customArg) {
    return path.resolve(customArg.split("=")[1]);
  }

  const candidateDirs = [
    path.join(projectRoot, "raw_exports"),
    path.join(projectRoot, "temperary")
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.join(projectRoot, "raw_exports");
}

function findMonsterDataFile(rawDir, projectRoot) {
  const candidates = [
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "ResourcesOverSea",
      "CoreBlueprints",
      "DataTable",
      "Dungeon",
      "DT_MonsterStaticData_Overseas.json"
    ),
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "ResourcesOverSea",
      "CoreBlueprints",
      "DataTable",
      "DT_MonsterStaticData_Overseas.json"
    ),
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable",
      "DT_MonsterStaticData_Overseas.json"
    ),
    path.join(rawDir, "DT_MonsterStaticData_Overseas.json"),
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable",
      "DT_MonsterStaticData.json"
    ),
    path.join(rawDir, "DT_MonsterStaticData.json")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function processSequentialData(rawDir, projectRoot) {
  console.log(`\n[seq-data] Processing Sequential boss data from: ${rawDir}`);

  const sourceFile = findMonsterDataFile(rawDir, projectRoot);
  if (!sourceFile) {
    throw new Error(
      `[required] Could not find a fresh DT_MonsterStaticData table in ${rawDir}.`
    );
  }

  console.log(`[seq-data] Reading source file: ${sourceFile}`);
  const payload = readJsonFile(sourceFile);
  const rows = (Array.isArray(payload) ? payload[0]?.Rows : payload?.Rows) || payload?.Rows || payload;

  if (!rows || typeof rows !== "object") {
    throw new Error(`Invalid format in ${sourceFile}: Rows object not found.`);
  }

  const cachedRows = {};
  let detectedCutoffStage = 0;
  let cutoffReason = "";
  let cutoffType = "scan-limit";
  let prevHp = null;

  // Traverse stages sequentially
  for (let stage = 1; stage <= 100; stage += 1) {
    const rowId = `endless_special_boss_${stage}`;
    const row = rows[rowId];

    if (!row || typeof row.MaxHealth !== "number" || !Number.isFinite(row.MaxHealth)) {
      cutoffType = stage === 1 ? "missing-source-stage" : "missing-next-stage";
      cutoffReason = stage === 1
        ? `Stage 1 is missing or has invalid HP.`
        : `Stage ${stage} is absent, so contiguous Global data ends at stage ${stage - 1}.`;
      break;
    }

    const currentHp = row.MaxHealth;

    if (prevHp !== null && prevHp > 0) {
      const ratio = currentHp / prevHp;
      if (ratio > CN_JUMP_THRESHOLD) {
        detectedCutoffStage = stage - 1;
        cutoffType = "anomalous-cn-jump";
        cutoffReason = `Stage ${stage} HP (${currentHp.toLocaleString("en-US")}) is ${ratio.toFixed(2)}x stage ${stage - 1} (${prevHp.toLocaleString("en-US")}), exceeding Global scaling threshold (${CN_JUMP_THRESHOLD}x).`;
        console.log(`[seq-data] Detected CN cutoff at stage ${stage - 1}: ${cutoffReason}`);
        break;
      }
    }

    cachedRows[rowId] = currentHp;
    detectedCutoffStage = stage;
    prevHp = currentHp;
  }

  if (detectedCutoffStage === 0) {
    throw new Error(cutoffReason || "No contiguous Sequential stages were found.");
  }

  const seqDir = path.join(projectRoot, "datamine", "seq");
  const seqDataDir = path.join(seqDir, "data");
  fs.mkdirSync(seqDataDir, { recursive: true });

  const cachePayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFile: path.basename(sourceFile),
      cachedUpToStage: detectedCutoffStage,
      detectedCutoffType: cutoffType,
      detectedCutoffReason: cutoffReason || "Contiguous Global stages parsed smoothly.",
      rowCount: Object.keys(cachedRows).length
    },
    rows: cachedRows
  };

  const cacheFile = path.join(seqDataDir, "seq-boss-cache.json");
  const stageLimitFile = path.join(seqDataDir, "seq-stage-limit.txt");
  const targetSourceCopy = path.join(seqDataDir, "DT_MonsterStaticData_Overseas.json");

  fs.writeFileSync(cacheFile, JSON.stringify(cachePayload, null, 2), "utf8");
  fs.writeFileSync(stageLimitFile, String(detectedCutoffStage), "utf8");

  if (path.resolve(sourceFile) !== path.resolve(targetSourceCopy)) {
    fs.copyFileSync(sourceFile, targetSourceCopy);
    console.log(`[seq-data] Copied source data to ${targetSourceCopy}`);
  }

  console.log(
    `[seq-data] Built cache with ${Object.keys(cachedRows).length} Global stages (limit: ${detectedCutoffStage}) in ${cacheFile}`
  );

  return {
    cachedStages: detectedCutoffStage,
    cacheFile,
    stageLimitFile
  };
}

function resolveProjectRoot() {
  const customArg = process.argv.find((arg) => arg.startsWith("--project-root="));
  if (customArg) return path.resolve(customArg.slice("--project-root=".length));
  let cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, "package.json"))) {
      return cur;
    }
    cur = path.resolve(cur, "..");
  }
  return path.resolve(__dirname, "../..");
}

function main() {
  const projectRoot = resolveProjectRoot();
  const rawDir = resolveRawDir(projectRoot);
  processSequentialData(rawDir, projectRoot);
}

if (require.main === module) {
  main();
}

module.exports = {
  processSequentialData
};
