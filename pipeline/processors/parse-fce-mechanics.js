const fs = require("fs");
const path = require("path");

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
    path.join(projectRoot, "datamine-pipeline", "raw_exports"),
    path.join(projectRoot, "temperary")
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.join(projectRoot, "raw_exports");
}

function isNonCombatKey(key) {
  const lower = key.toLowerCase();
  return (
    lower.startsWith("awardshop_") ||
    lower.startsWith("item_") ||
    lower.startsWith("mail_") ||
    lower.includes("activity_award") ||
    lower.includes("activity_time") ||
    lower.includes("bosscoin")
  );
}

function extractMatchingBossEntries(data) {
  const results = {};
  const bossPattern = /boss.*des/i;
  const numberPattern = /_[0-5]_|_0[0-5]_|_[0-5]_des$|_\d+_[0-5]_/i;

  function recursiveScan(obj) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        recursiveScan(item);
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
          if (bossPattern.test(key) && numberPattern.test(key)) {
            if (!isNonCombatKey(key)) {
              const cleanText = value.replace(/\r\n/g, "\n").trim();
              if (cleanText) {
                results[key] = cleanText;
              }
            }
          }
        } else if (typeof value === "object") {
          recursiveScan(value);
        }
      }
    }
  }

  recursiveScan(data);
  return results;
}

function extractBossNumber(str) {
  if (!str) return null;
  const match = str.match(/boss(?:_hum)?_?0*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseBossKeyFamily(key) {
  const num = extractBossNumber(key);
  const bossId = num !== null ? `boss_${String(num).padStart(3, "0")}` : "other_boss";

  const numMatch = key.match(/_0?([1-5])_/);
  const phaseIndex = numMatch ? String(parseInt(numMatch[1], 10)) : "1";

  return {
    bossNum: num,
    bossId,
    phaseIndex
  };
}

function keyPriority(key) {
  const k = key.toLowerCase();
  if (k.startsWith("boss_hum_") || k.startsWith("boss_")) return 1;
  if (k.startsWith("buff_boss_")) return 2;
  if (k.startsWith("ge_")) return 3;
  if (k.startsWith("breakfate_boss_")) return 4;
  return 5;
}

function groupMechanicsByBoss(entries) {
  const grouped = {};

  for (const [key, text] of Object.entries(entries)) {
    const { bossNum, bossId, phaseIndex } = parseBossKeyFamily(key);

    if (!grouped[bossId]) {
      grouped[bossId] = {
        bossId,
        bossNum,
        keys: [],
        mechanics: {}
      };
    }

    grouped[bossId].keys.push(key);

    if (!grouped[bossId].mechanics[phaseIndex]) {
      grouped[bossId].mechanics[phaseIndex] = [];
    }
    grouped[bossId].mechanics[phaseIndex].push({
      key,
      text
    });
  }

  // Prioritize primary combat mechanic keys within each phase
  for (const group of Object.values(grouped)) {
    for (const phaseIndex of Object.keys(group.mechanics)) {
      group.mechanics[phaseIndex].sort((a, b) => keyPriority(a.key) - keyPriority(b.key));
    }
  }

  return grouped;
}

function findFirstFile(rawDir, relativePaths) {
  return relativePaths
    .map((relativePath) => path.join(rawDir, relativePath))
    .find((filePath) => fs.existsSync(filePath));
}

function readRows(filePath) {
  const data = filePath ? readJsonFile(filePath) : null;
  if (!data) return {};
  return (Array.isArray(data) ? data[0]?.Rows : data.Rows) || data.Rows || {};
}

function assetPathToExportedPng(assetPath) {
  if (!assetPath || assetPath === "None") return "";
  const packagePath = assetPath.split(".")[0].replace(/^\/Game\//, "Hotta/Content/");
  return `${packagePath}.png`;
}

function loadFceBossCatalog(rawDir) {
  const sourceFile = findFirstFile(rawDir, [
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/VoidCloneBossConfigDataTable_Overseas.json",
    "Hotta/Content/Resources/CoreBlueprints/DataTable/VoidClone/VoidCloneBossConfigDataTable.json",
    "VoidCloneBossConfigDataTable_Overseas.json",
    "VoidCloneBossConfigDataTable.json"
  ]);
  const rows = readRows(sourceFile);

  const bosses = Object.entries(rows).map(([configId, row], index) => {
    const nameKey = row?.BossNameText?.Key || "";
    return {
      order: index + 1,
      configId,
      bossId: nameKey,
      bossNum: extractBossNumber(nameKey),
      sourceName: row?.BossNameText?.LocalizedString || row?.BossNameText?.SourceString || "",
      image: assetPathToExportedPng(row?.BossImage?.AssetPathName),
      imageMain: assetPathToExportedPng(row?.BossImageMain?.AssetPathName)
    };
  });

  return {
    sourceFile: sourceFile ? path.relative(rawDir, sourceFile).replace(/\\/g, "/") : "",
    bosses
  };
}

function formatMechanics(group, localizedGroup) {
  if (!group || !group.mechanics) return [];
  return Object.keys(group.mechanics)
    .sort((a, b) => Number(a) - Number(b))
    .map((index) => {
      const primaryEntry = group.mechanics[index][0];
      const localizedEntry = localizedGroup?.mechanics?.[index]?.[0];
      return {
        index,
        key: primaryEntry.key,
        en: primaryEntry.text,
        ru: localizedEntry ? localizedEntry.text : ""
      };
    });
}

function sortBossesDeterministically(list) {
  return list.slice().sort((a, b) => {
    if (a.bossNum !== null && b.bossNum !== null) {
      if (a.bossNum !== b.bossNum) return a.bossNum - b.bossNum;
    } else if (a.bossNum !== null) {
      return -1;
    } else if (b.bossNum !== null) {
      return 1;
    }
    const idComp = String(a.bossId || "").localeCompare(String(b.bossId || ""), "en");
    if (idComp !== 0) return idComp;
    return String(a.sourceName || "").localeCompare(String(b.sourceName || ""), "en");
  });
}

function buildAllBossesCatalog(enGrouped, ruGrouped, catalogBosses) {
  const catalogList = Array.isArray(catalogBosses)
    ? catalogBosses
    : (catalogBosses && Array.isArray(catalogBosses.bosses))
      ? catalogBosses.bosses
      : [];

  const catalogByNumber = new Map();
  const catalogById = new Map();
  for (const cat of catalogList) {
    const num = cat.bossNum !== undefined ? cat.bossNum : extractBossNumber(cat.bossId || cat.key);
    const id = num !== null ? `boss_${String(num).padStart(3, "0")}` : (cat.bossId || cat.key || cat.configId);
    const normalizedCat = {
      ...cat,
      bossNum: num,
      bossId: id
    };
    if (num !== null && !catalogByNumber.has(num)) catalogByNumber.set(num, normalizedCat);
    if (id && !catalogById.has(id)) catalogById.set(id, normalizedCat);
  }

  const bossMap = new Map();

  // 1. Add all bosses from catalog
  for (const [id, cat] of catalogById.entries()) {
    const group = enGrouped ? enGrouped[id] : null;
    const ruG = ruGrouped ? ruGrouped[id] : null;
    const mechanics = formatMechanics(group, ruG);
    bossMap.set(id, {
      bossId: id,
      bossNum: cat.bossNum,
      configId: cat.configId || "",
      sourceName: cat.sourceName || "",
      mechanics,
      phaseCount: mechanics.length,
      keys: group ? group.keys : []
    });
  }

  // 2. Add all bosses discovered in localization
  if (enGrouped) {
    for (const [id, group] of Object.entries(enGrouped)) {
      if (!bossMap.has(id)) {
        const cat = group.bossNum !== null ? catalogByNumber.get(group.bossNum) : null;
        const mechanics = formatMechanics(group, ruGrouped ? ruGrouped[id] : null);
        bossMap.set(id, {
          bossId: id,
          bossNum: group.bossNum,
          configId: cat ? cat.configId : "",
          sourceName: cat ? cat.sourceName : "",
          mechanics,
          phaseCount: mechanics.length,
          keys: group.keys || []
        });
      }
    }
  }

  const allBosses = Array.from(bossMap.values());
  const fourPhaseBosses = sortBossesDeterministically(allBosses.filter((b) => b.phaseCount === 4));
  const otherBosses = sortBossesDeterministically(allBosses.filter((b) => b.phaseCount !== 4));

  return {
    allBosses,
    fourPhaseBosses,
    otherBosses
  };
}

function formatPhaseCountRu(count) {
  if (count === 1) return "1 фаза";
  if (count >= 2 && count <= 4) return `${count} фазы`;
  return `${count} фаз`;
}

function generateBossReportMarkdown(catalogResult) {
  const { allBosses, fourPhaseBosses, otherBosses } = catalogResult;
  const lines = [
    "# 📋 Тексты механик боссов (полный каталог экспорта)",
    "",
    `Всего боссов: **${allBosses.length}** (с 4 фазами: **${fourPhaseBosses.length}**, остальные: **${otherBosses.length}**)`,
    "Полный отчет по текстам механик боссов из текущего экспорта игровых данных.",
    "",
    "---",
    "",
    `## 4-phase bosses (${fourPhaseBosses.length} боссов)`,
    ""
  ];

  let entryIndex = 1;

  for (const boss of fourPhaseBosses) {
    const nameSuffix = boss.sourceName ? ` — ${boss.sourceName}` : "";
    lines.push(`### ${entryIndex}. Босс: \`${boss.bossId}\` (${formatPhaseCountRu(boss.phaseCount)})${nameSuffix}`);
    lines.push("");
    for (const mech of boss.mechanics) {
      lines.push(`* **Фаза ${mech.index}** (\`${mech.key}\`):`);
      lines.push(`  * **EN:** ${mech.en || "*(текст отсутствует)*"}`);
      lines.push(`  * **RU:** ${mech.ru || "*(текст отсутствует)*"}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    entryIndex++;
  }

  lines.push(`## Other bosses (${otherBosses.length} боссов)`);
  lines.push("");

  for (const boss of otherBosses) {
    const nameSuffix = boss.sourceName ? ` — ${boss.sourceName}` : "";
    lines.push(`### ${entryIndex}. Босс: \`${boss.bossId}\` (${formatPhaseCountRu(boss.phaseCount)})${nameSuffix}`);
    lines.push("");
    if (boss.mechanics.length === 0) {
      lines.push("*(Тексты механик боя отсутствуют в выгрузке локализации)*");
      lines.push("");
    } else {
      for (const mech of boss.mechanics) {
        lines.push(`* **Фаза ${mech.index}** (\`${mech.key}\`):`);
        lines.push(`  * **EN:** ${mech.en || "*(текст отсутствует)*"}`);
        lines.push(`  * **RU:** ${mech.ru || "*(текст отсутствует)*"}`);
        lines.push("");
      }
    }
    lines.push("---");
    lines.push("");
    entryIndex++;
  }

  return lines.join("\n");
}

function processFceMechanics(rawDir, projectRoot) {
  if (!projectRoot || !fs.existsSync(path.join(projectRoot, "datamine"))) {
    projectRoot = resolveProjectRoot();
  }
  console.log(`\n[fce-mechanics] Scanning FCE boss mechanics from: ${rawDir}`);

  const gameEnFile = [
    path.join(rawDir, "Hotta", "Content", "Localization", "Game", "en", "Game.json"),
    path.join(rawDir, "Game.json")
  ].find((p) => fs.existsSync(p));

  const gameRuFile = [
    path.join(rawDir, "Hotta", "Content", "Localization", "Game", "ru", "Game.json"),
    path.join(rawDir, "Game_ru.json")
  ].find((p) => fs.existsSync(p));

  if (!gameEnFile) {
    throw new Error(`[required] Game/en/Game.json not found in ${rawDir}; FCE output was not published.`);
  }

  console.log(`[fce-mechanics] Reading EN strings from: ${gameEnFile}`);
  const enData = readJsonFile(gameEnFile);
  const enEntries = extractMatchingBossEntries(enData);
  if (Object.keys(enEntries).length === 0) {
    throw new Error("[required] FCE localization contained zero expected boss mechanic entries.");
  }
  const enGrouped = groupMechanicsByBoss(enEntries);

  let ruEntries = {};
  let ruGrouped = {};
  if (gameRuFile) {
    console.log(`[fce-mechanics] Reading RU strings from: ${gameRuFile}`);
    const ruData = readJsonFile(gameRuFile);
    ruEntries = extractMatchingBossEntries(ruData);
    ruGrouped = groupMechanicsByBoss(ruEntries);
  }

  const bossCatalog = loadFceBossCatalog(rawDir);
  if (!bossCatalog.sourceFile || !Array.isArray(bossCatalog.bosses) || bossCatalog.bosses.length === 0) {
    throw new Error("[required] FCE game boss catalog is missing or contains zero usable bosses; no output was changed.");
  }
  const catalogOrder = new Map();
  const catalogByNumber = new Map();
  for (const boss of bossCatalog.bosses) {
    if (boss.bossNum !== null && !catalogOrder.has(boss.bossNum)) {
      catalogOrder.set(boss.bossNum, boss.order);
      catalogByNumber.set(boss.bossNum, boss);
    }
  }

  // 1. Save flat Filtered_Game.json and Filtered_Game_ru.json
  const fceDir = path.join(projectRoot, "datamine", "fce", "data");
  fs.mkdirSync(fceDir, { recursive: true });

  const filteredGameEnPath = path.join(fceDir, "Filtered_Game.json");
  const filteredGameRuPath = path.join(fceDir, "Filtered_Game_ru.json");

  fs.writeFileSync(filteredGameEnPath, JSON.stringify(enEntries, null, 4), "utf8");
  if (Object.keys(ruEntries).length > 0) {
    fs.writeFileSync(filteredGameRuPath, JSON.stringify(ruEntries, null, 4), "utf8");
  }

  // 2. Load registered boss numbers directly from curated boss cards.
  const registeredNumbers = new Set();
  const curatedBossDir = path.join(fceDir, "bosses");
  if (!fs.existsSync(curatedBossDir)) throw new Error(`[required] Curated FCE boss directory missing: ${curatedBossDir}`);
  const curatedBossFiles = fs.readdirSync(curatedBossDir).filter((name) => name.endsWith(".json"));
  if (curatedBossFiles.length === 0) throw new Error(`[required] Curated FCE boss directory is empty: ${curatedBossDir}`);
  for (const file of curatedBossFiles) {
    const boss = readJsonFile(path.join(curatedBossDir, file));
    const num = extractBossNumber(boss && boss.boss_id);
    if (num !== null) registeredNumbers.add(num);
  }

  // Sort by the in-game boss catalog, then append localization-only entries.
  const sortedBossGroups = Object.entries(enGrouped)
    .filter(([bossId, group]) => group.bossNum === null || !registeredNumbers.has(group.bossNum))
    .sort((a, b) => {
      const orderA = catalogOrder.get(a[1].bossNum) ?? 10000 + (a[1].bossNum ?? 9999);
      const orderB = catalogOrder.get(b[1].bossNum) ?? 10000 + (b[1].bossNum ?? 9999);
      return orderA - orderB;
    });

  const unregisteredFlatEn = {};
  const unregisteredFlatRu = {};
  const unregisteredByBossEn = {};
  const unregisteredByBossRu = {};
  const unregisteredBosses = [];

  const bossNameHints = {
    3: "Hyena Mech (Break Fate)",
    6: "Robarg",
    18: "Habaka",
    59: "Boss 059",
    66: "Ying Zhao Shield Buff",
    79: "Defender"
  };

  for (const [bossId, group] of sortedBossGroups) {
    const hint = bossNameHints[group.bossNum] || bossId;
    const groupTitle = group.bossNum !== null ? `Boss_#${String(group.bossNum).padStart(3, "0")} (${hint})` : bossId;

    unregisteredByBossEn[groupTitle] = {};
    if (Object.keys(ruEntries).length > 0) {
      unregisteredByBossRu[groupTitle] = {};
    }

    // Sort keys within boss (e.g. _1_des, _2_des, _3_des, _4_des, _5_des)
    const sortedKeys = group.keys.slice().sort((ka, kb) => {
      const numA = ka.match(/_0?([1-5])_/) ? parseInt(ka.match(/_0?([1-5])_/)[1], 10) : 99;
      const numB = kb.match(/_0?([1-5])_/) ? parseInt(kb.match(/_0?([1-5])_/)[1], 10) : 99;
      return numA - numB;
    });

    for (const key of sortedKeys) {
      unregisteredFlatEn[key] = enEntries[key];
      unregisteredByBossEn[groupTitle][key] = enEntries[key];

      if (ruEntries[key]) {
        unregisteredFlatRu[key] = ruEntries[key];
        unregisteredByBossRu[groupTitle][key] = ruEntries[key];
      }
    }

    const formattedMechanics = formatMechanics(group, ruGrouped[bossId]);
    const catalogEntry = catalogByNumber.get(group.bossNum);

    unregisteredBosses.push({
      bossId,
      bossNum: group.bossNum,
      catalogOrder: catalogEntry?.order || null,
      catalogConfigId: catalogEntry?.configId || "",
      sourceName: catalogEntry?.sourceName || "",
      image: catalogEntry?.image || "",
      imageMain: catalogEntry?.imageMain || "",
      nameHint: hint,
      keys: sortedKeys,
      mechanicsCount: formattedMechanics.length,
      mechanics: formattedMechanics
    });
  }

  // 3. Save Unregistered Bosses Flat & Grouped JSON files
  const unregEnFlatFile = path.join(fceDir, "Filtered_Game_Unregistered.json");
  const unregRuFlatFile = path.join(fceDir, "Filtered_Game_Unregistered_ru.json");
  const unregEnByBossFile = path.join(fceDir, "Filtered_Game_Unregistered_By_Boss.json");
  const unregRuByBossFile = path.join(fceDir, "Filtered_Game_Unregistered_By_Boss_ru.json");

  fs.writeFileSync(unregEnFlatFile, JSON.stringify(unregisteredFlatEn, null, 4), "utf8");
  fs.writeFileSync(unregEnByBossFile, JSON.stringify(unregisteredByBossEn, null, 4), "utf8");

  if (Object.keys(unregisteredFlatRu).length > 0) {
    fs.writeFileSync(unregRuFlatFile, JSON.stringify(unregisteredFlatRu, null, 4), "utf8");
    fs.writeFileSync(unregRuByBossFile, JSON.stringify(unregisteredByBossRu, null, 4), "utf8");
  }

  // 4. Save structured JSON
  const unregisteredJsonFile = path.join(fceDir, "fce-unregistered-bosses.json");
  fs.writeFileSync(unregisteredJsonFile, JSON.stringify({ unregisteredBosses }, null, 2), "utf8");

  const seenMissingBosses = new Set();
  const missingBosses = bossCatalog.bosses
    .filter((boss) => {
      if (boss.bossNum !== null && registeredNumbers.has(boss.bossNum)) return false;
      const identity = boss.bossNum !== null ? `number:${boss.bossNum}` : `id:${boss.bossId || boss.configId}`;
      if (seenMissingBosses.has(identity)) return false;
      seenMissingBosses.add(identity);
      return true;
    })
    .map((boss) => {
      const normalizedBossId = boss.bossNum !== null
        ? `boss_${String(boss.bossNum).padStart(3, "0")}`
        : "";
      const mechanics = formatMechanics(enGrouped[normalizedBossId], ruGrouped[normalizedBossId]);
      return {
        ...boss,
        mechanicsCount: mechanics.length,
        mechanics
      };
    });
  const missingFile = path.join(fceDir, "fce-missing-boss-texts.json");
  fs.writeFileSync(
    missingFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        catalogSource: bossCatalog.sourceFile,
        description: "Bosses missing from the curated FCE list, ordered by the in-game boss catalog.",
        bosses: missingBosses
      },
      null,
      2
    ),
    "utf8"
  );

  const catalogFile = path.join(fceDir, "fce-game-boss-catalog.json");
  fs.writeFileSync(
    catalogFile,
    JSON.stringify({ source: bossCatalog.sourceFile, bosses: bossCatalog.bosses }, null, 2),
    "utf8"
  );

  // 5. Generate and save complete NEW_BOSSES_TEXTS.md
  const completeCatalog = buildAllBossesCatalog(enGrouped, ruGrouped, bossCatalog.bosses);
  const reportMarkdown = generateBossReportMarkdown(completeCatalog);

  const docsDir = path.join(projectRoot, "datamine", "fce", "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const reportMdPath = path.join(docsDir, "NEW_BOSSES_TEXTS.md");
  fs.writeFileSync(reportMdPath, reportMarkdown, "utf8");

  console.log(`[fce-mechanics] Saved Filtered_Game.json (${Object.keys(enEntries).length} combat boss keys)`);
  console.log(`[fce-mechanics] Saved Filtered_Game_Unregistered.json (${Object.keys(unregisteredFlatEn).length} keys across ${unregisteredBosses.length} bosses sorted by the in-game catalog)`);
  console.log(`[fce-mechanics] Saved fce-missing-boss-texts.json (${missingBosses.length} catalog bosses missing from the curated page)`);
  console.log(`[fce-mechanics] Saved NEW_BOSSES_TEXTS.md (${completeCatalog.allBosses.length} total bosses: ${completeCatalog.fourPhaseBosses.length} 4-phase, ${completeCatalog.otherBosses.length} other)`);

  return {
    totalKeys: Object.keys(enEntries).length,
    unregisteredBosses: unregisteredBosses.length,
    totalBosses: completeCatalog.allBosses.length,
    fourPhaseBosses: completeCatalog.fourPhaseBosses.length,
    otherBosses: completeCatalog.otherBosses.length
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
  processFceMechanics(rawDir, projectRoot);
}

if (require.main === module) {
  main();
}

module.exports = {
  processFceMechanics,
  extractMatchingBossEntries,
  extractBossNumber,
  parseBossKeyFamily,
  groupMechanicsByBoss,
  formatMechanics,
  buildAllBossesCatalog,
  generateBossReportMarkdown
};
