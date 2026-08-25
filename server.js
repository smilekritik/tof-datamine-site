const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');
const fs = require('fs');
const path = require('path');
const {
  SUMMARY_FILE,
  refreshDatamineCaches,
  refreshDatamineCachesAsync
} = require('./scripts/build-datamine-cache');
const { buildIndex: buildFceIndex } = require('./pipeline/processors/build-fce-index');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const DATAMINE_ROOT = path.join(__dirname, 'datamine');
const DATAMINE_CACHE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;
const ONE_DAY_SECONDS = 24 * 60 * 60;

app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function setDatamineCacheHeaders(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();

  // Revalidate page shells so deployments become visible immediately. Their
  // heavier data and assets below remain cached between datamine sections.
  if (extension === '.html') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return;
  }

  // Datamine exports are rebuilt daily. Reuse them immediately for a day,
  // then serve the stored copy while the browser revalidates in background.
  if (extension === '.json' || extension === '.txt' || extension === '.csv') {
    res.setHeader(
      'Cache-Control',
      `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=${THREE_DAYS_SECONDS - ONE_DAY_SECONDS}`
    );
    return;
  }

  if (extension === '.js' || extension === '.css') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return;
  }

  // Images and fonts are reused directly for three days.
  res.setHeader('Cache-Control', `public, max-age=${THREE_DAYS_SECONDS}`);
}

// Keep datamine caching owned by this Node server. This mount must stay before
// the generic site mount so every /datamine response gets the intended policy.
app.use('/datamine', express.static(DATAMINE_ROOT, {
  etag: true,
  lastModified: true,
  setHeaders: setDatamineCacheHeaders
}));

app.use(express.static('.'));

// Path to store descriptions
const DESCRIPTIONS_FILE = path.join(__dirname, 'data', 'console-descriptions.json');
const DATAMINE_ITEMS_FILES = {
  gacha: path.join(
    __dirname,
    'datamine',
    'items',
    'data',
    'merged_mapping_with_original.json'
  ),
  mmo: path.join(
    __dirname,
    'datamine',
    'items',
    'data',
    'merged_mapping_with_original_mmo.json'
  )
};

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  console.log('[SERVER] Creating data directory...');
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize descriptions file if it doesn't exist
if (!fs.existsSync(DESCRIPTIONS_FILE)) {
  console.log('[SERVER] Creating initial descriptions file:', DESCRIPTIONS_FILE);
  fs.writeFileSync(DESCRIPTIONS_FILE, JSON.stringify({}, null, 2));
} else {
  console.log('[SERVER] Descriptions file exists:', DESCRIPTIONS_FILE);
  try {
    const content = fs.readFileSync(DESCRIPTIONS_FILE, 'utf8');
    const parsed = JSON.parse(content);
    console.log('[SERVER] Current descriptions count:', Object.keys(parsed).length);
  } catch (error) {
    console.error('[SERVER] Error reading descriptions file:', error.message);
    console.log('[SERVER] Reinitializing file...');
    fs.writeFileSync(DESCRIPTIONS_FILE, JSON.stringify({}, null, 2));
  }
}

function resolveItemsMode(value) {
  return value === 'mmo' ? 'mmo' : 'gacha';
}

function getItemsFilePath(mode) {
  return DATAMINE_ITEMS_FILES[resolveItemsMode(mode)];
}

function readDatamineItemsJson(mode) {
  const raw = fs.readFileSync(getItemsFilePath(mode), 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Datamine items JSON must be an object map.');
  }

  return parsed;
}

function writeDatamineItemsJson(mode, payload) {
  fs.writeFileSync(getItemsFilePath(mode), JSON.stringify(payload, null, 2));
}

// Version endpoints mapping
const versionUrls = {
  'korea2': 'https://htkrydpatch1.wmupd.com/clientRes/TestPC_KRNew/Version/Windows/config.xml',
  'korea1': 'https://htkrydpatch1.wmupd.com/clientRes/TestPC_KR2New/Version/Windows/config.xml',
  'taiwan1': 'https://patchht1.iwplay.com.tw/clientRes/TestPC_IW_2_5_0/Version/Windows/config.xml',
  'taiwan2': 'https://patchht1.iwplay.com.tw/clientRes/TestPC_IW_3_0_0/Version/Windows/config.xml',
  'global': 'https://htkrydpatch1.wmupd.com/clientRes/OBPC_Xianqian/Version/Windows/config.xml',
  'cn': 'https://htcdn1.wmupd.com/clientRes/AdvLaunch52/Version/Windows/config.xml'
};

const VERSION_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const versionCache = new Map(); // client -> { version, fetchedAt, checkedAt }

/**
 * Unified server-side version fetcher with in-memory TTL cache.
 */
async function fetchClientVersion(client) {
  const url = versionUrls[client];
  if (!url) {
    return { status: 404, error: 'Client not found' };
  }

  const cached = versionCache.get(client);
  const now = Date.now();
  if (cached && (now - cached.fetchedAt) < VERSION_CACHE_TTL_MS) {
    return {
      status: 200,
      data: {
        version: cached.version,
        cached: true,
        checkedAt: cached.checkedAt
      }
    };
  }

  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Upstream returned HTTP ${response.status}`);
    }
    const text = await response.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const resVersionNode = xml.getElementsByTagName('ResVersion')[0];
    const version = resVersionNode && resVersionNode.textContent ? resVersionNode.textContent.trim() : null;

    if (!version) {
      throw new Error('ResVersion not found in XML');
    }

    const checkedAt = new Date().toISOString();
    versionCache.set(client, {
      version,
      fetchedAt: now,
      checkedAt
    });

    return {
      status: 200,
      data: {
        version,
        cached: false,
        checkedAt
      }
    };
  } catch (error) {
    console.error(`[SERVER] Error fetching version for client '${client}':`, error.message);
    if (cached) {
      // Return stale cache if available upon upstream outage
      return {
        status: 200,
        data: {
          version: cached.version,
          cached: true,
          stale: true,
          checkedAt: cached.checkedAt
        }
      };
    }
    return { status: 502, error: error.message };
  }
}

// Possible servers an export can originate from. Maps the client resource
// segment (the "clientRes/<segment>" part of the config.xml URL, and the value
// stored as `branch` in the datamine export metadata) to a human region label.
// Anything not listed here resolves to DEFAULT_EXPORT_REGION.
const EXPORT_SERVERS = {
  'OBPC_2_5': {
    region: 'Global',
    url: 'https://htkrydpatch1.wmupd.com/clientRes/OBPC_2_5/Version/Windows/config.xml'
  }
};

const DEFAULT_EXPORT_REGION = 'unknown';

// Resolve which server/region an export came from based on its resource
// segment (branch). Falls back to "unknown" when the segment is unrecognized.
function resolveExportRegion(segment) {
  const entry = EXPORT_SERVERS[segment];
  return entry ? entry.region : DEFAULT_EXPORT_REGION;
}

app.get('/api/version/:client', async (req, res) => {
  const result = await fetchClientVersion(req.params.client);
  if (result.error) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  res.json(result.data);
});

// Get all versions at once
app.get('/api/versions', async (req, res) => {
  const results = {};
  const clientKeys = Object.keys(versionUrls);

  await Promise.all(clientKeys.map(async (client) => {
    const result = await fetchClientVersion(client);
    results[client] = result.data ? result.data.version : 'error';
  }));

  res.json(results);
});

// Report which server/region an export originates from. Unknown segments
// resolve to "unknown" so callers always receive a usable label.
app.get('/api/export-region/:segment', (req, res) => {
  const segment = req.params.segment;
  res.json({
    segment,
    region: resolveExportRegion(segment),
    url: EXPORT_SERVERS[segment]?.url || null
  });
});

// List all known export servers alongside the fallback region label.
app.get('/api/export-servers', (req, res) => {
  res.json({
    servers: EXPORT_SERVERS,
    defaultRegion: DEFAULT_EXPORT_REGION
  });
});

// API endpoints for console descriptions
app.get('/api/descriptions', (req, res) => {
  try {
    console.log('[SERVER] GET /api/descriptions - Reading file:', DESCRIPTIONS_FILE);
    const data = fs.readFileSync(DESCRIPTIONS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    console.log('[SERVER] Returning', Object.keys(parsed).length, 'descriptions');
    res.json(parsed);
  } catch (error) {
    console.error('[SERVER] Error reading descriptions:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/descriptions', (req, res) => {
  try {
    console.log('[SERVER] POST /api/descriptions - Received data');
    const descriptions = req.body;
    console.log('[SERVER] Number of descriptions:', Object.keys(descriptions).length);
    console.log('[SERVER] Writing to file:', DESCRIPTIONS_FILE);
    
    fs.writeFileSync(DESCRIPTIONS_FILE, JSON.stringify(descriptions, null, 2));
    
    console.log('[SERVER] File written successfully');
    
    // Verify the file was written
    const verify = fs.readFileSync(DESCRIPTIONS_FILE, 'utf8');
    const verifyParsed = JSON.parse(verify);
    console.log('[SERVER] Verification: file contains', Object.keys(verifyParsed).length, 'items');
    
    res.json({ success: true, count: Object.keys(descriptions).length });
  } catch (error) {
    console.error('[SERVER] Error saving descriptions:', error.message);
    console.error('[SERVER] Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/datamine/items', (req, res) => {
  try {
    const mode = resolveItemsMode(req.query?.mode);
    const data = readDatamineItemsJson(mode);
    res.json(data);
  } catch (error) {
    console.error('[SERVER] Error reading datamine items JSON:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/datamine/items/rename', (req, res) => {
  try {
    const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
    const rename = typeof req.body?.rename === 'string' ? req.body.rename : '';
    const mode = resolveItemsMode(req.body?.mode);

    if (!key) {
      return res.status(400).json({ error: 'Missing item key.' });
    }

    const data = readDatamineItemsJson(mode);
    const item = data[key];

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    item.rename = rename;
    writeDatamineItemsJson(mode, data);

    res.json({
      success: true,
      key,
      mode,
      item
    });
  } catch (error) {
    console.error('[SERVER] Error saving datamine item rename:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// The items local editor moved to datamine-builder/items/ (client-side, export-based).

// Rebuild the FCE per-boss manifest, but only when a per-boss file has changed
// since the manifest was last written (a card added/removed/edited). Keeps the
// daily job cheap when nothing changed.
function refreshFceIndexIfChanged() {
  try {
    const bossesDir = path.join(DATAMINE_ROOT, 'fce', 'data', 'bosses');
    const indexPath = path.join(DATAMINE_ROOT, 'fce', 'data', 'fce-index.json');
    if (!fs.existsSync(bossesDir)) return false;

    const files = fs.readdirSync(bossesDir).filter((f) => f.endsWith('.json'));
    const indexExists = fs.existsSync(indexPath);
    const indexMtime = indexExists ? fs.statSync(indexPath).mtimeMs : 0;
    const indexCount = indexExists
      ? (JSON.parse(fs.readFileSync(indexPath, 'utf8')).bosses || []).length
      : -1;

    const newestBoss = files.reduce((max, f) => {
      const m = fs.statSync(path.join(bossesDir, f)).mtimeMs;
      return m > max ? m : max;
    }, 0);

    const changed = !indexExists || files.length !== indexCount || newestBoss > indexMtime;
    if (!changed) return false;

    buildFceIndex();
    console.log(`[SERVER] FCE manifest rebuilt (${files.length} bosses) — per-boss files changed.`);
    return true;
  } catch (error) {
    console.error('[SERVER] FCE manifest rebuild failed:', error.message);
    return false;
  }
}

function refreshDatamineCachesInBackground() {
  setImmediate(async () => {
    try {
      // Rebuild the boss manifest first so the count/list in the cache is current.
      refreshFceIndexIfChanged();
      const summary = await refreshDatamineCachesAsync();
      console.log(`[SERVER] Datamine caches refreshed at ${summary.generatedAt} (Version: ${summary.exportVersion?.version}, Client: ${summary.exportVersion?.clientName})`);
    } catch (error) {
      console.error('[SERVER] Datamine cache refresh failed:', error.message);
    }
  });
}

function scheduleDatamineCacheRefresh() {
  const cacheAge = fs.existsSync(SUMMARY_FILE)
    ? Date.now() - fs.statSync(SUMMARY_FILE).mtimeMs
    : Number.POSITIVE_INFINITY;

  if (cacheAge >= DATAMINE_CACHE_INTERVAL_MS) {
    refreshDatamineCachesInBackground();
  }

  const firstDelay = cacheAge >= DATAMINE_CACHE_INTERVAL_MS
    ? DATAMINE_CACHE_INTERVAL_MS
    : Number.isFinite(cacheAge)
    ? Math.max(1000, DATAMINE_CACHE_INTERVAL_MS - cacheAge)
    : DATAMINE_CACHE_INTERVAL_MS;

  const firstTimer = setTimeout(() => {
    refreshDatamineCachesInBackground();
    const dailyTimer = setInterval(refreshDatamineCachesInBackground, DATAMINE_CACHE_INTERVAL_MS);
    dailyTimer.unref();
  }, firstDelay);
  firstTimer.unref();
}

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.status(404).sendFile(path.join(DATAMINE_ROOT, '404.html'));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`TOF version proxy server running on http://localhost:${PORT}`);
  scheduleDatamineCacheRefresh();
});
