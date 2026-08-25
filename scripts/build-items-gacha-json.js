const fs = require("fs");
const path = require("path");

const SOURCE_FILE = path.resolve(
  "D:/TofMods/picgit/Exports/Hotta/Content/Resources/Text/Oversea/ST_Item_Oversea.json"
);
const TARGET_FILE = path.resolve(
  __dirname,
  "..",
  "datamine",
  "items",
  "data",
  "merged_mapping_with_original.json"
);

function readSourceTable() {
  const raw = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  const table = Array.isArray(raw)
    ? raw[0]?.StringTable?.KeysToEntries
    : raw?.StringTable?.KeysToEntries;

  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("ST_Item_Oversea.json must contain StringTable.KeysToEntries.");
  }

  return table;
}

function readTargetPayload() {
  const payload = JSON.parse(fs.readFileSync(TARGET_FILE, "utf8"));

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("merged_mapping_with_original.json must be an object map.");
  }

  return payload;
}

function extractRowsById(payload) {
  const entries = Object.entries(payload).sort((left, right) => Number(left[0]) - Number(right[0]));
  const rowsById = new Map();
  let maxIndex = 0;

  for (const [key, item] of entries) {
    const index = Number(key);
    if (Number.isFinite(index)) {
      maxIndex = Math.max(maxIndex, index);
    }

    const id = String(item?.id || "");
    if (!id) {
      continue;
    }

    rowsById.set(id, {
      key: String(key),
      id,
      name: String(item?.name || ""),
      original: String(item?.original || ""),
      rename: String(item?.rename || "")
    });
  }

  return {
    rowsById,
    maxIndex
  };
}

function collectSourceNameEntries(table) {
  return Object.entries(table)
    .map(([key, value]) => {
      const match = key.match(/^(.*)_name$/);
      if (!match) {
        return null;
      }

      return {
        id: match[1],
        original: String(value || "")
      };
    })
    .filter((row) => row && row.original.trim())
    .sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function mergeRows(existing, sourceRows) {
  const merged = new Map(existing.rowsById);
  let nextIndex = existing.maxIndex + 1;

  for (const row of sourceRows) {
    if (merged.has(row.id)) {
      const current = merged.get(row.id);
      current.original = row.original;
      continue;
    }

    merged.set(row.id, {
      key: String(nextIndex),
      id: row.id,
      name: "",
      original: row.original,
      rename: ""
    });
    nextIndex += 1;
  }

  return Array.from(merged.values()).sort((left, right) => Number(left.key) - Number(right.key));
}

function buildOutput(rows) {
  const payload = {};

  for (const row of rows) {
    payload[row.key] = {
      id: row.id,
      name: row.name,
      original: row.original,
      rename: row.rename
    };
  }

  return payload;
}

function main() {
  const sourceTable = readSourceTable();
  const existingPayload = readTargetPayload();
  const existing = extractRowsById(existingPayload);
  const sourceRows = collectSourceNameEntries(sourceTable);
  const mergedRows = mergeRows(existing, sourceRows);
  const output = buildOutput(mergedRows);

  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `[items-gacha] Wrote ${mergedRows.length} rows to ${TARGET_FILE}`
  );
}

main();
