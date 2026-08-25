const fs = require("fs");
const path = require("path");

const SEQ_DATA_FILE = path.join(__dirname, "..", "data", "DT_MonsterStaticData_Overseas.json");
const SEQ_CACHE_FILE = path.join(__dirname, "..", "data", "seq-boss-cache.json");
const DEFAULT_STAGE_CACHE_LIMIT = 30;
const CN_JUMP_THRESHOLD = 3.0;

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

function describeCutoff(rows, cachedUpToStage) {
  const currentHp = rows?.[`endless_special_boss_${cachedUpToStage}`]?.MaxHealth;
  const nextStage = cachedUpToStage + 1;
  const nextHp = rows?.[`endless_special_boss_${nextStage}`]?.MaxHealth;

  if (!Number.isFinite(nextHp)) {
    return {
      type: "missing-next-stage",
      reason: `Stage ${nextStage} is absent, so contiguous Global data ends at stage ${cachedUpToStage}.`
    };
  }

  const ratio = Number.isFinite(currentHp) && currentHp > 0 ? nextHp / currentHp : 0;
  if (ratio > CN_JUMP_THRESHOLD) {
    return {
      type: "anomalous-cn-jump",
      reason: `Stage ${nextStage} HP is ${ratio.toFixed(2)}x stage ${cachedUpToStage}, exceeding the ${CN_JUMP_THRESHOLD}x Global threshold.`
    };
  }

  return {
    type: "requested-stage-limit",
    reason: `The cache was intentionally limited to stage ${cachedUpToStage}; the next stage is contiguous.`
  };
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

  const cutoff = describeCutoff(rows, cachedUpToStage);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFile: "DT_MonsterStaticData_Overseas.json",
      requestedStageLimit,
      cachedUpToStage,
      detectedCutoffType: cutoff.type,
      detectedCutoffReason: cutoff.reason,
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
