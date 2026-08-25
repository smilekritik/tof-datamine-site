const fs = require("fs");
const path = require("path");

const STRING_TABLE_SOURCE_FILE = path.resolve(
  "D:/TofMods/picgit/Exports/Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/StringTable/ST_Item_MMO.json"
);
const COOKING_SOURCE_FILE = path.resolve(
  "D:/TofMods/picgit/Exports/Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/cooking/CookingFoodDataTable_MMO.json"
);
const LIFEJOB_SOURCE_FILES = [
  path.resolve(
    "D:/TofMods/picgit/Exports/Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/LifeJob/DT_LifeJob_HarvestableItems.json"
  ),
  path.resolve(
    "D:/TofMods/picgit/Exports/Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/LifeJob/DT_LifeJobCraftingConfig.json"
  )
];
const TARGET_FILE = path.resolve(
  __dirname,
  "..",
  "datamine",
  "items",
  "data",
  "merged_mapping_with_original_mmo.json"
);

function readStringTableSource() {
  const raw = JSON.parse(fs.readFileSync(STRING_TABLE_SOURCE_FILE, "utf8"));
  const table = Array.isArray(raw)
    ? raw[0]?.StringTable?.KeysToEntries
    : raw?.StringTable?.KeysToEntries;

  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("ST_Item_MMO.json must contain StringTable.KeysToEntries.");
  }

  return table;
}

function readCookingRowsSource() {
  const raw = JSON.parse(fs.readFileSync(COOKING_SOURCE_FILE, "utf8"));
  const rows = Array.isArray(raw) ? raw[0]?.Rows : raw?.Rows;

  if (!rows || typeof rows !== "object" || Array.isArray(rows)) {
    throw new Error("CookingFoodDataTable_MMO.json must contain Rows.");
  }

  return rows;
}

function readLifeJobRowsSources() {
  return LIFEJOB_SOURCE_FILES.map((filePath) => {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const rows = Array.isArray(raw) ? raw[0]?.Rows : raw?.Rows;

    if (!rows || typeof rows !== "object" || Array.isArray(rows)) {
      throw new Error(`${path.basename(filePath)} must contain Rows.`);
    }

    return {
      filePath,
      rows
    };
  });
}

function readExistingRenameMap() {
  if (!fs.existsSync(TARGET_FILE)) {
    return new Map();
  }

  const payload = JSON.parse(fs.readFileSync(TARGET_FILE, "utf8"));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return new Map();
  }

  return new Map(
    Object.values(payload)
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) => [String(item.id || ""), String(item.rename || "")])
      .filter(([id]) => id)
  );
}

function buildRowsFromStringTable(table, renameMap) {
  const grouped = new Map();

  for (const [key, value] of Object.entries(table)) {
    const match = key.match(/^(.*)_(name|des|use)$/);
    if (!match) {
      continue;
    }

    const baseKey = match[1];
    const suffix = match[2];
    const group =
      grouped.get(baseKey) ||
      {
        id: baseKey,
        name: "",
        original: "",
        rename: renameMap.get(baseKey) || ""
      };

    if (suffix === "name") {
      group.original = String(value || "");
    }

    grouped.set(baseKey, group);
  }

  return Array.from(grouped.values())
    .filter((item) => item.original.trim())
    .sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function buildRowsFromCookingTable(rows, renameMap) {
  const collected = [];

  for (const [rowKey, row] of Object.entries(rows)) {
    const lotteryKey = row?.LotteryDescription?.Key;
    const match =
      typeof lotteryKey === "string"
        ? lotteryKey.match(/^(Item_Cooking_\d+)_LotteryDescription$/)
        : null;

    if (!match) {
      continue;
    }

    const id = match[1];
    collected.push({
      id,
      name: "",
      original: "",
      rename: renameMap.get(id) || "",
      _rowKey: rowKey
    });
  }

  return collected.sort((left, right) => {
    const byId = left.id.localeCompare(right.id, "en");
    if (byId !== 0) {
      return byId;
    }

    return left._rowKey.localeCompare(right._rowKey, "en");
  });
}

function buildRowsFromLifeJobTables(sources, renameMap) {
  const collected = [];

  for (const source of sources) {
    for (const [rowKey, row] of Object.entries(source.rows)) {
      const candidateKeys = [
        row?.ItemName?.Key,
        row?.HarvestableName?.Key
      ];

      for (const candidate of candidateKeys) {
        const match =
          typeof candidate === "string" ? candidate.match(/^(.*)_name$/) : null;

        if (!match) {
          continue;
        }

        const id = match[1];
        collected.push({
          id,
          name: "",
          original: "",
          rename: renameMap.get(id) || "",
          _rowKey: rowKey,
          _sourceFile: path.basename(source.filePath)
        });
        break;
      }
    }
  }

  return collected.sort((left, right) => {
    const byId = left.id.localeCompare(right.id, "en");
    if (byId !== 0) {
      return byId;
    }

    const byFile = left._sourceFile.localeCompare(right._sourceFile, "en");
    if (byFile !== 0) {
      return byFile;
    }

    return left._rowKey.localeCompare(right._rowKey, "en");
  });
}

function mergeRows(...groups) {
  const merged = new Map();

  for (const rows of groups) {
    for (const row of rows) {
      if (!merged.has(row.id)) {
        merged.set(row.id, {
          id: row.id,
          name: row.name || "",
          original: row.original || "",
          rename: row.rename || ""
        });
        continue;
      }

      const current = merged.get(row.id);
      if (!current.original && row.original) {
        current.original = row.original;
      }
      if (!current.name && row.name) {
        current.name = row.name;
      }
      if (!current.rename && row.rename) {
        current.rename = row.rename;
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function buildOutput(rows) {
  const payload = {};

  rows.forEach((row, index) => {
    payload[String(index + 1)] = {
      id: row.id,
      name: "",
      original: row.original,
      rename: row.rename
    };
  });

  return payload;
}

function main() {
  const stringTable = readStringTableSource();
  const cookingRows = readCookingRowsSource();
  const lifeJobSources = readLifeJobRowsSources();
  const renameMap = readExistingRenameMap();
  const rows = mergeRows(
    buildRowsFromStringTable(stringTable, renameMap),
    buildRowsFromCookingTable(cookingRows, renameMap),
    buildRowsFromLifeJobTables(lifeJobSources, renameMap)
  );
  const output = buildOutput(rows);

  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `[items-mmo] Wrote ${rows.length} rows to ${TARGET_FILE}`
  );
}

main();
