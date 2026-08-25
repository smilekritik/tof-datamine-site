const fs = require("fs");
const path = require("path");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const buf = fs.readFileSync(filePath);
  let str;

  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    str = buf.toString("utf16le");
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    str = buf.toString("utf16be");
  } else {
    str = buf.toString("utf8");
  }

  str = str.replace(/^\uFEFF/, "").trim();

  // Guard against potential duplicate object prefix in corrupted files
  const firstBrace = str.indexOf("{", 1);
  if (firstBrace !== -1 && str.startsWith('{"stave_thunder_plasm":1,{')) {
    str = str.slice(firstBrace);
  }

  return JSON.parse(str);
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

function extractCuratedRenames(curatedFilePath, targetFilePath, fallbackTargetFile) {
  const renameMap = new Map();
  const filesToCheck = [curatedFilePath, fallbackTargetFile, targetFilePath].filter(Boolean);

  for (const fp of filesToCheck) {
    if (!fs.existsSync(fp)) continue;
    const raw = readJsonFile(fp);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

    for (const item of Object.values(raw)) {
      const id = String(item?.id || "").trim();
      const rename = String(item?.rename || "").trim();
      if (id && rename && !renameMap.has(id)) {
        renameMap.set(id, rename);
      }
    }
  }

  return renameMap;
}

function extractCuratedNames(curatedFilePath) {
  const nameMap = new Map();
  if (!fs.existsSync(curatedFilePath)) return nameMap;

  const raw = readJsonFile(curatedFilePath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`[invalid] Curated item overrides must be a JSON object: ${curatedFilePath}`);
  }

  for (const [key, item] of Object.entries(raw)) {
    const id = String(item?.id || key || "").trim();
    const name = String(item?.name || "").trim();
    if (id && name) nameMap.set(id, name);
  }
  return nameMap;
}

function readTranslationMap(filePath) {
  const translationMap = new Map();
  if (!fs.existsSync(filePath)) return translationMap;

  const raw = readJsonFile(filePath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`[invalid] Item translations must be a JSON object: ${filePath}`);
  }

  for (const [rawId, entry] of Object.entries(raw)) {
    const id = String(rawId).trim();
    const name = String(entry?.name || "").trim();
    if (id && name) translationMap.set(id, name);
  }
  return translationMap;
}

function createNameResolver(authoritativeNameMap, translationMap) {
  const appliedTranslationIds = new Set();
  let authoritativeNamesPreserved = 0;

  return {
    resolve(id) {
      const authoritativeName = authoritativeNameMap.get(id) || "";
      if (authoritativeName) {
        authoritativeNamesPreserved += 1;
        return authoritativeName;
      }
      const translatedName = translationMap.get(id) || "";
      if (translatedName) appliedTranslationIds.add(id);
      return translatedName;
    },
    stats() {
      return {
        translationsApplied: appliedTranslationIds.size,
        authoritativeNamesPreserved,
        translationEntriesUnused: translationMap.size - appliedTranslationIds.size
      };
    }
  };
}

function processGachaItems(rawDir, targetFile, projectRoot, fallbackTargetFile) {
  console.log(`\n[items-gacha] Processing Gacha items from: ${rawDir}`);

  // 1. Direct Config mapping files (MappingItemId.json, etc.)
  const mappingIdFile = path.join(rawDir, "MappingItemId.json");
  const mappingNameFile = path.join(rawDir, "MappingItemIdAndName.json");
  const mappingColorFile = path.join(rawDir, "MappingItemIdAndColor.json");

  // 2. Nested / standalone Oversea string table export
  const stItemOverseaFile = path.join(
    rawDir,
    "Hotta",
    "Content",
    "Resources",
    "Text",
    "Oversea",
    "ST_Item_Oversea.json"
  );
  const stItemOverseaAlt = path.join(rawDir, "ST_Item_Oversea.json");

  const hasFreshSource =
    fs.existsSync(mappingIdFile) ||
    fs.existsSync(stItemOverseaFile) ||
    fs.existsSync(stItemOverseaAlt);

  if (!hasFreshSource) {
    throw new Error(
      `[required] No Gacha item source file found in ${rawDir}; curated renames were preserved but no output was published.`
    );
  }

  // Load curated renames (strictly keyed by string item ID)
  const root = projectRoot || path.resolve(__dirname, "../..");
  const curatedFile = path.join(root, "datamine", "items", "curated", "gacha-overrides.json");
  const renameMap = extractCuratedRenames(curatedFile, targetFile, fallbackTargetFile);
  const authoritativeNameMap = extractCuratedNames(curatedFile);
  const translationFile = path.join(root, "datamine", "items", "curated", "gacha-translations.json");
  const translationMap = readTranslationMap(translationFile);
  const nameResolver = createNameResolver(authoritativeNameMap, translationMap);

  const developerRows = [];
  const seenDevNums = new Set();
  const seenDevIds = new Set();

  // 1. Primary Developer Mapping from MappingItemId.json
  if (fs.existsSync(mappingIdFile)) {
    console.log(`[items-gacha] Found MappingItemId config files.`);
    const idMap = readJsonFile(mappingIdFile);
    if (!idMap || typeof idMap !== "object" || Array.isArray(idMap)) {
      throw new Error(`[invalid] MappingItemId.json must be a valid JSON object.`);
    }

    const nameMap = readJsonFile(mappingNameFile) || {};
    const colorMap = readJsonFile(mappingColorFile) || {};

    for (const [keyName, rawNumId] of Object.entries(idMap)) {
      const id = String(keyName).trim();
      if (!id) {
        throw new Error(`[invalid] Empty string item identifier encountered in MappingItemId.json.`);
      }

      const num = Number(rawNumId);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(
          `[invalid] Invalid developer numeric ID "${rawNumId}" for item "${id}" in MappingItemId.json.`
        );
      }

      if (seenDevNums.has(num)) {
        throw new Error(
          `[invalid] Duplicate developer numeric ID ${num} encountered in MappingItemId.json for item "${id}".`
        );
      }
      if (seenDevIds.has(id)) {
        throw new Error(
          `[invalid] Duplicate item identifier "${id}" encountered in MappingItemId.json.`
        );
      }

      seenDevNums.add(num);
      seenDevIds.add(id);

      const numStr = String(num);
      const original = String(nameMap[numStr] || "").trim();
      const quality = String(colorMap[numStr] || "").trim();
      const rename = renameMap.get(id) || "";

      developerRows.push({
        num,
        id,
        name: nameResolver.resolve(id),
        original,
        rename,
        ...(quality ? { quality } : {})
      });
    }

    // Developer rows MUST be sorted strictly numeric ascending by NUM
    developerRows.sort((a, b) => a.num - b.num);
  }

  // Developer max NUM calculation (deterministic ceiling)
  let maxDeveloperId = 0;
  for (const row of developerRows) {
    if (row.num > maxDeveloperId) {
      maxDeveloperId = row.num;
    }
  }

  // 2. Supplemental Items from ST_Item_Oversea.json
  const overseaFile = fs.existsSync(stItemOverseaFile)
    ? stItemOverseaFile
    : fs.existsSync(stItemOverseaAlt)
    ? stItemOverseaAlt
    : null;

  const devRowById = new Map(developerRows.map((r) => [r.id, r]));
  const supplementalMap = new Map();

  if (overseaFile) {
    console.log(`[items-gacha] Also checking supplemental string table: ${overseaFile}`);
    const raw = readJsonFile(overseaFile);
    const table = Array.isArray(raw)
      ? raw[0]?.StringTable?.KeysToEntries
      : raw?.StringTable?.KeysToEntries;

    if (table && typeof table === "object") {
      for (const [key, value] of Object.entries(table)) {
        const match = key.match(/^(.*)_name$/);
        if (!match) continue;

        const id = match[1].trim();
        const original = String(value || "").trim();
        if (!id || !original) continue;

        if (devRowById.has(id)) {
          // Enrich existing developer row without creating a duplicate row or synthetic NUM
          const devRow = devRowById.get(id);
          if (!devRow.original && original) {
            devRow.original = original;
          }
        } else if (supplementalMap.has(id)) {
          const suppRow = supplementalMap.get(id);
          if (!suppRow.original && original) {
            suppRow.original = original;
          }
        } else {
          supplementalMap.set(id, {
            id,
            name: nameResolver.resolve(id),
            original,
            rename: renameMap.get(id) || "",
            quality: ""
          });
        }
      }
    }
  }

  // Supplemental rows ordering must be deterministic
  const supplementalRows = Array.from(supplementalMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id, "en")
  );

  // Assign synthetic numbering starting at maxDeveloperId + 1
  let nextSyntheticNum = maxDeveloperId + 1;
  for (const suppRow of supplementalRows) {
    suppRow.num = nextSyntheticNum;
    nextSyntheticNum += 1;
  }

  // Final rows: all developer items ALWAYS first, followed by supplemental items
  const finalRows = [...developerRows, ...supplementalRows];

  if (finalRows.length === 0) {
    throw new Error(
      `[required] Global item sources contained zero usable item identities; no output was changed.`
    );
  }

  // Contract Invariant Verifications
  const finalNums = new Set();
  const finalIds = new Set();
  for (const row of finalRows) {
    if (!Number.isInteger(row.num) || row.num <= 0) {
      throw new Error(`[contract] Non-numeric or invalid NUM encountered: "${row.num}" for ID "${row.id}".`);
    }
    if (finalNums.has(row.num)) {
      throw new Error(`[contract] Duplicate NUM encountered: ${row.num}.`);
    }
    if (finalIds.has(row.id)) {
      throw new Error(`[contract] Duplicate string item ID encountered: "${row.id}".`);
    }
    finalNums.add(row.num);
    finalIds.add(row.id);
  }

  const payload = {};
  for (const row of finalRows) {
    payload[String(row.num)] = {
      id: row.id,
      name: row.name || "",
      original: row.original || "",
      rename: row.rename || "",
      ...(row.quality ? { quality: row.quality } : {})
    };
  }

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    `[items-gacha] Saved ${finalRows.length} items (${developerRows.length} developer, ${supplementalRows.length} supplemental, maxDeveloperId: ${maxDeveloperId}) to ${targetFile}`
  );

  const nameStats = nameResolver.stats();
  console.log(
    `[items-gacha] Names: ${nameStats.translationsApplied} translated, ${nameStats.authoritativeNamesPreserved} authoritative, ${nameStats.translationEntriesUnused} translation entries unused`
  );

  return {
    total: finalRows.length,
    developerCount: developerRows.length,
    supplementalCount: supplementalRows.length,
    maxDeveloperId,
    ...nameStats
  };
}

function processMmoItems(rawDir, targetFile, projectRoot, fallbackTargetFile) {
  console.log(`\n[items-mmo] Processing MMO items from: ${rawDir}`);

  const stItemMmoFile = [
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable_MMO",
      "StringTable",
      "ST_Item_MMO.json"
    ),
    path.join(rawDir, "ST_Item_MMO.json")
  ].find((p) => fs.existsSync(p));

  const cookingFile = [
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable_MMO",
      "cooking",
      "CookingFoodDataTable_MMO.json"
    ),
    path.join(rawDir, "CookingFoodDataTable_MMO.json")
  ].find((p) => fs.existsSync(p));

  const lifeJobHarvestFile = [
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable_MMO",
      "LifeJob",
      "DT_LifeJob_HarvestableItems.json"
    ),
    path.join(rawDir, "DT_LifeJob_HarvestableItems.json")
  ].find((p) => fs.existsSync(p));

  const lifeJobCraftFile = [
    path.join(
      rawDir,
      "Hotta",
      "Content",
      "Resources",
      "CoreBlueprints",
      "DataTable_MMO",
      "LifeJob",
      "DT_LifeJobCraftingConfig.json"
    ),
    path.join(rawDir, "DT_LifeJobCraftingConfig.json")
  ].find((p) => fs.existsSync(p));

  const hasAnyMmoSource = Boolean(
    stItemMmoFile || cookingFile || lifeJobHarvestFile || lifeJobCraftFile
  );

  if (!hasAnyMmoSource) {
    const existingFile = [fallbackTargetFile, targetFile].find((p) => p && fs.existsSync(p));
    if (existingFile) {
      console.log(
        `[items-mmo] No MMO source tables found in ${rawDir}; preserved existing ${existingFile}`
      );
      return { total: 0, preserved: true };
    }
    throw new Error(
      `[required] No MMO item source files found in ${rawDir} and no target file exists.`
    );
  }

  const root = projectRoot || path.resolve(__dirname, "../..");
  const curatedFile = path.join(root, "datamine", "items", "curated", "mmo-overrides.json");
  const renameMap = extractCuratedRenames(curatedFile, targetFile, fallbackTargetFile);
  const authoritativeNameMap = extractCuratedNames(curatedFile);
  const translationFile = path.join(root, "datamine", "items", "curated", "mmo-translations.json");
  const translationMap = readTranslationMap(translationFile);
  const nameResolver = createNameResolver(authoritativeNameMap, translationMap);

  const collectedMap = new Map();

  // 1. ST_Item_MMO
  if (stItemMmoFile) {
    const raw = readJsonFile(stItemMmoFile);
    const table = Array.isArray(raw)
      ? raw[0]?.StringTable?.KeysToEntries
      : raw?.StringTable?.KeysToEntries;

    if (table && typeof table === "object") {
      for (const [key, value] of Object.entries(table)) {
        const match = key.match(/^(.*)_name$/);
        if (!match) continue;

        const id = match[1].trim();
        const original = String(value || "").trim();
        if (!id || !original) continue;

        collectedMap.set(id, {
          id,
          name: nameResolver.resolve(id),
          original,
          rename: renameMap.get(id) || ""
        });
      }
    }
  }

  // 2. Cooking
  if (cookingFile) {
    const raw = readJsonFile(cookingFile);
    const rows = Array.isArray(raw) ? raw[0]?.Rows : raw?.Rows;

    if (rows && typeof rows === "object") {
      for (const [, row] of Object.entries(rows)) {
        const lotteryKey = row?.LotteryDescription?.Key;
        const match =
          typeof lotteryKey === "string"
            ? lotteryKey.match(/^(Item_Cooking_\d+)_LotteryDescription$/)
            : null;

        if (!match) continue;
        const id = match[1].trim();
        if (!collectedMap.has(id)) {
          collectedMap.set(id, {
            id,
            name: nameResolver.resolve(id),
            original: "",
            rename: renameMap.get(id) || ""
          });
        }
      }
    }
  }

  // 3. LifeJob Harvest & Craft
  for (const filePath of [lifeJobHarvestFile, lifeJobCraftFile].filter(Boolean)) {
    const raw = readJsonFile(filePath);
    const rows = Array.isArray(raw) ? raw[0]?.Rows : raw?.Rows;

    if (rows && typeof rows === "object") {
      for (const [, row] of Object.entries(rows)) {
        const candidateKeys = [row?.ItemName?.Key, row?.HarvestableName?.Key];
        for (const candidate of candidateKeys) {
          const match =
            typeof candidate === "string" ? candidate.match(/^(.*)_name$/) : null;
          if (!match) continue;

          const id = match[1].trim();
          if (!collectedMap.has(id)) {
            collectedMap.set(id, {
              id,
              name: nameResolver.resolve(id),
              original: "",
              rename: renameMap.get(id) || ""
            });
          }
          break;
        }
      }
    }
  }

  const finalRows = Array.from(collectedMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id, "en")
  );

  if (finalRows.length === 0) {
    throw new Error(`[required] MMO item processing produced zero rows from ${rawDir}.`);
  }

  const payload = {};
  finalRows.forEach((row, index) => {
    payload[String(index + 1)] = {
      id: row.id,
      name: row.name || "",
      original: row.original || "",
      rename: row.rename || ""
    };
  });

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    `[items-mmo] Saved ${finalRows.length} items to ${targetFile}`
  );

  const nameStats = nameResolver.stats();
  console.log(
    `[items-mmo] Names: ${nameStats.translationsApplied} translated, ${nameStats.authoritativeNamesPreserved} authoritative, ${nameStats.translationEntriesUnused} translation entries unused`
  );

  return {
    total: finalRows.length,
    preserved: false,
    ...nameStats
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

  const gachaTarget = path.join(
    projectRoot,
    "datamine",
    "items",
    "data",
    "merged_mapping_with_original.json"
  );
  const mmoTarget = path.join(
    projectRoot,
    "datamine",
    "items",
    "data",
    "merged_mapping_with_original_mmo.json"
  );

  const token = `.stage3-${process.pid}-${Date.now()}`;
  const gachaTemp = `${gachaTarget}${token}`;
  const mmoTemp = `${mmoTarget}${token}`;
  try {
    processGachaItems(rawDir, gachaTemp, projectRoot, gachaTarget);
    fs.mkdirSync(path.dirname(gachaTarget), { recursive: true });
    fs.renameSync(gachaTemp, gachaTarget);

    const mmoResult = processMmoItems(rawDir, mmoTemp, projectRoot, mmoTarget);
    if (!mmoResult.preserved && fs.existsSync(mmoTemp)) {
      fs.renameSync(mmoTemp, mmoTarget);
    }
  } finally {
    fs.rmSync(gachaTemp, { force: true });
    fs.rmSync(mmoTemp, { force: true });
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createNameResolver,
  processGachaItems,
  processMmoItems,
  readTranslationMap
};
