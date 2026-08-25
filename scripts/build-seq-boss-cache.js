const {
  DEFAULT_STAGE_CACHE_LIMIT,
  SEQ_CACHE_FILE,
  writeSequentialBossCache
} = require("../datamine/seq/js/seq-cache-utils");

const requestedStageLimit = process.argv[2] || DEFAULT_STAGE_CACHE_LIMIT;
const payload = writeSequentialBossCache(requestedStageLimit);

console.log(
  `[seq-cache] wrote ${SEQ_CACHE_FILE} with ${payload.meta.rowCount} rows (up to stage ${payload.meta.cachedUpToStage})`
);
