const fs = require("fs");
const path = require("path");

const SEQ_DATA_FILE = path.join(__dirname, "DT_MonsterStaticData_Overseas.json");
const SEQ_CACHE_FILE = path.join(__dirname, "seq-boss-cache.json");
const DEFAULT_STAGE_CACHE_LIMIT = 30;

function normalizeRequestedStageLimit(stageLimit) {
  const parsed = Number.parseInt(stageLimit, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_STAGE_CACHE_LIMIT;
  }

  return parsed;
}

function readSequentialRows() {
  const raw = fs.readFileSync(SEQ_DATA_FILE, "utf8");
  const payload = JSON.parse(raw);

  return (Array.isArray(payload) ? payload[0]?.Rows : payload?.Rows) || payload?.Rows || payload;
}

function buildSequentialBossCache(stageLimit) {
  const requestedStageLimit = normalizeRequestedStageLimit(stageLimit);
  const rows = readSequentialRows();
  const cachedRows = {};
  let cachedUpToStage = 0;

  for (let stage = 1; stage <= requestedStageLimit; stage += 1) {
    const rowId = `endless_special_boss_${stage}`;
    const row = rows?.[rowId];

    if (!row || !Number.isFinite(row.MaxHealth)) {
      break;
    }

    cachedRows[rowId] = row.MaxHealth;
    cachedUpToStage = stage;
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFile: "DT_MonsterStaticData_Overseas.json",
      requestedStageLimit,
      cachedUpToStage,
      rowCount: Object.keys(cachedRows).length
    },
    rows: cachedRows
  };
}

function writeSequentialBossCache(stageLimit) {
  const payload = buildSequentialBossCache(stageLimit);
  fs.writeFileSync(SEQ_CACHE_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = {
  DEFAULT_STAGE_CACHE_LIMIT,
  SEQ_CACHE_FILE,
  SEQ_DATA_FILE,
  buildSequentialBossCache,
  writeSequentialBossCache
};
