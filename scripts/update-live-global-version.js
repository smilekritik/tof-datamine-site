const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { DOMParser } = require("xmldom");

const DEFAULT_SOURCE_URL =
  "https://htkrydpatch1.wmupd.com/clientRes/OBPC_Xianqian/Version/Windows/config.xml";
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  "..",
  "datamine",
  "data",
  "live-global-version.json"
);

function parseResVersion(xmlText) {
  if (typeof xmlText !== "string" || !xmlText.trim()) {
    throw new Error("Global config.xml is empty.");
  }

  const document = new DOMParser().parseFromString(xmlText, "text/xml");
  const versionNode = document.getElementsByTagName("ResVersion")[0];
  const version = versionNode?.textContent?.trim() || "";

  if (!/^\d+(?:\.\d+)+$/.test(version)) {
    throw new Error("Global config.xml does not contain a valid ResVersion.");
  }

  return version;
}

function writeJsonAtomically(outputPath, payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;

  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

async function updateLiveGlobalVersion(options = {}) {
  const sourceUrl = options.sourceUrl || process.env.TOF_GLOBAL_VERSION_URL || DEFAULT_SOURCE_URL;
  const outputPath = path.resolve(
    options.outputPath || process.env.TOF_GLOBAL_VERSION_OUTPUT || DEFAULT_OUTPUT_PATH
  );
  const response = await fetch(sourceUrl, {
    timeout: 15000,
    headers: { "User-Agent": "TOF-Datamine-Version-Updater/1.0" }
  });

  if (!response.ok) {
    throw new Error(`Global version source returned HTTP ${response.status}.`);
  }

  const version = parseResVersion(await response.text());
  const payload = {
    version,
    checkedAt: new Date().toISOString(),
    source: "Tower of Fantasy Global launcher"
  };

  writeJsonAtomically(outputPath, payload);
  return { outputPath, ...payload };
}

if (require.main === module) {
  updateLiveGlobalVersion()
    .then((result) => {
      console.log(`[live-global-version] ${result.version} -> ${result.outputPath}`);
    })
    .catch((error) => {
      console.error(`[live-global-version] Update failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_SOURCE_URL,
  parseResVersion,
  updateLiveGlobalVersion
};
