const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fceRoot = path.join(root, "datamine", "fce");
const bossDir = path.join(fceRoot, "data", "bosses");
const index = JSON.parse(fs.readFileSync(path.join(fceRoot, "data", "fce-index.json"), "utf8"));
const filteredEn = JSON.parse(fs.readFileSync(path.join(fceRoot, "data", "Filtered_Game.json"), "utf8"));
const filteredRu = JSON.parse(fs.readFileSync(path.join(fceRoot, "data", "Filtered_Game_ru.json"), "utf8"));

const targets = [
  { slug: "zhuyan", id: "boss_hum_057", name: "Zhuyan", phases: [1, 2, 3, 4] },
  { slug: "habaka", id: "boss_hum_018", name: "Habaka", phases: [1, 2, 3, 4] },
  { slug: "fei-lian", id: "boss_hum_067", name: "Fei Lian", phases: [1, 2, 3, 4] },
  { slug: "nanto", id: "boss_hum_086", name: "Nanto", phases: [1, 2, 3, 4] },
  { slug: "chiron", id: "boss_hum_009", name: "Chiron", phases: [2, 3, 4, 5] },
  { slug: "eva", id: "boss_hum_045", name: "Eva", phases: [2, 3, 4, 5] },
  { slug: "phantasmic-scorpion", id: "boss_hum_074", name: "Scorpion", phases: [2, 3, 4, 5] },
  { slug: "defender", id: "boss_hum_079", name: "Defender", phases: [2, 3, 4, 5] },
  { slug: "black-crow", id: "boss_hum_059", name: "Black Crow", phases: [1, 2, 3, 4] },
  { slug: "robarg", id: "boss_006", name: "Robarg", phases: [1, 2, 3, 4] },
  { slug: "ground-controller", id: "boss_078", name: "Ground Controller", phases: [1, 2, 3, 4] }
];

function readBoss(slug) {
  return JSON.parse(fs.readFileSync(path.join(bossDir, `${slug}.json`), "utf8"));
}

test("all eleven target cards are unique, preserve display names, and keep four real mechanics", () => {
  const slugs = index.bosses.map((boss) => boss.slug);
  const ids = index.bosses.map((boss) => boss.boss_id).filter(Boolean);
  assert.equal(new Set(slugs).size, slugs.length, "FCE index must not contain duplicate slugs");
  assert.equal(new Set(ids.map((id) => id.toLowerCase())).size, ids.length, "FCE index must not contain duplicate boss IDs");

  for (const target of targets) {
    const manifestEntry = index.bosses.find((boss) => boss.slug === target.slug);
    assert(manifestEntry, `${target.name} must be present in the FCE index`);
    assert.equal(manifestEntry.boss_id, target.id);
    assert.equal(manifestEntry.name, target.name);
    assert.equal(manifestEntry.mechanics_count, 4);

    const card = readBoss(target.slug);
    assert.equal(card.en.name, target.name);
    assert.equal(card.en.mechanics.length, 4);
    assert.equal(card.ru.mechanics.length, 4);
    assert.deepEqual(card.en.mechanics.map((mechanic) => Number(mechanic.index)), target.phases);
    assert.deepEqual(card.ru.mechanics.map((mechanic) => Number(mechanic.index)), target.phases);
  }

  assert(slugs.includes("franken"), "existing Franken card must remain");
  assert(slugs.includes("barbarossa"), "existing Barbarossa card must remain");
  assert.equal(index.bosses.length, 37);
});

test("target card texts and phase keys match authoritative generated EN/RU localization", () => {
  for (const target of targets) {
    const card = readBoss(target.slug);
    for (const language of ["en", "ru"]) {
      const source = language === "ru" ? filteredRu : filteredEn;
      for (const mechanic of card[language].mechanics) {
        assert.equal(mechanic.html, source[mechanic.key], `${target.name} ${language} ${mechanic.key} must match source`);
      }
    }
  }
});

test("curated target order remains column-major in the existing three-row switcher", () => {
  const orderedTargets = index.bosses.slice(-11).map((boss) => boss.name);
  assert.deepEqual(orderedTargets, targets.map((target) => target.name));

  const rows = Array.from({ length: 3 }, () => []);
  orderedTargets.forEach((name, indexValue) => rows[indexValue % 3].push(name));
  assert.deepEqual(rows, [
    ["Zhuyan", "Nanto", "Scorpion", "Robarg"],
    ["Habaka", "Chiron", "Defender", "Ground Controller"],
    ["Fei Lian", "Eva", "Black Crow"]
  ]);

  const frontend = fs.readFileSync(path.join(fceRoot, "js", "datamine-fce.js"), "utf8");
  assert(frontend.includes("rows[index % safeRowCount].push(item)"), "switcher must retain column-major distribution");
});

test("target art mappings resolve and switcher dot remains selection-only", () => {
  for (const target of targets) {
    const card = readBoss(target.slug);
    const artPath = path.resolve(fceRoot, card.art.replace(/^\.\//, ""));
    assert(fs.existsSync(artPath), `${target.name} mapped art must exist`);
  }

  const css = fs.readFileSync(path.join(fceRoot, "styles", "datamine-fce.css"), "utf8");
  assert(css.includes(".fce-chip.is-active .fce-chip__dot"));
  assert(!css.includes("mechanics_count"), "dot color must not be hardcoded from mechanics count");
});

test("card selection and EN/RU rendering continue through the shared frontend contract", () => {
  const frontend = fs.readFileSync(path.join(fceRoot, "js", "datamine-fce.js"), "utf8");
  assert(frontend.includes('data-boss-chip="${escapeHtml(boss.slug)}"'));
  assert(frontend.includes("state.selectedSlug = slug"));
  assert(frontend.includes("const localized = boss[lang] || boss.en || {}"));
  assert(frontend.includes('const lang = state.language === "ru" ? "ru" : "en"'));
});
