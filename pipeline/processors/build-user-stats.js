const fs = require("fs");
const path = require("path");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function resolveProjectRoot() {
  const customArg = process.argv.find((arg) => arg.startsWith("--project-root="));
  if (customArg) return path.resolve(customArg.slice("--project-root=".length));
  let cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, "package.json"))) {
      return cur;
    }
    cur = path.resolve(cur, "..");
  }
  return path.resolve(__dirname, "../..");
}

function resolveRawDir(projectRoot) {
  const customArg = process.argv.find((arg) => arg.startsWith("--raw-dir="));
  if (customArg) {
    return path.resolve(customArg.split("=")[1]);
  }

  const candidateDirs = [
    path.join(projectRoot, "datamine-pipeline", "raw_exports"),
    path.join(projectRoot, "raw_exports"),
    path.join(projectRoot, "temperary")
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.join(projectRoot, "raw_exports");
}

function findFile(rawDir, projectRoot, relPathCandidates) {
  for (const rel of relPathCandidates) {
    const p1 = path.join(rawDir, rel);
    if (fs.existsSync(p1)) return p1;
    const pFlat = path.join(rawDir, path.basename(rel));
    if (fs.existsSync(pFlat)) return pFlat;
  }
  return null;
}

function cleanHtmlTags(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

function normalizeIsoDate(value) {
  if (!value) return "";
  const datePart = String(value).split(" ")[0].replace(/\//g, "-");
  const parts = datePart.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return datePart;
}

const COMMON_BUFF_FALLBACKS = {
  War_ImmuneEverything_Level1: {
    en: "Invulnerability Phase",
    ru: "Фаза неуязвимости",
    descEn: "Periodically gains total immunity to all damage.",
    descRu: "Периодически получает полный иммунитет к урону.",
    icon: "buff_cubeshield_001.png"
  },
  War_ResonanceDamBeUp_Level1: {
    en: "Resonance Vulnerability",
    ru: "Уязвимость к резонансу",
    descEn: "Takes significantly increased damage from elemental resonance.",
    descRu: "Получает увеличенный урон от стихийного резонанса.",
    icon: "buff_Blend_001.png"
  },
  War_MonCreateBlackHole_Level1: {
    en: "Black Hole",
    ru: "Черная дыра",
    descEn: "Periodically opens a gravitational black hole pulling nearby players.",
    descRu: "Периодически притягивает игроков в черную дыру.",
    icon: "buff_cubeshield_001.png"
  },
  Buff_War_MonHalo: {
    en: "Combat Halo",
    ru: "Боевой ореол",
    descEn: "Emits a combat halo boosting surrounding monsters.",
    descRu: "Излучает боевой ореол, усиливающий монстров рядом.",
    icon: "buff_chongdong_player_015.png"
  },
  War_MonHalo: {
    en: "Combat Halo",
    ru: "Боевой ореол",
    descEn: "Emits a combat halo boosting surrounding monsters.",
    descRu: "Излучает боевой ореол, усиливающий монстров рядом.",
    icon: "buff_chongdong_player_015.png"
  },
  War_RecoveryHp_Level1: {
    en: "Courageous Heart I",
    ru: "Отважное сердце I",
    descEn: "Recover 1.2% HP every second.",
    descRu: "Восстанавливает 1,2% ОЗ каждую секунду.",
    icon: "buff_assisatnt.png"
  }
};

function processUserOowStats(rawDir, projectRoot) {
  console.log(`\n[user-oow-stats] Processing Origin of War (OOW) stats from: ${rawDir}`);

  const gameResDir = path.join(projectRoot, "datamine-pipeline", "Tower-of-fantasy-game-resources");
  const buffsAssetDir = path.join(projectRoot, "datamine", "oow", "assets", "buffs");

  if (!fs.existsSync(buffsAssetDir)) {
    fs.mkdirSync(buffsAssetDir, { recursive: true });
  }

  const monsterFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/DT_MonsterStaticData_Overseas.json",
    "Hotta/Content/Resources/CoreBlueprints/DataTable/DT_MonsterStaticData.json",
    "DT_MonsterStaticData_Overseas.json",
    "DT_MonsterStaticData.json"
  ]);

  const roundConfigFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarRoundConfigDataTable_Overseas.json",
    "Hotta/Content/Resources/CoreBlueprints/DataTable/Dungeon/OriginWarRoundConfigDataTable.json",
    "OriginWarRoundConfigDataTable_Overseas.json",
    "OriginWarRoundConfigDataTable.json"
  ]);

  const seasonConfigFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarSeasonConfigDataTable_Overseas.json",
    "Hotta/Content/Resources/CoreBlueprints/DataTable/Dungeon/OriginWarSeasonConfigDataTable.json",
    "OriginWarSeasonConfigDataTable_Overseas.json",
    "OriginWarSeasonConfigDataTable.json"
  ]);

  const poolConfigFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarMonsterPoolDataTable_Overseas.json",
    "Hotta/Content/Resources/CoreBlueprints/DataTable/Dungeon/OriginWarMonsterPoolDataTable.json",
    "OriginWarMonsterPoolDataTable_Overseas.json",
    "OriginWarMonsterPoolDataTable.json"
  ]);

  if (!monsterFile || !seasonConfigFile || !roundConfigFile || !poolConfigFile) {
    throw new Error(
      `[required] Standard OOW inputs incomplete (season=${Boolean(seasonConfigFile)}, round=${Boolean(roundConfigFile)}, pool=${Boolean(poolConfigFile)}, monster=${Boolean(monsterFile)}); no output was changed.`
    );
  }

  const t1 = findFile(rawDir, projectRoot, ["Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Extra/GameplayEffectTipsDataTable_Overseas.json"]);
  const t2 = findFile(rawDir, projectRoot, ["Hotta/Content/Resources/CoreBlueprints/DataTable/GameplayEffectTipsDataTable.json"]);
  const enLocFile = findFile(rawDir, projectRoot, ["Hotta/Content/Localization/Game/en/Game.json"]);
  const ruLocFile = findFile(rawDir, projectRoot, ["Hotta/Content/Localization/Game/ru/Game.json"]);

  const enLoc = (enLocFile && readJsonFile(enLocFile)) || {};
  const ruLoc = (ruLocFile && readJsonFile(ruLocFile)) || {};
  // Boss id -> name lookup now comes from the lightweight per-boss manifest.
  const fceIndex =
    readJsonFile(path.join(projectRoot, "datamine/fce/data/fce-index.json")) ||
    { bosses: [] };

  const d1 = (t1 && readJsonFile(t1)) || {};
  const d2 = (t2 && readJsonFile(t2)) || {};
  const rows1 = Array.isArray(d1) ? (d1[0]?.Rows || d1.Rows) : (d1.Rows || d1);
  const rows2 = Array.isArray(d2) ? (d2[0]?.Rows || d2.Rows) : (d2.Rows || d2);
  const effectRows = Object.assign({}, rows2, rows1);

  const fceBossByNum = new Map();
  if (Array.isArray(fceIndex.bosses)) {
    for (const b of fceIndex.bosses) {
      const idMatch = String(b.boss_id || "").match(/boss(?:_hum)?_?0*(\d+)/i);
      const id = b.boss_num != null ? Number(b.boss_num) : (idMatch ? Number(idMatch[1]) : null);
      if (!Number.isFinite(id)) continue;
      fceBossByNum.set(id, {
        slug: b.slug,
        bossId: b.boss_id || `Boss_#${String(id).padStart(3, "0")}`,
        nameEn: b.name || `Boss #${id}`,
        nameRu: b.name_ru || b.name || `Boss #${id}`,
        art: b.art || `../fce/assets/bosses/${b.slug}.png`
      });
    }
  }

  const unregBossFile = path.join(projectRoot, "datamine/fce/data/fce-unregistered-bosses.json");
  const unregBossData = readJsonFile(unregBossFile);
  if (unregBossData && Array.isArray(unregBossData.unregisteredBosses)) {
    for (const ub of unregBossData.unregisteredBosses) {
      const id = ub.bossNum != null ? Number(ub.bossNum) : null;
      if (id != null && !fceBossByNum.has(id)) {
        fceBossByNum.set(id, {
          slug: ub.bossId || `boss_${id}`,
          bossId: ub.bossId || `Boss_#${String(id).padStart(3, "0")}`,
          nameEn: ub.nameHint || `Boss #${id}`,
          nameRu: ub.nameHint || `Boss #${id}`,
          art: null
        });
      }
    }
  }

  const nonFceBossFallbacks = {
    6: { en: "Robarg", ru: "Робарг" },
    18: { en: "Habaka", ru: "Хабака" },
    24: { en: "Lucia", ru: "Люция" },
    38: { en: "Kelvin", ru: "Кельвин" },
    55: { en: "Taotie", ru: "Таоте" },
    58: { en: "Forlorn Minister", ru: "Одинокий Министр" },
    59: { en: "Zhilong", ru: "Чжулун" }
  };

  const mappingPath = [
    path.join(__dirname, "monster-image-mapping.json"),
    path.join(__dirname, "..", "..", "scripts", "monster-image-mapping.json")
  ].find((candidate) => fs.existsSync(candidate));
  const monsterImageMapping = fs.existsSync(mappingPath) ? JSON.parse(fs.readFileSync(mappingPath, "utf8")) : {};

  function extractBossNumber(str) {
    if (!str) return null;
    const match = String(str).match(/boss(?:_hum)?_?#?0*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  function resolveMobImages(classPath) {
    if (!classPath) return { image: null, blueprint: null };
    const base = path.basename(classPath).split(".")[0].replace("OriginWar_", "").replace("_C", "");
    const isBoss = /boss_/i.test(base) || /boss_/i.test(classPath);

    if (isBoss) {
      if (monsterImageMapping[classPath]) {
        const mapped = monsterImageMapping[classPath];
        return typeof mapped === "string" ? { image: mapped, blueprint: null } : mapped;
      }
      const bNum = extractBossNumber(classPath || base);
      const fceHit = bNum != null && Array.isArray(fceIndex.bosses) ? fceIndex.bosses.find((b) => Number(b.boss_num) === bNum || extractBossNumber(b.boss_id || b.slug) === bNum) : null;
      if (fceHit && fceHit.slug) {
        return { image: `../fce/assets/bosses/${fceHit.slug}.png`, blueprint: null };
      }
      return { image: "assets/monsters/placeholder_boss.png", blueprint: null };
    }

    const numMatch = base.match(/(\d{3})/);
    const num = numMatch ? numMatch[1] : null;

    const candidates = [
      base,
      classPath,
      num ? `mon_hum_${num}` : null,
      num ? `elite_${num}` : null,
      num ? `elite_hum_${num}` : null
    ].filter(Boolean);

    for (const c of candidates) {
      if (monsterImageMapping[c]) {
        const mapped = monsterImageMapping[c];
        return typeof mapped === "string" ? { image: mapped, blueprint: null } : mapped;
      }
    }

    const isElite = /elite/i.test(base);
    return { image: isElite ? "assets/monsters/placeholder_elite.png" : "assets/monsters/placeholder_creep.png", blueprint: null };
  }

  function cleanMobName(rawName) {
    if (!rawName) return "Enemy";
    let name = rawName.replace(/^OriginWar_/, "").replace(/_C$/, "");

    if (!/^(elite|mon|boss)_/i.test(name) && !/^\d{3}_/i.test(name) && !/^Elite #\d+_/i.test(name) && !/^Monster #\d+_/i.test(name)) {
      return name;
    }

    const numMatch = name.match(/(\d{3})/);
    const num = numMatch ? numMatch[1] : null;
    const isBoss = /boss/i.test(name);
    const prefix = isBoss ? `Boss #${num || ""}` : `Elite #${num || ""}`;

    let suffix = "";
    if (/blackhole/i.test(name)) suffix = " (Black Hole)";
    else if (/bullet_time/i.test(name)) suffix = " (Bullet Time)";
    else if (/counter/i.test(name)) suffix = " (Counter)";
    else if (/jump/i.test(name)) suffix = " (Jump)";
    else if (/xuomo|xuemo/i.test(name)) suffix = " (Bleed)";
    else if (/bestone/i.test(name)) suffix = " (Stone)";
    else if (/clone/i.test(name)) suffix = " (Clone)";
    else if (/kill/i.test(name)) suffix = " (Kill)";
    else if (/captain/i.test(name)) suffix = " (Captain)";
    else if (/chief/i.test(name)) suffix = " (Chief)";

    if (num) {
      return `${prefix.trim()}${suffix}`;
    }
    return name;
  }

  function resolveMobInfo(classPath) {
    if (!classPath) return { nameEn: "Enemy", nameRu: "Враг", bossId: null, image: null, blueprint: null };
    const base = path.basename(classPath).split(".")[0].replace("OriginWar_", "").replace("_C", "");
    const isBoss = /boss_/i.test(base) || /boss_/i.test(classPath);
    const bNum = extractBossNumber(classPath || base);
    const { image, blueprint } = resolveMobImages(classPath);

    if (isBoss && bNum != null && fceBossByNum.has(bNum)) {
      const fb = fceBossByNum.get(bNum);
      return {
        nameEn: fb.nameEn,
        nameRu: fb.nameRu,
        codeName: base,
        bossId: fb.bossId || `Boss_#${String(bNum).padStart(3, "0")}`,
        image: fb.slug ? `../fce/assets/bosses/${fb.slug}.png` : image,
        blueprint
      };
    }

    if (isBoss && bNum != null && nonFceBossFallbacks[bNum]) {
      const fb = nonFceBossFallbacks[bNum];
      return {
        nameEn: fb.en,
        nameRu: fb.ru,
        codeName: base,
        bossId: `Boss_#${String(bNum).padStart(3, "0")}`,
        image,
        blueprint
      };
    }

    const locCandidates = [
      `${base}_name`,
      `${base.toLowerCase()}_name`,
      `${base.replace('_EX', '')}_name`,
      bNum ? `mon_hum_${String(bNum).padStart(3, "0")}_name` : null,
      bNum ? `Boss_hum_${String(bNum).padStart(3, "0")}_name` : null,
      bNum ? `Boss_${String(bNum).padStart(3, "0")}_name` : null
    ].filter(Boolean);

    for (const c of locCandidates) {
      if (enLoc[c]) {
        return {
          nameEn: enLoc[c],
          nameRu: ruLoc[c] || enLoc[c],
          codeName: base,
          bossId: isBoss && bNum ? `Boss_#${String(bNum).padStart(3, "0")}` : null,
          image,
          blueprint
        };
      }
    }

    let clean = cleanMobName(base);
    return { nameEn: clean, nameRu: clean, codeName: base, bossId: isBoss && bNum ? `Boss_#${String(bNum).padStart(3, "0")}` : null, image, blueprint };
  }

  function resolveBuffFullIntel(rawBuffName) {
    if (!rawBuffName) return { id: "", nameEn: "", nameRu: "", descEn: "", descRu: "", icon: null };
    const cleanId = rawBuffName.replace(/\.buff_.*_C$/, "").replace(/\.Buff_.*_C$/, "").replace(/\..*$/, "").replace(/_C$/, "");

    let found = effectRows[cleanId] || effectRows[cleanId.replace(/^buff_/, "Buff_")] || effectRows[cleanId.replace(/^Buff_/, "buff_")];
    if (!found) {
      const matchKey = Object.keys(effectRows).find((k) => k.toLowerCase() === cleanId.toLowerCase());
      if (matchKey) found = effectRows[matchKey];
    }

    let iconPath = null;
    const iconAsset = found?.Icon?.AssetPathName || found?.IconPath;
    if (iconAsset && iconAsset !== "None") {
      const cleanRel = iconAsset.replace("/Game/Resources/", "").split(".")[0] + ".png";
      const diskPath = path.join(gameResDir, cleanRel);
      const iconBase = path.basename(cleanRel);
      const destPath = path.join(buffsAssetDir, iconBase);
      if (fs.existsSync(destPath)) {
        iconPath = `assets/buffs/${iconBase}`;
      } else if (fs.existsSync(diskPath)) {
        try {
          fs.copyFileSync(diskPath, destPath);
          iconPath = `assets/buffs/${iconBase}`;
        } catch (e) {}
      }
    }

    const fallback = COMMON_BUFF_FALLBACKS[cleanId] || COMMON_BUFF_FALLBACKS[cleanId.replace(/^buff_/, "Buff_")] || COMMON_BUFF_FALLBACKS[cleanId.replace(/^Buff_/, "buff_")];
    if (!iconPath && fallback && fallback.icon) {
      iconPath = `assets/buffs/${fallback.icon}`;
    }

    const namespaces = ["Voidbuffdes", "BuffDes", "Voidbuffdes_balance", "ST_VoidClone"];
    let nameEn = "";
    let nameRu = "";
    let descEn = "";
    let descRu = "";

    const nameKeyCandidates = [
      `${cleanId}_name`,
      `${cleanId.replace(/^buff_/, 'Buff_')}_name`,
      `${cleanId.replace(/^Buff_/, 'buff_')}_name`,
      found?.Name?.Key,
      found?.Description?.Key
    ].filter(Boolean);

    const descKeyCandidates = [
      `${cleanId}_des`,
      `${cleanId}_desc`,
      `${cleanId.replace(/^buff_/, 'Buff_')}_des`,
      `${cleanId.replace(/^Buff_/, 'buff_')}_des`,
      found?.Description?.Key
    ].filter(Boolean);

    for (const ns of namespaces) {
      if (!nameEn) {
        for (const nk of nameKeyCandidates) {
          if (enLoc[ns] && enLoc[ns][nk]) {
            nameEn = cleanHtmlTags(enLoc[ns][nk]);
            nameRu = cleanHtmlTags(ruLoc[ns]?.[nk] || enLoc[ns][nk]);
            break;
          }
        }
      }
      if (!descEn) {
        for (const dk of descKeyCandidates) {
          if (enLoc[ns] && enLoc[ns][dk]) {
            descEn = cleanHtmlTags(enLoc[ns][dk]);
            descRu = cleanHtmlTags(ruLoc[ns]?.[dk] || enLoc[ns][dk]);
            break;
          }
        }
      }
    }

    if (fallback) {
      if (!nameEn) nameEn = fallback.en;
      if (!nameRu) nameRu = fallback.ru;
      if (!descEn) descEn = fallback.descEn;
      if (!descRu) descRu = fallback.descRu;
    }

    if (!nameEn) {
      nameEn = cleanHtmlTags(found?.Name?.LocalizedString || cleanId.replace(/^buff_/, "").replace(/^Buff_/, ""));
      nameRu = cleanHtmlTags(ruLoc[cleanId] || nameEn);
    }
    if (!descEn && found?.Description?.LocalizedString) {
      descEn = cleanHtmlTags(found.Description.LocalizedString);
      descRu = cleanHtmlTags(ruLoc[found.Description.Key] || descEn);
    }

    return {
      id: cleanId,
      nameEn: nameEn || cleanId,
      nameRu: nameRu || nameEn || cleanId,
      descEn: descEn || nameEn,
      descRu: descRu || nameRu || descEn,
      icon: iconPath
    };
  }

  const curvesOverseasFile = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarMonster_Overseas.json");
  const curvesBaseFile = path.join(rawDir, "Hotta/Content/Resources/Abilities/DataTables/OriginWarMonster.json");
  const curvesBalanceFile = path.join(rawDir, "Hotta/Content/Resources/CoreBlueprints/DataTable_Balance/EffectFigure/OriginWarMonster_Balance.json");

  const rawCurvesOver = (fs.existsSync(curvesOverseasFile) && readJsonFile(curvesOverseasFile)) || {};
  const rawCurvesBase = (fs.existsSync(curvesBaseFile) && readJsonFile(curvesBaseFile)) || {};
  const rawCurvesBal = (fs.existsSync(curvesBalanceFile) && readJsonFile(curvesBalanceFile)) || {};

  const curvesOverseas = rawCurvesOver[0]?.Rows || rawCurvesOver.Rows || rawCurvesOver;
  const curvesBase = rawCurvesBase[0]?.Rows || rawCurvesBase.Rows || rawCurvesBase;
  const curvesBalance = rawCurvesBal[0]?.Rows || rawCurvesBal.Rows || rawCurvesBal;

  function parseCurveSteps(curveObj, unlockDay = 1) {
    const uDay = Math.max(1, unlockDay || 1);
    if (!curveObj || !Array.isArray(curveObj.Keys) || curveObj.Keys.length === 0) {
      return {
        initialPct: 100,
        finalPct: 100,
        daysToMin: 1,
        unlockDay: uDay,
        steps: [{ startDay: 1, endDay: 90, durationDays: 90, pct: 100, multiplier: 1 }]
      };
    }

    const rawKeys = curveObj.Keys;
    const initialPct = rawKeys[0].Value;
    const finalPct = rawKeys[rawKeys.length - 1].Value;

    const steps = [];
    for (let i = 0; i < rawKeys.length; i++) {
      const cur = rawKeys[i];
      const startDay = cur.Time;

      let next = rawKeys[i + 1];
      let endDay = next ? next.Time - 1 : 90;
      if (endDay < startDay) endDay = startDay;

      if (next && next.Value === cur.Value) {
        endDay = next.Time;
        const nextNext = rawKeys[i + 2];
        if (nextNext) endDay = nextNext.Time - 1;
        i++;
      }

      const durationDays = Math.max(1, endDay - startDay + 1);
      steps.push({
        startDay,
        endDay,
        durationDays,
        pct: cur.Value,
        multiplier: Number((cur.Value / 100).toFixed(2))
      });
    }

    const minKey = rawKeys.find((k) => k.Value === finalPct);
    const daysToMin = minKey ? minKey.Time : 1;

    return {
      initialPct,
      finalPct,
      daysToMin,
      unlockDay: uDay,
      steps
    };
  }

  if (!monsterFile) {
    throw new Error(`[required] DT_MonsterStaticData file not found in ${rawDir}.`);
  }

  console.log(`[user-oow-stats] Reading Monster Data from: ${monsterFile}`);
  const mData = readJsonFile(monsterFile);
  const monsterRows = Object.assign(
    {},
    Array.isArray(mData) ? (mData[0]?.Rows || mData.Rows) : (mData.Rows || mData)
  );

  const poolRows = (poolConfigFile && readJsonFile(poolConfigFile)) || {};
  const poolData = Array.isArray(poolRows) ? (poolRows[0]?.Rows || poolRows.Rows) : (poolRows.Rows || poolRows);

  const seasonsOutput = [];
  const rawCreepsList = [];
  let seasonDatesMap = {};

  if (roundConfigFile && seasonConfigFile) {
    console.log(`[user-oow-stats] Using in-game config tables:`);
    console.log(`  -> Rounds:  ${roundConfigFile}`);
    console.log(`  -> Seasons: ${seasonConfigFile}`);

    const rData = readJsonFile(roundConfigFile);
    const roundRows = Array.isArray(rData) ? (rData[0]?.Rows || rData.Rows) : (rData.Rows || rData);

    const sData = readJsonFile(seasonConfigFile);
    const seasonRows = Array.isArray(sData) ? (sData[0]?.Rows || sData.Rows) : (sData.Rows || sData);

    for (const [sKey, sRow] of Object.entries(seasonRows)) {
      const sNum = parseInt(sKey, 10);
      if (isNaN(sNum)) continue;

      const startDate = normalizeIsoDate(sRow.SeasonBeginTime);
      const endDate = normalizeIsoDate(sRow.SeasonEndTime);
      seasonDatesMap[String(sNum)] = { startDate, endDate };

      const floorList = [];

      for (let round = 1; round <= 30; round++) {
        const rRow = Object.values(roundRows).find(
          (r) => (r.OriginSeasonID == sNum || r.Season == sNum) && (r.OriginRound == round || r.Round == round)
        );
        if (!rRow) continue;

        const stageMutators = (rRow.ShowBuffs || []).map((b) => {
          const rawName = b.AssetPathName?.split(".").pop() || "";
          return resolveBuffFullIntel(rawName);
        });

        const dropBuffs = (rRow.DropBuffs || []).map((d) => {
          const buffIntel = resolveBuffFullIntel(d.BuffPoolID);
          return {
            ...buffIntel,
            weight: d.DropWight
          };
        });

        const enemies = [];
        let totalHp = 0;
        let maxHp = 0;

        for (let waveIdx = 0; waveIdx < (rRow.WaveMonsterPool || []).length; waveIdx++) {
          const poolKey = rRow.WaveMonsterPool[waveIdx];
          const pData = poolData ? (poolData[poolKey] || poolData[poolKey.toLowerCase()] || poolData[poolKey.toUpperCase()] || poolData['S' + poolKey.slice(1)] || poolData['s' + poolKey.slice(1)]) : null;

          if (pData && pData.PoolMonsters) {
            pData.PoolMonsters.forEach((m, mobSubIdx) => {
              const mobInfo = resolveMobInfo(m.MonsterClass?.AssetPathName);
              const attr = monsterRows[m.AttributeID] || monsterRows[m.AttributeID?.toLowerCase()] || monsterRows[m.AttributeID?.toUpperCase()] || monsterRows['s' + m.AttributeID?.slice(1)] || monsterRows['S' + m.AttributeID?.slice(1)] || {};
              let singleHp = attr.MaxHealth || 0;
              // Starting from Season 14 (patch 3.8/4.0 Global balance normalization), multiply base stats by 100 to reflect actual scaled gameplay values
              if (sNum >= 14) {
                singleHp = singleHp * 100;
              }
              const combinedHp = singleHp * (m.MonsterCount || 1);

              if (singleHp > 0) {
                totalHp += combinedHp;
                if (singleHp > maxHp) maxHp = singleHp;

                const inherentBuffs = (m.MonsterBuffID || []).map((b) => {
                  const rawName = b.AssetPathName?.split(".").pop() || "";
                  return resolveBuffFullIntel(rawName);
                });

                const enemyObj = {
                  wave: waveIdx + 1,
                  mob: mobSubIdx + 1,
                  key: m.AttributeID,
                  nameEn: mobInfo.nameEn,
                  nameRu: mobInfo.nameRu,
                  codeName: mobInfo.codeName || null,
                  bossId: mobInfo.bossId,
                  monsterType: m.MonsterType || "BS_MONSTER_NORMAL",
                  count: m.MonsterCount || 1,
                  level: m.MonsterLevel || 100,
                  hp: singleHp,
                  combinedHp,
                  hpFormatted: singleHp.toLocaleString("en-US"),
                  hpBillions: Number((singleHp / 1e9).toFixed(3)),
                  hpMillions: Number((singleHp / 1e6).toFixed(2)),
                  atk: attr.CommonAtkBase || 0,
                  def: attr.PhyDefBase || 0,
                  image: mobInfo.image,
                  blueprint: mobInfo.blueprint,
                  stats: attr,
                  inherentBuffs
                };

                enemies.push(enemyObj);
                rawCreepsList.push({
                  season: sNum,
                  floor: round,
                  ...enemyObj
                });
              }
            });
          }
        }

        if (enemies.length > 0) {
          const preferredKey = sNum === 2 ? `2_${round}` : `1_${round}`;
          const curveObj = curvesOverseas[preferredKey] || curvesOverseas[rRow.MonsterStrength?.RowName] || curvesBase[preferredKey] || curvesBase[rRow.MonsterStrength?.RowName];
          const unlockDay = sNum >= 21 ? round : 1;
          const difficultySchedule = parseCurveSteps(curveObj, unlockDay);

          floorList.push({
            floor: round,
            unlockDay,
            mobCount: enemies.reduce((sum, e) => sum + (e.count || 1), 0),
            totalHp,
            totalHpBillions: Number((totalHp / 1e9).toFixed(3)),
            totalHpMillions: Number((totalHp / 1e6).toFixed(2)),
            maxHp,
            maxHpBillions: Number((maxHp / 1e9).toFixed(3)),
            maxHpMillions: Number((maxHp / 1e6).toFixed(2)),
            rewardDropId: rRow.RoundAwardId?.[0]?.Value || "",
            helpPoints: rRow.RoundHelpPoint || 0,
            stageMutators,
            dropBuffs,
            difficultySchedule,
            enemies
          });
        }
      }

      if (floorList.length > 0) {
        const totalSeasonHp = floorList.reduce((sum, f) => sum + f.totalHp, 0);
        const maxSeasonDiff = Math.max(...floorList.map((fl) => fl.difficultySchedule?.initialPct || 100));
        const curveProfile =
          maxSeasonDiff === 1500
            ? "1500% Global Rebalance"
            : maxSeasonDiff === 2100
            ? "2100% S3 Extended"
            : maxSeasonDiff > 2100
            ? `${maxSeasonDiff}% Extreme`
            : "2000% Standard Global";

        seasonsOutput.push({
          season: sNum,
          title: `Season ${sNum}`,
          startDate,
          endDate,
          floorCount: floorList.length,
          minFloor: floorList[0]?.floor || 1,
          maxFloor: floorList[floorList.length - 1]?.floor || floorList.length,
          totalSeasonHp,
          totalSeasonHpBillions: Number((totalSeasonHp / 1e9).toFixed(2)),
          finalBossHp: floorList[floorList.length - 1]?.maxHp || 0,
          maxDifficulty: maxSeasonDiff,
          curveProfile,
          difficultySummary: {
            maxDifficulty: maxSeasonDiff,
            curveProfile,
            floors: floorList.map((fl) => ({
              floor: fl.floor,
              unlockDay: fl.unlockDay || 1,
              initialPct: fl.difficultySchedule?.initialPct || 100,
              daysToMin: fl.difficultySchedule?.daysToMin || 1,
              stepsCount: fl.difficultySchedule?.steps?.length || 1,
              steps: fl.difficultySchedule?.steps || []
            }))
          },
          floors: floorList
        });
      }
    }
  }

  seasonsOutput.sort((a, b) => a.season - b.season);

  const oowDir = path.join(projectRoot, "datamine", "oow", "data");
  if (!fs.existsSync(oowDir)) fs.mkdirSync(oowDir, { recursive: true });

  const statsPayload = JSON.stringify(
    {
      meta: {
        updatedAt: new Date().toISOString(),
        totalEntries: rawCreepsList.length,
        totalSeasons: seasonsOutput.length,
        sourceMonsterFile: path.basename(monsterFile),
        hasRoundConfig: Boolean(roundConfigFile),
        hasSeasonConfig: Boolean(seasonConfigFile),
        hasPoolConfig: Boolean(poolConfigFile)
      },
      seasons: seasonsOutput
    },
    null,
    2
  );

  if (seasonsOutput.length === 0) {
    throw new Error("[required] Origin of War produced zero seasons; refusing to overwrite or publish stale output.");
  }

  // 1. Authoritative season dates generated directly from in-game config
  fs.writeFileSync(path.join(oowDir, "season_dates.json"), `${JSON.stringify(seasonDatesMap, null, 2)}\n`, "utf8");

  // 2. Authoritative buff catalog generated directly from game effect tips and floors
  const buffCatalogMap = {};
  for (const effectKey of Object.keys(effectRows)) {
    const intel = resolveBuffFullIntel(effectKey);
    if (intel && intel.id) {
      buffCatalogMap[intel.id] = intel;
    }
  }
  for (const s of seasonsOutput) {
    for (const fl of s.floors || []) {
      for (const b of fl.stageMutators || []) {
        if (b && b.id && !buffCatalogMap[b.id]) buffCatalogMap[b.id] = b;
      }
      for (const b of fl.dropBuffs || []) {
        if (b && b.id && !buffCatalogMap[b.id]) buffCatalogMap[b.id] = b;
      }
      for (const m of fl.enemies || []) {
        for (const b of m.inherentBuffs || []) {
          if (b && b.id && !buffCatalogMap[b.id]) buffCatalogMap[b.id] = b;
        }
      }
    }
  }
  fs.writeFileSync(path.join(oowDir, "oow_buffs_catalog.json"), `${JSON.stringify(buffCatalogMap, null, 2)}\n`, "utf8");

  // Build both required modes before touching either existing output.
  const mmoResult = processMmoOowStats(rawDir, projectRoot, oowDir, monsterRows, enLoc, ruLoc);
  fs.writeFileSync(path.join(oowDir, "oow_stats.json"), statsPayload, "utf8");
  fs.writeFileSync(path.join(oowDir, "oow_mmo_stats.json"), mmoResult.payload, "utf8");
  console.log(`[user-oow-stats] Successfully built ${seasonsOutput.length} standard and ${mmoResult.seasonsCount} MMO seasons.`);

  return {
    seasonsCount: seasonsOutput.length,
    creepsCount: rawCreepsList.length
  };
}

function processMmoOowStats(rawDir, projectRoot, oowDir, standardMonsterRows = {}, enLoc = {}, ruLoc = {}) {
  const seasonMmoFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarSeasonConfigDataTable_MMO.json",
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarSeasonConfigDataTable_MMO.json"
  ]);
  const roundMmoFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarRoundConfigDataTable_MMO.json",
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarRoundConfigDataTable_MMO.json"
  ]);
  const poolMmoFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarMonsterPoolDataTable_MMO.json",
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable_MMO/OriginWar/OriginWarMonsterPoolDataTable_MMO.json"
  ]);
  const monsterMmoFile = findFile(rawDir, projectRoot, [
    "Hotta/Content/Resources/CoreBlueprints/DataTable_MMO/DT_MonsterStaticData_MMO.json",
    "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable_MMO/DT_MonsterStaticData_MMO.json"
  ]);

  if (!seasonMmoFile || !roundMmoFile || !poolMmoFile || !monsterMmoFile) {
    throw new Error(`[required] MMO OOW inputs incomplete (season=${Boolean(seasonMmoFile)}, round=${Boolean(roundMmoFile)}, pool=${Boolean(poolMmoFile)}, monster=${Boolean(monsterMmoFile)}); no output was changed.`);
  }

  const rawSeasons = readJsonFile(seasonMmoFile) || {};
  const rawRounds = readJsonFile(roundMmoFile) || {};
  const rawPools = readJsonFile(poolMmoFile) || {};
  const rawMonstersMmo = monsterMmoFile ? (readJsonFile(monsterMmoFile) || {}) : {};

  const sRows = rawSeasons[0]?.Rows || rawSeasons.Rows || rawSeasons;
  const rRows = rawRounds[0]?.Rows || rawRounds.Rows || rawRounds;
  const pRows = rawPools[0]?.Rows || rawPools.Rows || rawPools;
  const mRows = Object.assign({}, standardMonsterRows, rawMonstersMmo[0]?.Rows || rawMonstersMmo.Rows || rawMonstersMmo);

  const curvesBalanceFile = path.join(rawDir, "Hotta/Content/Resources/CoreBlueprints/DataTable_Balance/EffectFigure/OriginWarMonster_Balance.json");
  const rawCurvesBal = (fs.existsSync(curvesBalanceFile) && readJsonFile(curvesBalanceFile)) || {};
  const curvesBalance = rawCurvesBal[0]?.Rows || rawCurvesBal.Rows || rawCurvesBal;

  function parseCurveSteps(curveObj) {
    if (!curveObj || !Array.isArray(curveObj.Keys) || curveObj.Keys.length === 0) {
      return {
        initialPct: 100,
        finalPct: 100,
        daysToMin: 1,
        steps: [{ startDay: 1, endDay: 90, durationDays: 90, pct: 100, multiplier: 1 }]
      };
    }

    const rawKeys = curveObj.Keys;
    const initialPct = rawKeys[0].Value;
    const finalPct = rawKeys[rawKeys.length - 1].Value;

    const steps = [];
    for (let i = 0; i < rawKeys.length; i++) {
      const cur = rawKeys[i];
      const startDay = cur.Time;

      let next = rawKeys[i + 1];
      let endDay = next ? next.Time - 1 : 90;
      if (endDay < startDay) endDay = startDay;

      if (next && next.Value === cur.Value) {
        endDay = next.Time;
        const nextNext = rawKeys[i + 2];
        if (nextNext) endDay = nextNext.Time - 1;
        i++;
      }

      const durationDays = Math.max(1, endDay - startDay + 1);
      steps.push({
        startDay,
        endDay,
        durationDays,
        pct: cur.Value,
        multiplier: Number((cur.Value / 100).toFixed(2))
      });
    }

    const minKey = rawKeys.find((k) => k.Value === finalPct);
    const daysToMin = minKey ? minKey.Time : 1;

    return {
      initialPct,
      finalPct,
      daysToMin,
      steps
    };
  }

  function cleanHtml(s) {
    if (!s) return "";
    return String(s).replace(/<[^>]*>/g, "").trim();
  }

  const WEAKNESS_DESCS = {
    "buff_origin_balance99_1": {
      nameEn: "Flame Weakness",
      nameRu: "Уязвимость к огню",
      descEn: "Monsters take 40% increased Flame damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от огня, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_1th": {
      nameEn: "Flame Weakness",
      nameRu: "Уязвимость к огню",
      descEn: "Monsters take 40% increased Flame damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от огня, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_2": {
      nameEn: "Frost Weakness",
      nameRu: "Уязвимость к холоду",
      descEn: "Monsters take 40% increased Frost damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от холода, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_2th": {
      nameEn: "Frost Weakness",
      nameRu: "Уязвимость к холоду",
      descEn: "Monsters take 40% increased Frost damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от холода, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_3": {
      nameEn: "Volt Weakness",
      nameRu: "Уязвимость к электро",
      descEn: "Monsters take 40% increased Volt damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от электро, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_3th": {
      nameEn: "Volt Weakness",
      nameRu: "Уязвимость к электро",
      descEn: "Monsters take 40% increased Volt damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше урона от электро, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_4": {
      nameEn: "Physical Weakness",
      nameRu: "Уязвимость к физ. урону",
      descEn: "Monsters take 40% increased Physical damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше физического урона, а эффективность пробития щитов повышена на 50%."
    },
    "buff_origin_balance99_4th": {
      nameEn: "Physical Weakness",
      nameRu: "Уязвимость к физ. урону",
      descEn: "Monsters take 40% increased Physical damage, and shatter efficiency is increased by 50%.",
      descRu: "Монстры получают на 40% больше физического урона, а эффективность пробития щитов повышена на 50%."
    }
  };

  const MMO_BUFF_ICONS = {
    // Elemental Boosts
    "buff_origin_balance1_1": "buff_AddFireAtkFoodBase.png",
    "buff_origin_balance1_2": "buff_AddFireAtkFoodBase.png",
    "buff_origin_balance1_3": "buff_AddFireAtkFoodBase.png",
    "buff_origin_balance1_4": "buff_AddIceAtkFoodBase.png",
    "buff_origin_balance1_5": "buff_AddIceAtkFoodBase.png",
    "buff_origin_balance1_6": "buff_AddIceAtkFoodBase.png",
    "buff_origin_balance1_7": "buff_AddThunderAtkFoodBase.png",
    "buff_origin_balance1_8": "buff_AddThunderAtkFoodBase.png",
    "buff_origin_balance1_9": "buff_AddThunderAtkFoodBase.png",
    "buff_origin_balance1_10": "buff_AddPhyAtkFoodBase.png",
    "buff_origin_balance1_11": "buff_AddPhyAtkFoodBase.png",
    "buff_origin_balance1_12": "buff_AddPhyAtkFoodBase.png",

    // Combo & Element Specials
    "buff_origin_balance2_1": "buff_fire_001.png",
    "buff_origin_balance2_2": "buff_ice_001.png",
    "buff_origin_balance2_3": "buff_bigthu_001.png",
    "buff_origin_balance2_4": "buff_normalact_demage_001.png",
    "buff_origin_balance2_5": "buff_frigg_damageup.png", // Icebreaker
    "buff_origin_balance2_6": "buff_WeaponAttack_002.png", // Grievous Tear
    "buff_origin_balance2_7": "buff_bigthu_001.png", // EM Explosion
    "buff_origin_balance2_8": "buff_fire_001.png", // Core Eruption

    // Defensive & HP
    "buff_origin_balance3_1": "buff_AddMaxHP_FoodBase.png", // Powerful Tank 1
    "buff_origin_balance3_2": "buff_AddMaxHP_FoodBase.png", // Powerful Tank 2
    "buff_origin_balance3_3": "buff_AddMaxHP_FoodBase.png",
    "buff_origin_balance3_4": "buff_cubeshield_001.png", // Nothingness
    "buff_origin_balance3_5": "buff_AddMaxHP_FoodBase.png", // Resonance of Life
    "buff_origin_balance3_6": "buff_assisatnt.png",

    // Offense, Crits & Debuffs
    "buff_origin_balance4_1": "buff_elehujia_001.png", // Fortification 1
    "buff_origin_balance4_2": "buff_elehujia_001.png", // Fortification 2
    "buff_origin_balance4_3": "Buff_EMBY_BrokenWeak.png", // Friable 1
    "buff_origin_balance4_4": "Buff_EMBY_BrokenWeak.png", // Friable 2
    "buff_origin_balance4_5": "Buff_WeaponPas_016.png", // Corrosion 1
    "buff_origin_balance4_6": "Buff_WeaponPas_016.png", // Corrosion 2
    "buff_origin_balance4_7": "buff_weakness_001.png", // Vulnerability 1
    "buff_origin_balance4_8": "buff_weakness_001.png", // Vulnerability 2
    "buff_origin_balance4_9": "Buff_Chainsaw_SkillKuangBao.png", // Warmup 1
    "buff_origin_balance4_10": "Buff_Chainsaw_SkillKuangBao.png", // Warmup 2
    "buff_origin_balance4_11": "buff_Chainsaw_LifeShield.png", // Healing Shield 1
    "buff_origin_balance4_12": "buff_Chainsaw_LifeShield.png", // Healing Shield 2
    "buff_origin_balance4_19": "Buff_WeaponPas_022.png", // Judgment 1
    "buff_origin_balance4_20": "Buff_WeaponPas_022.png", // Judgment 2
    "buff_origin_balance4_21": "Buff_WeaponPas_004.png", // Resonance of Blades 1
    "buff_origin_balance4_22": "Buff_WeaponPas_004.png", // Resonance of Blades 2
    "buff_origin_balance4_25": "Buff_EMBY_ReplyHP.png", // Bloodthirsty
    "buff_origin_balance4_29": "buff_kill_shield_001.png", // Emergency Protection

    // Immunities & Disablers
    "buff_origin_balance5_1": "AddIceImm.png", // Anti-Freeze
    "buff_origin_balance5_2": "buff_frigg_icestack.png", // Frozen Beauty
    "buff_origin_balance5_3": "debuff_speed_down.png", // Heavy
    "buff_origin_balance5_6": "Buff_FightRob_KeepReduceHP.png", // Heal Decay
    "buff_origin_balance5_10": "Buff_EMBY_BrokenWeak.png", // Break Defenses

    // Team & Utility
    "buff_origin_balance6_1": "buff_chongdong_player_015.png", // Team Engine 1
    "buff_origin_balance6_2": "buff_chongdong_player_015.png", // Team Engine 2
    "buff_origin_balance6_3": "buff_soldier.png", // Sentinel 1
    "buff_origin_balance6_4": "buff_soldier.png", // Sentinel 2
    "buff_origin_balance6_5": "Buff_WeaponPas_012.png", // Weapon Destruction 1
    "buff_origin_balance6_7": "arm_atk.png", // Strong Fighter 1
    "buff_origin_balance6_9": "arm_atk.png", // Strong Fighter 3
    "buff_origin_balance6_10": "buff_fenrir_critup.png", // Emphatic Striker 1
    "buff_origin_balance6_12": "buff_fenrir_critup.png", // Emphatic Striker 3

    // Stage Auras & Monster Modifiers
    "buff_origin_balance99_9": "buff_ice_001.png", // Freezing Halo
    "buff_origin_balance99_11": "buff_assisatnt.png", // Courageous Heart
    "buff_origin_balance99_17": "buff_damageadd_001.png", // Stronger in Time

    // Elemental Weaknesses (with and without 'th')
    "buff_origin_balance99_1": "weakpoint_fire.png",
    "buff_origin_balance99_2": "weakpoint_ice.png",
    "buff_origin_balance99_3": "weakpoint_thu.png",
    "buff_origin_balance99_4": "weakpoint_physics.png",
    "buff_origin_balance99_1th": "weakpoint_fire.png",
    "buff_origin_balance99_2th": "weakpoint_ice.png",
    "buff_origin_balance99_3th": "weakpoint_thu.png",
    "buff_origin_balance99_4th": "weakpoint_physics.png"
  };

  function getBestIcon(cleanId, nameEn) {
    if (MMO_BUFF_ICONS[cleanId]) {
      return `assets/buffs/${MMO_BUFF_ICONS[cleanId]}`;
    }

    const s = (cleanId + " " + nameEn).toLowerCase();
    if (s.includes("heart") || s.includes("courageous") || s.includes("heal") || s.includes("life") || s.includes("recovery")) {
      return "assets/buffs/buff_assisatnt.png";
    }
    if (s.includes("weakpoint_fire") || s.includes("weak to flame") || s.includes("flame weakness") || s.includes("flame boost") || s.includes("fire") || s.includes("flame")) {
      return "assets/buffs/weakpoint_fire.png";
    }
    if (s.includes("weakpoint_ice") || s.includes("weak to frost") || s.includes("frost weakness") || s.includes("frost boost") || s.includes("frozen") || s.includes("ice")) {
      return "assets/buffs/weakpoint_ice.png";
    }
    if (s.includes("weakpoint_thu") || s.includes("weak to volt") || s.includes("volt weakness") || s.includes("volt boost") || s.includes("thunder") || s.includes("lightning")) {
      return "assets/buffs/weakpoint_thu.png";
    }
    if (s.includes("weakpoint_phys") || s.includes("weak to physical") || s.includes("physical weakness") || s.includes("physical boost") || s.includes("grievous") || s.includes("tear")) {
      return "assets/buffs/weakpoint_physics.png";
    }
    if (s.includes("engine") || s.includes("team") || s.includes("speed")) {
      return "assets/buffs/buff_chongdong_player_015.png";
    }
    if (s.includes("tank") || s.includes("hp")) {
      return "assets/buffs/buff_AddMaxHP_FoodBase.png";
    }
    if (s.includes("judgment") || s.includes("striker") || s.includes("damage") || s.includes("stronger") || s.includes("emphatic")) {
      return "assets/buffs/buff_damageadd_001.png";
    }
    if (s.includes("destroy") || s.includes("destruction") || s.includes("friable") || s.includes("icebreaker") || s.includes("break")) {
      return "assets/buffs/Buff_EMBY_BrokenWeak.png";
    }
    if (s.includes("resonance") || s.includes("blend")) {
      return "assets/buffs/Buff_WeaponPas_004.png";
    }
    return "assets/buffs/buff_damageadd_001.png";
  }

  function resolveMmoBuff(rawId, type = "affix", weight = 0) {
    if (!rawId) return null;
    const cleanId = path.basename(String(rawId)).replace(/\..*$/, "").replace(/_C$/, "");

    let nameEn = cleanHtml(enLoc[cleanId + "_name"] || enLoc.BuffDes_Balance?.[cleanId + "_name"] || enLoc.BuffDes?.[cleanId + "_name"] || enLoc[cleanId]);
    let nameRu = cleanHtml(ruLoc[cleanId + "_name"] || ruLoc.BuffDes_Balance?.[cleanId + "_name"] || ruLoc.BuffDes?.[cleanId + "_name"] || ruLoc[cleanId] || nameEn);
    let descEn = cleanHtml(enLoc[cleanId + "_des"] || enLoc.BuffDes_Balance?.[cleanId + "_des"] || enLoc.BuffDes?.[cleanId + "_des"] || "");
    let descRu = cleanHtml(ruLoc[cleanId + "_des"] || ruLoc.BuffDes_Balance?.[cleanId + "_des"] || ruLoc.BuffDes?.[cleanId + "_des"] || descEn);

    // Exact matching for 99_1 .. 99_4 weakness buffs
    if (WEAKNESS_DESCS[cleanId]) {
      const wData = WEAKNESS_DESCS[cleanId];
      nameEn = wData.nameEn;
      nameRu = wData.nameRu;
      descEn = wData.descEn;
      descRu = wData.descRu;
    }

    let finalNameEn = nameEn || cleanId.replace(/^buff_origin_balance/, "Origin Buff ");
    let finalNameRu = nameRu || cleanId.replace(/^buff_origin_balance/, "Бафф Истока ");

    return {
      id: cleanId,
      nameEn: finalNameEn,
      nameRu: finalNameRu,
      descEn,
      descRu,
      type,
      weight,
      icon: getBestIcon(cleanId, finalNameEn)
    };
  }

  const seasonsMap = {};
  for (const [rKey, r] of Object.entries(rRows)) {
    const sNum = parseInt(r.OriginSeasonID, 10) || 1;
    if (!seasonsMap[sNum]) {
      seasonsMap[sNum] = {
        season: sNum,
        seasonType: "MMO",
        floorCount: 0,
        floors: []
      };
    }

    const floorNum = r.OriginRound || 1;
    const pools = r.WaveMonsterPool || [];
    const enemies = [];
    let floorTotalHp = 0;
    let maxMobHp = 0;

    pools.forEach((poolId, pIdx) => {
      const poolData = pRows[poolId];
      if (poolData && Array.isArray(poolData.PoolMonsters)) {
        poolData.PoolMonsters.forEach((pm, mIdx) => {
          const classPath = pm.MonsterClass?.AssetPathName || pm.MonsterClass || "";
          const attrId = pm.AttributeID || "";
          const statRow = mRows[attrId] || mRows[classPath] || {};

          const floorScale = floorNum; // 1x on F1 .. 36x on F36 (from OriginWarMonster_Balance curve)
          const baseRawHp = statRow.MaxHealth || 1000000;
          const scaledHp = Math.round(baseRawHp * floorScale);
          const scaledAtk = Math.round((statRow.CommonAtkBase || 10000) * floorScale);
          const scaledDef = Math.round((statRow.PhyDefBase || 4000) * floorScale);
          const count = pm.MonsterCount || 1;
          const totalHp = scaledHp * count;

          floorTotalHp += totalHp;
          if (scaledHp > maxMobHp) maxMobHp = scaledHp;

          const baseName = path.basename(classPath).replace(/\..*$/, "").replace(/^OriginWar_/, "").replace(/_C$/, "");

          enemies.push({
            wave: pIdx + 1,
            mob: mIdx + 1,
            key: `mmo_s${sNum}_f${floorNum}_w${pIdx + 1}_${mIdx + 1}`,
            nameEn: `Enemy #${mIdx + 1}`,
            nameRu: `Противник #${mIdx + 1}`,
            codeName: baseName && baseName !== "None" ? baseName : null,
            bossId: null,
            monsterType: "BS_MONSTER_NORMAL",
            count,
            level: pm.MonsterLevel || 75,
            hp: scaledHp,
            combinedHp: totalHp,
            atk: scaledAtk,
            def: scaledDef,
            image: null,
            blueprint: classPath && classPath !== "None" ? classPath : null,
            stats: statRow
          });
        });
      }
    });

    const stageMutators = [];
    (r.ShowBuffs || []).forEach((b) => {
      const bObj = resolveMmoBuff(b.AssetPathName || b, "affix");
      if (bObj) stageMutators.push(bObj);
    });
    (r.MonsterWeakBuffs || []).forEach((b) => {
      const bObj = resolveMmoBuff(b.AssetPathName || b, "weakness");
      if (bObj) stageMutators.push(bObj);
    });

    const dropBuffs = [];
    (r.DropBuffs || []).forEach((d) => {
      const bObj = resolveMmoBuff(d.BuffPoolID, "drop", d.DropWight || d.DropWeight || 100);
      if (bObj) dropBuffs.push(bObj);
    });

    const mmoCurveRow = curvesBalance[`1_${floorNum}`] || curvesBalance[`1_${Math.min(floorNum, 36)}`];
    const difficultySchedule = parseCurveSteps(mmoCurveRow);

    seasonsMap[sNum].floors.push({
      floor: floorNum,
      mobCount: enemies.reduce((sum, e) => sum + (e.count || 1), 0),
      totalHp: floorTotalHp,
      totalHpBillions: Number((floorTotalHp / 1e9).toFixed(3)),
      totalHpMillions: Number((floorTotalHp / 1e6).toFixed(2)),
      maxHp: maxMobHp,
      maxHpBillions: Number((maxMobHp / 1e9).toFixed(3)),
      maxHpMillions: Number((maxMobHp / 1e6).toFixed(2)),
      rewardDropId: r.RoundAwardId?.[0]?.Value || r.RoundAwardId || "",
      helpPoints: r.RoundHelpPoint || 0,
      stageMutators,
      dropBuffs,
      difficultySchedule,
      enemiesCount: enemies.length,
      enemies
    });
  }

  // Ensure all seasons from SeasonConfigDataTable (including S2) are included
  for (const sKey of Object.keys(sRows)) {
    const sNum = parseInt(sKey, 10);
    if (sNum && !seasonsMap[sNum]) {
      // If a season doesn't have a separate round block (e.g. S2 sharing pool config with S1), copy template from S1
      const templateFloors = (seasonsMap[1]?.floors || []).map((fl) => ({
        ...fl,
        enemies: (fl.enemies || []).map((e) => ({
          ...e,
          key: e.key.replace(/_s\d+_/, `_s${sNum}_`)
        }))
      }));

      seasonsMap[sNum] = {
        season: sNum,
        seasonType: "MMO",
        floorCount: templateFloors.length,
        floors: templateFloors
      };
    }
  }

  const finalSeasons = Object.values(seasonsMap).map((s) => {
    s.floors.sort((a, b) => a.floor - b.floor);
    s.floorCount = s.floors.length;
    s.minFloor = s.floors.length > 0 ? s.floors[0].floor : 1;
    s.maxFloor = s.floors.length > 0 ? s.floors[s.floors.length - 1].floor : s.floors.length;
    s.totalSeasonHp = s.floors.reduce((sum, f) => sum + f.totalHp, 0);
    s.totalSeasonHpBillions = Number((s.totalSeasonHp / 1e9).toFixed(2));
    s.finalBossHp = s.floors[s.floors.length - 1]?.maxHp || 0;

    const maxMmoDiff = Math.max(...s.floors.map((fl) => fl.difficultySchedule?.initialPct || 100));
    s.maxDifficulty = maxMmoDiff;
    s.curveProfile = `${maxMmoDiff}% MMO Balance`;
    s.difficultySummary = {
      maxDifficulty: maxMmoDiff,
      curveProfile: `${maxMmoDiff}% MMO Balance`,
      floors: s.floors.map((fl) => ({
        floor: fl.floor,
        initialPct: fl.difficultySchedule?.initialPct || 100,
        daysToMin: fl.difficultySchedule?.daysToMin || 1,
        stepsCount: fl.difficultySchedule?.steps?.length || 1,
        steps: fl.difficultySchedule?.steps || []
      }))
    };

    const sRow = sRows[String(s.season)] || sRows[s.season];
    if (sRow) {
      const rawStart = sRow.SeasonBeginTime || sRow.SeasonBeginTime_Region?.[0]?.Value || "2025-12-29";
      const rawEnd = sRow.SeasonEndTime || sRow.SeasonEndTime_Region?.[0]?.Value || "2026-02-02";
      s.startDate = normalizeIsoDate(rawStart);
      s.endDate = normalizeIsoDate(rawEnd);
    }

    return s;
  }).sort((a, b) => a.season - b.season);

  const mmoStatsPayload = JSON.stringify(
    {
      meta: {
        updatedAt: new Date().toISOString(),
        mode: "MMO",
        totalSeasons: finalSeasons.length,
        maxFloors: Math.max(...finalSeasons.map((s) => s.maxFloor))
      },
      seasons: finalSeasons
    },
    null,
    2
  );

  if (finalSeasons.length === 0) throw new Error('[required] MMO OOW produced zero seasons; no output was changed.');
  return { payload: mmoStatsPayload, seasonsCount: finalSeasons.length };
}

function main() {
  const projectRoot = resolveProjectRoot();
  const rawDir = resolveRawDir(projectRoot);
  processUserOowStats(rawDir, projectRoot);
}

if (require.main === module) {
  main();
}

module.exports = {
  processUserOowStats
};
