const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const {
  processFceMechanics,
  extractMatchingBossEntries,
  extractBossNumber,
  parseBossKeyFamily,
  groupMechanicsByBoss,
  formatMechanics,
  buildAllBossesCatalog,
  generateBossReportMarkdown,
  collectBossTextIds,
  findNewBosses,
  generateNewBossReportMarkdown
} = require("../pipeline/processors/parse-fce-mechanics.js");

test("FCE Boss Report: 4-phase bosses first and deterministically sorted by bossNum ascending", () => {
  const fixtureEn = {
    // Boss 100 -> 2 phases (1, 2)
    Boss_hum_100_1_des: "Boss 100 Phase 1 EN",
    Boss_hum_100_2_des: "Boss 100 Phase 2 EN",

    // Boss 200 -> 4 phases (1, 2, 3, 4)
    Boss_hum_200_1_des: "Boss 200 Phase 1 EN",
    Boss_hum_200_2_des: "Boss 200 Phase 2 EN",
    Boss_hum_200_3_des: "Boss 200 Phase 3 EN",
    Boss_hum_200_4_des: "Boss 200 Phase 4 EN",

    // Boss 150 -> 1 phase (1)
    Boss_hum_150_1_des: "Boss 150 Phase 1 EN",

    // Boss 300 -> 4 phases (1, 2, 3, 4)
    Boss_hum_300_1_des: "Boss 300 Phase 1 EN",
    Boss_hum_300_2_des: "Boss 300 Phase 2 EN",
    Boss_hum_300_3_des: "Boss 300 Phase 3 EN",
    Boss_hum_300_4_des: "Boss 300 Phase 4 EN"
  };

  const fixtureRu = {
    Boss_hum_100_1_des: "Босс 100 Фаза 1 RU",
    Boss_hum_200_1_des: "Босс 200 Фаза 1 RU",
    Boss_hum_150_1_des: "Босс 150 Фаза 1 RU",
    Boss_hum_300_1_des: "Босс 300 Фаза 1 RU"
  };

  const enGrouped = groupMechanicsByBoss(fixtureEn);
  const ruGrouped = groupMechanicsByBoss(fixtureRu);

  const catalog = [
    { configId: "b100", bossNum: 100, bossId: "boss_100", sourceName: "Boss One Hundred" },
    { configId: "b200", bossNum: 200, bossId: "boss_200", sourceName: "Boss Two Hundred" },
    { configId: "b150", bossNum: 150, bossId: "boss_150", sourceName: "Boss One Fifty" },
    { configId: "b300", bossNum: 300, bossId: "boss_300", sourceName: "Boss Three Hundred" }
  ];

  const result = buildAllBossesCatalog(enGrouped, ruGrouped, catalog);

  assert.equal(result.allBosses.length, 4);
  assert.equal(result.fourPhaseBosses.length, 2);
  assert.equal(result.otherBosses.length, 2);

  // Group 1: 4-phase bosses ordered by bossNum ascending -> Boss 200, Boss 300
  assert.deepEqual(
    result.fourPhaseBosses.map((b) => b.bossNum),
    [200, 300]
  );

  // Group 2: Other bosses ordered by bossNum ascending -> Boss 100, Boss 150
  assert.deepEqual(
    result.otherBosses.map((b) => b.bossNum),
    [100, 150]
  );

  const markdown = generateBossReportMarkdown(result);

  // Assert markdown layout
  assert.match(markdown, /Total bosses: \*\*4\*\* \(with at least 4 mechanics: \*\*2\*\*, others: \*\*2\*\*\)/);
  assert.match(markdown, /## Bosses with at least 4 mechanics \(2\)/);
  assert.match(markdown, /## Other bosses \(2\)/);
  assert.doesNotMatch(markdown, /Босс|Фаза|Босс 100 Фаза|\*\*RU:\*\*/);

  const pos200 = markdown.indexOf("boss_200");
  const pos300 = markdown.indexOf("boss_300");
  const pos100 = markdown.indexOf("boss_100");
  const pos150 = markdown.indexOf("boss_150");

  assert.ok(pos200 < pos300, "boss_200 must appear before boss_300");
  assert.ok(pos300 < pos100, "boss_300 (4-phase) must appear before boss_100 (2-phase)");
  assert.ok(pos100 < pos150, "boss_100 must appear before boss_150");
});

test("FCE Boss Report: existing curated bosses are not filtered out", () => {
  const fixtureEn = {
    Boss_hum_002_2_des: "Minotaur phase 2",
    Boss_hum_002_3_des: "Minotaur phase 3",
    Boss_hum_002_4_des: "Minotaur phase 4",
    Boss_hum_002_5_des: "Minotaur phase 5"
  };
  const enGrouped = groupMechanicsByBoss(fixtureEn);
  const catalog = [{ configId: "void_boss_12", bossNum: 2, bossId: "boss_002", sourceName: "Minotaur" }];

  const result = buildAllBossesCatalog(enGrouped, {}, catalog);
  assert.equal(result.allBosses.length, 1);
  assert.equal(result.allBosses[0].bossId, "boss_002");
  assert.equal(result.allBosses[0].phaseCount, 4);
});

test("FCE Boss Report: boss with missing text or missing localization is preserved", () => {
  const fixtureEn = {
    Boss_hum_050_1_des: "Boss 50 phase 1"
  };
  const enGrouped = groupMechanicsByBoss(fixtureEn);
  const catalog = [
    { configId: "b50", bossNum: 50, bossId: "boss_050", sourceName: "Boss 50" },
    { configId: "b99", bossNum: 99, bossId: "boss_099", sourceName: "Boss 99 (no loc strings)" }
  ];

  const result = buildAllBossesCatalog(enGrouped, {}, catalog);
  assert.equal(result.allBosses.length, 2);

  const boss99 = result.allBosses.find((b) => b.bossNum === 99);
  assert.ok(boss99, "Boss 99 must exist in catalogue");
  assert.equal(boss99.phaseCount, 0);
  assert.equal(boss99.mechanics.length, 0);

  const markdown = generateBossReportMarkdown(result);
  assert.match(markdown, /Boss: `boss_099` \(0 mechanics\)/);
  assert.match(markdown, /No combat mechanic text was found in the English localization export/);
});

test("FCE Boss Report: duplicate phase keys do not artificially inflate phaseCount", () => {
  const fixtureEn = {
    // 4 distinct phases: 2, 3, 4, 5. But phase 2 and 4 have secondary buff keys!
    Boss_hum_002_2_des: "Minotaur phase 2 primary",
    Buff_boss_002_02_des: "Minotaur phase 2 buff",
    Boss_hum_002_3_des: "Minotaur phase 3 primary",
    Boss_hum_002_4_des: "Minotaur phase 4 primary",
    Buff_boss_002_4_des: "Minotaur phase 4 buff",
    Boss_hum_002_5_des: "Minotaur phase 5 primary"
  };

  const enGrouped = groupMechanicsByBoss(fixtureEn);
  assert.equal(Object.keys(enGrouped["boss_002"].mechanics).length, 4);

  const result = buildAllBossesCatalog(enGrouped, {}, []);
  assert.equal(result.allBosses[0].phaseCount, 4);
  assert.equal(result.fourPhaseBosses.length, 1);
  assert.equal(result.otherBosses.length, 0);
});

test("FCE Boss Report: deterministic ordering regardless of input insertion order", () => {
  const fixtureA = {
    Boss_hum_300_1_des: "T1",
    Boss_hum_300_2_des: "T2",
    Boss_hum_300_3_des: "T3",
    Boss_hum_300_4_des: "T4",
    Boss_hum_100_1_des: "T1",
    Boss_hum_200_1_des: "T1",
    Boss_hum_200_2_des: "T2",
    Boss_hum_200_3_des: "T3",
    Boss_hum_200_4_des: "T4"
  };

  const fixtureB = {
    Boss_hum_100_1_des: "T1",
    Boss_hum_200_3_des: "T3",
    Boss_hum_200_1_des: "T1",
    Boss_hum_300_4_des: "T4",
    Boss_hum_200_4_des: "T4",
    Boss_hum_300_2_des: "T2",
    Boss_hum_300_1_des: "T1",
    Boss_hum_200_2_des: "T2",
    Boss_hum_300_3_des: "T3"
  };

  const resA = buildAllBossesCatalog(groupMechanicsByBoss(fixtureA), {}, []);
  const resB = buildAllBossesCatalog(groupMechanicsByBoss(fixtureB), {}, []);

  const mdA = generateBossReportMarkdown(resA);
  const mdB = generateBossReportMarkdown(resB);

  assert.equal(mdA, mdB, "Different input insertion order must yield byte-equivalent markdown");
});

test("FCE new-boss report uses the text-ID baseline and requires at least 4 mechanics", () => {
  const fixtureEn = {
    Boss_hum_100_1_des: "Known boss mechanic 1",
    Boss_hum_100_2_des: "Known boss mechanic 2",
    Boss_hum_100_3_des: "Known boss mechanic 3",
    Boss_hum_100_4_des: "Known boss mechanic 4 added later",
    Boss_hum_200_1_des: "New boss mechanic 1",
    Boss_hum_200_2_des: "New boss mechanic 2",
    Boss_hum_200_3_des: "New boss mechanic 3",
    Boss_hum_200_4_des: "New boss mechanic 4",
    Boss_hum_300_1_des: "Incomplete boss mechanic 1",
    Boss_hum_300_2_des: "Incomplete boss mechanic 2",
    Boss_hum_300_3_des: "Incomplete boss mechanic 3"
  };
  const catalog = buildAllBossesCatalog(groupMechanicsByBoss(fixtureEn), {}, []);
  const knownState = {
    initialized: true,
    textIds: new Set([
      "Boss_hum_100_1_des",
      "Boss_hum_100_2_des",
      "Boss_hum_100_3_des"
    ])
  };

  const newBosses = findNewBosses(catalog, knownState);
  assert.deepEqual(newBosses.map((boss) => boss.bossId), ["boss_200"]);
  assert.equal(collectBossTextIds(catalog.allBosses).length, 11);

  const markdown = generateNewBossReportMarkdown(newBosses, true);
  assert.match(markdown, /New bosses: \*\*1\*\*/);
  assert.match(markdown, /boss_200/);
  assert.doesNotMatch(markdown, /boss_100|boss_300|\*\*RU:\*\*/);
});

test("FCE first run initializes the baseline without reporting the current catalog as new", () => {
  const fixtureEn = {
    Boss_hum_200_1_des: "Mechanic 1",
    Boss_hum_200_2_des: "Mechanic 2",
    Boss_hum_200_3_des: "Mechanic 3",
    Boss_hum_200_4_des: "Mechanic 4"
  };
  const catalog = buildAllBossesCatalog(groupMechanicsByBoss(fixtureEn), {}, []);
  const newBosses = findNewBosses(catalog, { initialized: false, textIds: new Set() });

  assert.deepEqual(newBosses, []);
  assert.match(generateNewBossReportMarkdown(newBosses, false), /baseline was initialized/i);
});

test("FCE processing writes a full English report and advances the new-boss snapshot", () => {
  const root = fs.mkdtempSync(path.join(require("os").tmpdir(), "tof-fce-report-"));
  const raw = path.join(root, "raw");
  const enPath = path.join(raw, "Hotta/Content/Localization/Game/en/Game.json");
  const catalogPath = path.join(
    raw,
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/VoidCloneBossConfigDataTable_Overseas.json"
  );
  const curatedBossDir = path.join(root, "datamine/fce/data/bosses");

  const writeJson = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
  };
  const mechanicsFor = (number, count) => Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `Boss_hum_${number}_${index + 1}_des`,
      `Boss ${number} mechanic ${index + 1}`
    ])
  );

  try {
    writeJson(path.join(curatedBossDir, "existing.json"), { boss_id: "boss_999" });
    writeJson(enPath, mechanicsFor(200, 4));
    writeJson(catalogPath, {
      Rows: {
        boss200: { BossNameText: { Key: "Boss_200_name", SourceString: "Boss 200" } }
      }
    });

    const first = processFceMechanics(raw, root);
    assert.equal(first.newBosses, 0);
    const firstNewReport = fs.readFileSync(path.join(root, "datamine/fce/docs/NEW_BOSSES_TEXTS.md"), "utf8");
    const fullReport = fs.readFileSync(path.join(root, "datamine/fce/docs/ALL_BOSSES_TEXTS.md"), "utf8");
    assert.match(firstNewReport, /baseline was initialized/i);
    assert.match(fullReport, /Boss 200 mechanic 1/);
    assert.doesNotMatch(fullReport, /\*\*RU:\*\*|Фаза|Босс:/);

    writeJson(enPath, { ...mechanicsFor(200, 4), ...mechanicsFor(300, 4), ...mechanicsFor(400, 3) });
    writeJson(catalogPath, {
      Rows: {
        boss200: { BossNameText: { Key: "Boss_200_name", SourceString: "Boss 200" } },
        boss300: { BossNameText: { Key: "Boss_300_name", SourceString: "Boss 300" } },
        boss400: { BossNameText: { Key: "Boss_400_name", SourceString: "Boss 400" } }
      }
    });

    const second = processFceMechanics(raw, root);
    assert.equal(second.newBosses, 1);
    const secondNewReport = fs.readFileSync(path.join(root, "datamine/fce/docs/NEW_BOSSES_TEXTS.md"), "utf8");
    assert.match(secondNewReport, /boss_300/);
    assert.doesNotMatch(secondNewReport, /boss_200|boss_400/);

    const state = JSON.parse(fs.readFileSync(path.join(root, "datamine/fce/data/fce-known-boss-text-ids.json"), "utf8"));
    assert.equal(state.initialized, true);
    assert.equal(state.textIds.length, 11);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
