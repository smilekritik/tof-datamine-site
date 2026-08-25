const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const {
  extractMatchingBossEntries,
  extractBossNumber,
  parseBossKeyFamily,
  groupMechanicsByBoss,
  formatMechanics,
  buildAllBossesCatalog,
  generateBossReportMarkdown
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
  assert.match(markdown, /Всего боссов: \*\*4\*\* \(с 4 фазами: \*\*2\*\*, остальные: \*\*2\*\*\)/);
  assert.match(markdown, /## 4-phase bosses \(2 боссов\)/);
  assert.match(markdown, /## Other bosses \(2 боссов\)/);

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
  assert.match(markdown, /Босс: `boss_099` \(0 фаз\)/);
  assert.match(markdown, /Тексты механик боя отсутствуют в выгрузке локализации/);
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
