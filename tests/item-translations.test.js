const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const canonicalProcessor = require("../pipeline/processors/build-items-json.js");
const { importTranslations, suspiciousReasons } = require("../tools/import-item-translations.js");

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tof-item-translations-"));
  const rawDir = path.join(root, "raw");
  const curatedDir = path.join(root, "datamine", "items", "curated");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(curatedDir, { recursive: true });
  for (const name of ["gacha-overrides.json", "mmo-overrides.json", "gacha-translations.json", "mmo-translations.json"]) {
    fs.writeFileSync(path.join(curatedDir, name), "{}\n", "utf8");
  }
  return { root, rawDir, curatedDir };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("A-E. translation fallback respects authoritative name, rename, unknown IDs, and empty entries", () => {
  const project = makeProject();
  try {
    writeJson(path.join(project.rawDir, "MappingItemId.json"), { A: 1, B: 2 });
    writeJson(path.join(project.rawDir, "MappingItemIdAndName.json"), { 1: "原文 A", 2: "原文 B" });
    writeJson(path.join(project.curatedDir, "gacha-overrides.json"), {
      A: { id: "A", rename: "Manual Rename" },
      B: { id: "B", name: "Official", rename: "Official Rename" }
    });
    writeJson(path.join(project.curatedDir, "gacha-translations.json"), {
      A: { name: "English A" },
      B: { name: "Machine" },
      Empty: { name: "" },
      Unknown: { name: "Unused" }
    });

    const target = path.join(project.root, "gacha-output.json");
    const stats = canonicalProcessor.processGachaItems(project.rawDir, target, project.root);
    const output = readJson(target);

    assert.equal(output["1"].name, "English A", "translation fills a missing name");
    assert.equal(output["2"].name, "Official", "authoritative name wins");
    assert.equal(output["1"].rename, "Manual Rename", "rename remains independent");
    assert.equal(output["2"].rename, "Official Rename");
    assert.equal(stats.translationsApplied, 1);
    assert.equal(stats.authoritativeNamesPreserved, 1);
    assert.equal(stats.translationEntriesUnused, 2, "empty translations are ignored and unknown IDs remain unused");
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("F. Gacha and MMO translations remain isolated", () => {
  const project = makeProject();
  try {
    writeJson(path.join(project.rawDir, "MappingItemId.json"), { Shared: 1 });
    writeJson(path.join(project.rawDir, "ST_Item_MMO.json"), {
      StringTable: { KeysToEntries: { Shared_name: "共享原文" } }
    });
    writeJson(path.join(project.curatedDir, "gacha-translations.json"), { Shared: { name: "Gacha Name" } });
    writeJson(path.join(project.curatedDir, "mmo-translations.json"), { Shared: { name: "MMO Name" } });

    const gachaTarget = path.join(project.root, "gacha.json");
    const mmoTarget = path.join(project.root, "mmo.json");
    canonicalProcessor.processGachaItems(project.rawDir, gachaTarget, project.root);
    canonicalProcessor.processMmoItems(project.rawDir, mmoTarget, project.root);

    assert.equal(readJson(gachaTarget)["1"].name, "Gacha Name");
    assert.equal(readJson(mmoTarget)["1"].name, "MMO Name");
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("Importer preserves conflicts by default, skips empty names, sorts IDs, and reports suspicious values", () => {
  const project = makeProject();
  try {
    writeJson(path.join(project.curatedDir, "gacha-translations.json"), {
      conflict: { name: "Existing curated translation" }
    });
    const source = path.join(project.root, "tof-items-gacha-translated.json");
    writeJson(source, {
      dataset: "gacha",
      count: 5,
      items: [
        { num: 99, id: "zeta", name: "Zeta", original: "原", rename: "Ignored", quality: "Ignored" },
        { id: "alpha", name: "Alpha" },
        { id: "empty", name: "", original: "" },
        { id: "conflict", name: "Incoming translation" },
        { id: "suspicious", name: "word word word word" }
      ]
    });

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));
    let stats;
    try {
      stats = importTranslations(source, { projectRoot: project.root });
    } finally {
      console.warn = originalWarn;
    }

    const imported = readJson(path.join(project.curatedDir, "gacha-translations.json"));
    assert.deepEqual(Object.keys(imported), ["alpha", "conflict", "suspicious", "zeta"]);
    assert.deepEqual(imported.alpha, { name: "Alpha" });
    assert.deepEqual(imported.zeta, { name: "Zeta" }, "only name is imported");
    assert.equal(imported.conflict.name, "Existing curated translation");
    assert.equal(stats.imported, 3);
    assert.equal(stats.skippedEmpty, 1);
    assert.equal(stats.existingPreserved, 1);
    assert.equal(stats.conflicts, 1);
    assert.equal(stats.suspicious.length, 1);
    assert.match(warnings[0], /CONFLICT conflict[\s\S]*existing:[\s\S]*incoming:/);
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("Importer --overwrite explicitly replaces a conflicting curated value", () => {
  const project = makeProject();
  try {
    writeJson(path.join(project.curatedDir, "mmo-translations.json"), { A: { name: "Existing" } });
    const source = path.join(project.root, "mmo.json");
    writeJson(source, { dataset: "mmo", items: [{ id: "A", name: "Incoming", num: 1 }] });
    const stats = importTranslations(source, { projectRoot: project.root, overwrite: true });
    assert.equal(readJson(path.join(project.curatedDir, "mmo-translations.json")).A.name, "Incoming");
    assert.equal(stats.imported, 1);
    assert.equal(stats.conflicts, 1);
    assert.equal(stats.existingPreserved, 0);
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("Suspicious diagnostics include length, newline/control characters, and repeated tokens", () => {
  assert(suspiciousReasons("x".repeat(121)).includes("longer than 120 characters"));
  assert(suspiciousReasons("line one\nline two").includes("contains a newline"));
  assert(suspiciousReasons("a\u0001b").includes("contains a control character"));
  assert(suspiciousReasons("echo echo echo echo").includes("contains a token repeated at least four times"));
});

test("G. canonical and portable processors produce byte-equivalent Items output", () => {
  const project = makeProject();
  try {
    const portableProcessor = require("../tof-fast-datamine/core/build-items-json.js");
    writeJson(path.join(project.rawDir, "MappingItemId.json"), { A: 1 });
    writeJson(path.join(project.rawDir, "MappingItemIdAndName.json"), { 1: "原文" });
    writeJson(path.join(project.curatedDir, "gacha-translations.json"), { A: { name: "English A" } });
    const canonicalTarget = path.join(project.root, "canonical.json");
    const portableTarget = path.join(project.root, "portable.json");
    canonicalProcessor.processGachaItems(project.rawDir, canonicalTarget, project.root);
    portableProcessor.processGachaItems(project.rawDir, portableTarget, project.root);
    assert(fs.readFileSync(canonicalTarget).equals(fs.readFileSync(portableTarget)));
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});
