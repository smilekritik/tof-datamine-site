const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  DATAMINE_PUBLIC_PAGES: publicPages,
  DATAMINE_SOCIAL_IMAGE: socialImage
} = require("./datamine-social-meta");

const root = path.resolve(__dirname, "..");
const datamineRoot = path.join(root, "datamine");
for (const relativePath of publicPages) {
  const html = fs.readFileSync(path.join(datamineRoot, relativePath), "utf8");
  assert(html.includes("data-datamine-header"), `${relativePath} must mount the shared header.`);
  assert(html.includes("shared/header.js"), `${relativePath} must load the shared header script.`);
  assert(html.includes("shared/header.css"), `${relativePath} must load the shared header styles.`);
  assert(html.includes("shared/version-status.js"), `${relativePath} must load the shared version status script.`);
  assert(html.includes("data-datamine-footer"), `${relativePath} must mount the shared footer.`);
  assert(html.includes("shared/footer.js"), `${relativePath} must load the shared footer script.`);
  assert(html.includes("shared/footer.css"), `${relativePath} must load the shared footer styles.`);
  assert(html.includes("shared/fonts.css"), `${relativePath} must load the local font bundle.`);
  assert(html.includes('property="og:title"'), `${relativePath} must define an Open Graph title.`);
  assert(html.includes('property="og:description"'), `${relativePath} must define an Open Graph description.`);
  assert(
    !html.includes("All rights reserved"),
    `${relativePath} must not include legacy 'All rights reserved'.`
  );
  assert(
    !/©\s*202\d/.test(html),
    `${relativePath} must not contain hardcoded copyright year in HTML.`
  );
  assert(
    html.includes(`property="og:image" content="${socialImage.url}"`),
    `${relativePath} must use the shared Open Graph preview image.`
  );
  assert(
    html.includes(`property="og:image:secure_url" content="${socialImage.url}"`),
    `${relativePath} must use the shared secure Open Graph preview image.`
  );
  assert(
    html.includes(`name="twitter:image" content="${socialImage.url}"`),
    `${relativePath} must use the shared Twitter preview image.`
  );
  assert(
    html.includes(`property="og:image:width" content="${socialImage.width}"`),
    `${relativePath} must expose the shared preview width.`
  );
  assert(
    html.includes(`property="og:image:height" content="${socialImage.height}"`),
    `${relativePath} must expose the shared preview height.`
  );
  assert(
    html.includes(`content="${socialImage.twitterCard}"`),
    `${relativePath} must request a large social preview.`
  );
  assert(html.includes('rel="canonical"'), `${relativePath} must define a canonical URL.`);
}

const socialImagePath = path.join(datamineRoot, "social", socialImage.fileName);
const socialImageBytes = fs.readFileSync(socialImagePath);
assert(socialImageBytes.subarray(1, 4).toString("ascii") === "PNG", "Shared social image must be PNG.");
assert(
  socialImageBytes.readUInt32BE(16) === socialImage.width,
  `Shared social image width must be ${socialImage.width}px.`
);
assert(
  socialImageBytes.readUInt32BE(20) === socialImage.height,
  `Shared social image height must be ${socialImage.height}px.`
);

const requiredStandaloneAssets = [
  "shared/fonts.css",
  "shared/base.css",
  "shared/shell.css",
  "shared/header.css",
  "shared/header.js",
  "shared/footer.css",
  "shared/footer.js",
  "shared/site-config.js",
  "shared/version-status.js",
  "shared/data-meta.js",
  "shared/i18n.js",
  "about/styles/datamine-about.css",
  "about/js/datamine-about.js",
  "contribute/styles/datamine-contribute.css",
  "contribute/js/datamine-contribute.js",
  "projects/styles/datamine-projects.css",
  "projects/js/projects-data.js",
  "projects/js/datamine-projects.js",
  "changelog/styles/datamine-changelog.css",
  "changelog/js/changelog-data.js",
  "changelog/js/datamine-changelog.js",
  "privacy/styles/datamine-privacy.css",
  "privacy/js/datamine-privacy.js",
  "js/hub.js",
  "styles/hub.css",
  "data/datamine-summary.json",
  "data/export-version.json",
  "oow/js/support.js",
  "oow/js/oow-bootstrap.js",
  "oow/js/domain/oow-domain.js",
  "oow/js/adapters/oow-view-adapters.js",
  "oow/styles/oow.css",
  "vendor/react-18.3.1.production.min.js",
  "vendor/react-dom-18.3.1.production.min.js",
  "fonts/manrope-latin.woff2",
  "fonts/manrope-cyrillic.woff2",
  "fonts/jetbrains-mono-latin.woff2",
  "fonts/jetbrains-mono-cyrillic.woff2",
  "fonts/spectral-400-latin.woff2",
  "fonts/spectral-400-cyrillic.woff2"
];
for (const relativePath of requiredStandaloneAssets) {
  assert(fs.existsSync(path.join(datamineRoot, relativePath)), `Standalone asset is missing: ${relativePath}`);
}

function collectRuntimeSources(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "vendor") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeSources(absolutePath));
    } else if (/\.(?:html|css|js)$/i.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const forbiddenRuntimePatterns = [
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /unpkg\.com/i,
  /http:\/\/(?:127\.0\.0\.1|localhost):/i,
  /\.\.\/\.\.\/datamine\//i
];
for (const sourcePath of collectRuntimeSources(datamineRoot)) {
  const source = fs.readFileSync(sourcePath, "utf8");
  for (const pattern of forbiddenRuntimePatterns) {
    assert(!pattern.test(source), `${path.relative(datamineRoot, sourcePath)} contains forbidden runtime dependency ${pattern}.`);
  }
}

assert(
  !fs.existsSync(path.join(root, "datamine-pipeline", "style", "OOW Dashboard.dc.html")),
  "OOW must have a single interface source at datamine/oow/index.html."
);

const headerSource = fs.readFileSync(path.join(datamineRoot, "shared", "header.js"), "utf8");
const expectedOrder = ['id: "oow"', 'id: "fce"', 'id: "seq"', 'id: "multype"', 'id: "items"'];
let previousIndex = -1;
for (const token of expectedOrder) {
  const index = headerSource.indexOf(token);
  assert(index > previousIndex, `Shared header order is invalid at ${token}.`);
  previousIndex = index;
}

const summaryPath = path.join(datamineRoot, "data", "datamine-summary.json");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const releaseManifest = JSON.parse(fs.readFileSync(path.join(datamineRoot, "release-manifest.json"), "utf8"));
assert(fs.statSync(summaryPath).size < 64 * 1024, "Datamine summary must stay below 64 KB.");
assert(summary.snapshot?.version, "Snapshot version must be present in datamine summary.");
assert(Array.isArray(summary.snapshot?.sources) && summary.snapshot.sources.length > 0, "Snapshot sources must be present in datamine summary.");
assert(JSON.stringify(summary.snapshot) === JSON.stringify(releaseManifest.snapshot), "Datamine summary snapshot must project release manifest exactly.");
assert(fs.existsSync(path.join(datamineRoot, "data", "export-version.json")), "datamine/data/export-version.json must exist.");
assert(summary.oow?.seasons?.length === summary.oow?.seasonCount, "OOW season summary is inconsistent.");
assert(summary.sequential?.floorCount > 0, "Sequential cache metadata is missing.");
assert(!fs.existsSync(path.join(datamineRoot, "user")), "Legacy datamine/user output must not be published.");

const sequentialCache = JSON.parse(
  fs.readFileSync(path.join(datamineRoot, "seq", "data", "seq-boss-cache.json"), "utf8")
);
assert(
  ["missing-next-stage", "anomalous-cn-jump", "requested-stage-limit", "scan-limit"].includes(
    sequentialCache.meta?.detectedCutoffType
  ),
  "Sequential cache must describe how the Global stage cutoff was detected."
);
const sequentialClient = fs.readFileSync(
  path.join(datamineRoot, "seq", "js", "datamine-seq.js"),
  "utf8"
);
assert(
  !sequentialClient.includes("/api/seq-cache/refresh"),
  "Sequential page must not trigger cache generation during a user visit."
);
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
assert(
  !serverSource.includes("app.get('/api/seq-cache/refresh'"),
  "Public cache-refresh endpoint must stay disabled."
);

const oowIndex = JSON.parse(fs.readFileSync(path.join(datamineRoot, "oow", "data", "index.json"), "utf8"));
const oowSummary = JSON.parse(fs.readFileSync(path.join(datamineRoot, "oow", "data", "current", "summary.json"), "utf8"));
assert(oowIndex.standard?.seasons?.length && oowIndex.mmo?.seasons?.length, "OOW authoritative index must contain both modes.");
assert(oowSummary.schemaVersion === 2, "OOW summary must use the lightweight schema.");
assert(
  [...oowSummary.recentSeasons, ...oowSummary.mmoRecentSeasons].every((season) => !Object.hasOwn(season, "floors")),
  "OOW summary must not duplicate full season payloads."
);
for (const legacy of ["oow_stats.json", "oow_mmo_stats.json", "oow_deep_intel.json", "oow_current_seasons.json"]) {
  assert(!fs.existsSync(path.join(datamineRoot, "oow", "data", legacy)), `Public OOW data must not contain build-only ${legacy}.`);
}

const fceMissing = JSON.parse(
  fs.readFileSync(path.join(datamineRoot, "fce", "data", "fce-missing-boss-texts.json"), "utf8")
);
assert(fceMissing.catalogSource, "FCE missing-text report must identify the in-game boss catalog.");
assert(Array.isArray(fceMissing.bosses), "FCE missing-text report must contain a boss list.");

const multypeHtml = fs.readFileSync(path.join(datamineRoot, "multype", "index.html"), "utf8");
const multypeCss = fs.readFileSync(
  path.join(datamineRoot, "multype", "styles", "datamine-multype.css"),
  "utf8"
);
const multypeVersion = fs.readFileSync(path.join(datamineRoot, "multype", "data", "version.txt"), "utf8").trim();
assert(multypeVersion, "Multype version.txt must not be empty.");
assert(multypeHtml.includes("data-multype-version"), "Multype page must render the version badge.");
assert(
  !multypeCss.includes('html[data-multype-theme="light"] .page--datamine-multype {'),
  "Multype light theme must not recolor the entire page."
);

const pageStructure = {
  about: ["js", "styles"],
  projects: ["js", "styles"],
  oow: ["assets", "data", "js", "styles"],
  fce: ["assets", "data", "docs", "js", "styles"],
  seq: ["data", "js", "styles"],
  multype: ["data", "js", "styles"],
  items: ["data", "js", "styles"]
};
for (const [page, directories] of Object.entries(pageStructure)) {
  const pageRoot = path.join(datamineRoot, page);
  for (const directory of directories) {
    assert(fs.statSync(path.join(pageRoot, directory)).isDirectory(), `${page}/${directory}/ must exist.`);
  }
  const unexpectedFiles = fs.readdirSync(pageRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !["index.html", "local.html"].includes(entry.name))
    .map((entry) => entry.name);
  assert(unexpectedFiles.length === 0, `${page}/ has files outside the standard directories: ${unexpectedFiles.join(", ")}`);
}

for (const directory of ["data", "docs", "fonts", "js", "shared", "social", "styles", "vendor"]) {
  assert(fs.statSync(path.join(datamineRoot, directory)).isDirectory(), `datamine/${directory}/ must exist.`);
}
const unexpectedRootAssets = fs.readdirSync(datamineRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:css|js|json|txt)$/i.test(entry.name))
  .filter((entry) => !["release-manifest.json", "robots.txt"].includes(entry.name))
  .map((entry) => entry.name);
assert(
  unexpectedRootAssets.length === 0,
  `datamine/ has runtime files outside the standard directories: ${unexpectedRootAssets.join(", ")}`
);

console.log(`[datamine-check] ${publicPages.length} standalone pages, shared header, and summary cache are valid.`);
