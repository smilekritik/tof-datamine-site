const fs = require("fs");
const path = require("path");
const {
  DEFAULT_STAGE_CACHE_LIMIT,
  writeSequentialBossCache
} = require("../datamine/seq/js/seq-cache-utils");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATAMINE_ROOT = path.join(PROJECT_ROOT, "datamine");
const DATAMINE_DATA_DIR = path.join(DATAMINE_ROOT, "data");
const SUMMARY_FILE = path.join(DATAMINE_DATA_DIR, "datamine-summary.json");
fs.mkdirSync(DATAMINE_DATA_DIR, { recursive: true });

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(DATAMINE_ROOT, relativePath), "utf8"));
}

function countMultypeBuffs(dataset) {
  return Object.values(dataset || {}).reduce((total, groups) => {
    return total + Object.values(groups || {}).reduce((groupTotal, entries) => {
      return groupTotal + (Array.isArray(entries) ? entries.length : 0);
    }, 0);
  }, 0);
}

function formatDisplayDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function resolveExportVersion() {
  const releaseManifestFile = path.join(DATAMINE_ROOT, "release-manifest.json");
  if (!fs.existsSync(releaseManifestFile)) {
    throw new Error(`Required release manifest is missing: ${releaseManifestFile}`);
  }
  const releaseManifest = JSON.parse(fs.readFileSync(releaseManifestFile, "utf8"));
  const snapshot = releaseManifest.snapshot;
  if (!snapshot || !snapshot.version || !snapshot.exportedAt || !Array.isArray(snapshot.sources) || !snapshot.sources.length) {
    throw new Error("Required release manifest has invalid snapshot metadata.");
  }
  return {
    version: String(snapshot.version),
    exportedAt: snapshot.exportedAt,
    lastUpdate: formatDisplayDate(snapshot.exportedAt),
    lastUpdateIso: snapshot.exportedAt,
    sources: snapshot.sources
  };

}

async function resolveExportVersionAsync() {
  // Static export version is the canonical source of truth for extracted dataset snapshot.
  return resolveExportVersion();
}

function buildDatamineSummary(seqCache, exportVersion = null) {
  const oow = readJson(path.join("oow", "data", "index.json"));
  const fce = readJson(path.join("fce", "data", "fce-index.json"));
  const multype = readJson(path.join("multype", "data", "module_extra_to_files_mapping3.json"));
  const items = readJson(path.join("items", "data", "merged_mapping_with_original.json"));
  const seasons = Array.isArray(oow?.standard?.seasons) ? oow.standard.seasons : [];
  const versionInfo = exportVersion || resolveExportVersion();

  return {
    generatedAt: new Date().toISOString(),
    snapshot: {
      version: versionInfo.version,
      exportedAt: versionInfo.exportedAt || versionInfo.lastUpdateIso,
      sources: versionInfo.sources
    },
    oow: {
      seasonCount: seasons.length,
      seasons: seasons.map((season) => ({
        season: Number(season.season),
        startDate: season.startDate || "",
        endDate: season.endDate || "",
        floorCount: Number(season.floorCount || season.floors?.length || 0)
      }))
    },
    fce: {
      bossCount: Array.isArray(fce?.bosses) ? fce.bosses.length : 0
    },
    sequential: {
      floorCount: Number(seqCache?.meta?.cachedUpToStage || seqCache?.meta?.requestedStageLimit || 0),
      rowCount: Number(seqCache?.meta?.rowCount || 0)
    },
    multype: {
      buffCount: countMultypeBuffs(multype)
    },
    items: {
      itemCount: items && typeof items === "object" && !Array.isArray(items) ? Object.keys(items).length : 0
    }
  };
}

function resolveSequentialStageLimit() {
  const stageLimitFile = path.join(DATAMINE_ROOT, "seq", "data", "seq-stage-limit.txt");
  if (!fs.existsSync(stageLimitFile)) return DEFAULT_STAGE_CACHE_LIMIT;
  const stageLimit = Number.parseInt(fs.readFileSync(stageLimitFile, "utf8").trim(), 10);
  return Number.isFinite(stageLimit) && stageLimit > 0 ? stageLimit : DEFAULT_STAGE_CACHE_LIMIT;
}

function refreshDatamineCaches(customVersion = null) {
  const seqCache = writeSequentialBossCache(resolveSequentialStageLimit());
  const summary = buildDatamineSummary(seqCache, customVersion);
  fs.writeFileSync(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

async function refreshDatamineCachesAsync() {
  const exportVersion = await resolveExportVersionAsync();
  return refreshDatamineCaches(exportVersion);
}

if (require.main === module) {
  refreshDatamineCachesAsync().then((summary) => {
    console.log(`[datamine-cache] refreshed ${SUMMARY_FILE} at ${summary.generatedAt} (Snapshot: ${summary.snapshot?.version}, Sources: ${summary.snapshot?.sources?.length || 0})`);
  }).catch((err) => {
    console.error(`[datamine-cache] failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  SUMMARY_FILE,
  refreshDatamineCaches,
  refreshDatamineCachesAsync,
  resolveExportVersion,
  resolveExportVersionAsync
};
