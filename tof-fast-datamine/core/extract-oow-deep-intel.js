const fs = require("fs");
const path = require("path");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function resolveProjectRoot() {
  const customArg = process.argv.find((arg) => arg.startsWith("--project-root="));
  if (customArg) return path.resolve(customArg.slice("--project-root=".length));
  let cur = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(cur, "package.json"))) return cur;
    cur = path.resolve(cur, "..");
  }
  return path.resolve(__dirname, "../..");
}

function resolveRawDir(projectRoot) {
  const customArg = process.argv.find((arg) => arg.startsWith("--raw-dir="));
  if (customArg) return path.resolve(customArg.split("=")[1]);

  const candidateDirs = [
    path.join(projectRoot, "datamine-pipeline", "raw_exports"),
    path.join(projectRoot, "raw_exports"),
    path.join(projectRoot, "temperary")
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) return dir;
  }
  return path.join(projectRoot, "raw_exports");
}

function cleanHtmlTags(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
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

function extractOowDeepIntel() {
  const projectRoot = resolveProjectRoot();
  const rawDir = resolveRawDir(projectRoot);
  const gameResDir = path.join(projectRoot, "datamine-pipeline", "Tower-of-fantasy-game-resources");
  const buffsAssetDir = path.join(projectRoot, "datamine", "oow", "assets", "buffs");

  if (!fs.existsSync(buffsAssetDir)) {
    fs.mkdirSync(buffsAssetDir, { recursive: true });
  }

  console.log(`\n======================================================`);
  console.log(`[oow-deep-intel] Extracting Deep OOW & BigSecret Intel`);
  console.log(`======================================================`);
  console.log(`Using raw directory: ${rawDir}`);

  const roundConfigFile = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarRoundConfigDataTable_Overseas.json");
  const seasonConfigFile = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarSeasonConfigDataTable_Overseas.json");
  const monsterPoolFile = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/OriginWarMonsterPoolDataTable_Overseas.json");
  const monsterStaticFile = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Dungeon/DT_MonsterStaticData_Overseas.json");
  const t1 = path.join(rawDir, "Hotta/Content/ResourcesOverSea/CoreBlueprints/DataTable/Extra/GameplayEffectTipsDataTable_Overseas.json");
  const t2 = path.join(rawDir, "Hotta/Content/Resources/CoreBlueprints/DataTable/GameplayEffectTipsDataTable.json");
  const enLocFile = path.join(rawDir, "Hotta/Content/Localization/Game/en/Game.json");
  const ruLocFile = path.join(rawDir, "Hotta/Content/Localization/Game/ru/Game.json");
  const fceIndexFile = path.join(projectRoot, "datamine/fce/data/fce-index.json");

  const requiredInputs = [roundConfigFile, seasonConfigFile, monsterPoolFile, monsterStaticFile, enLocFile];
  const missingRequired = requiredInputs.filter((filePath) => !fs.existsSync(filePath));
  if (missingRequired.length) {
    throw new Error(`[required] Missing OOW deep-intel inputs:\n${missingRequired.join("\n")}`);
  }

  const enLoc = readJsonFile(enLocFile) || {};
  const ruLoc = readJsonFile(ruLocFile) || {};
  // Boss id -> name lookup now comes from the lightweight per-boss manifest.
  const fceIndex = readJsonFile(fceIndexFile) || { bosses: [] };

  const d1 = readJsonFile(t1) || {};
  const d2 = readJsonFile(t2) || {};
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
    return { image: null, blueprint: null };
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
    if (!classPath) return { nameEn: "Unknown Enemy", nameRu: "Неизвестный враг", bossId: null, image: null, blueprint: null };
    const base = path.basename(classPath).split(".")[0].replace("OriginWar_", "").replace("_C", "");
    const isBoss = /boss_/i.test(base) || /boss_/i.test(classPath);
    const bNum = extractBossNumber(classPath || base);
    const { image, blueprint } = resolveMobImages(classPath);

    if (isBoss && bNum != null && fceBossByNum.has(bNum)) {
      const fb = fceBossByNum.get(bNum);
      return {
        nameEn: fb.nameEn,
        nameRu: fb.nameRu,
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
          bossId: isBoss && bNum ? `Boss_#${String(bNum).padStart(3, "0")}` : null,
          image,
          blueprint
        };
      }
    }

    let clean = cleanMobName(base);
    return { nameEn: clean, nameRu: clean, bossId: isBoss && bNum ? `Boss_#${String(bNum).padStart(3, "0")}` : null, image, blueprint };
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
    if (iconAsset && fs.existsSync(gameResDir)) {
      const cleanRel = iconAsset.replace("/Game/Resources/", "").split(".")[0] + ".png";
      const diskPath = path.join(gameResDir, cleanRel);
      if (fs.existsSync(diskPath)) {
        const iconBase = path.basename(cleanRel);
        const destPath = path.join(buffsAssetDir, iconBase);
        if (!fs.existsSync(destPath)) {
          try {
            fs.copyFileSync(diskPath, destPath);
          } catch (e) {}
        }
        iconPath = `assets/buffs/${iconBase}`;
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

  const roundData = readJsonFile(roundConfigFile);
  const roundRows = Array.isArray(roundData) ? (roundData[0]?.Rows || roundData.Rows) : (roundData.Rows || roundData);

  const seasonData = readJsonFile(seasonConfigFile);
  const seasonRows = Array.isArray(seasonData) ? (seasonData[0]?.Rows || seasonData.Rows) : (seasonData.Rows || seasonData);

  const poolData = readJsonFile(monsterPoolFile);
  const poolRows = Array.isArray(poolData) ? (poolData[0]?.Rows || poolData.Rows) : (poolData.Rows || poolData);

  const monsterData = readJsonFile(monsterStaticFile);
  const monsterRows = Array.isArray(monsterData) ? (monsterData[0]?.Rows || monsterData.Rows) : (monsterData.Rows || monsterData);

  if (!roundRows || !seasonRows) {
    console.error("[oow-deep-intel] Error: Missing required round/season config tables.");
    return null;
  }

  const outputSeasons = [];

  for (const [sKey, sRow] of Object.entries(seasonRows)) {
    const sNum = parseInt(sKey, 10);
    if (isNaN(sNum)) continue;

    const startDate = sRow.SeasonBeginTime ? sRow.SeasonBeginTime.split(" ")[0].replace(/\//g, "-") : "";
    const endDate = sRow.SeasonEndTime ? sRow.SeasonEndTime.split(" ")[0].replace(/\//g, "-") : "";

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

      const waveEnemies = [];
      let floorTotalHp = 0;
      let floorMaxMobHp = 0;

      for (let waveIdx = 0; waveIdx < (rRow.WaveMonsterPool || []).length; waveIdx++) {
        const poolKey = rRow.WaveMonsterPool[waveIdx];
        const pData = poolRows
          ? poolRows[poolKey] ||
            poolRows[poolKey.toLowerCase()] ||
            poolRows[poolKey.toUpperCase()] ||
            poolRows[`S${poolKey.slice(1)}`] ||
            poolRows[`s${poolKey.slice(1)}`]
          : null;

        if (pData && pData.PoolMonsters) {
          pData.PoolMonsters.forEach((m, mobSubIdx) => {
            const mobInfo = resolveMobInfo(m.MonsterClass?.AssetPathName);
            const attr = monsterRows
              ? monsterRows[m.AttributeID] ||
                monsterRows[m.AttributeID?.toLowerCase()] ||
                monsterRows[m.AttributeID?.toUpperCase()] ||
                monsterRows[`S${m.AttributeID?.slice(1)}`] ||
                monsterRows[`s${m.AttributeID?.slice(1)}`] ||
                {}
              : {};
            const singleHp = attr.MaxHealth || 0;
            const combinedHp = singleHp * (m.MonsterCount || 1);

            floorTotalHp += combinedHp;
            if (singleHp > floorMaxMobHp) floorMaxMobHp = singleHp;

            const inherentBuffs = (m.MonsterBuffID || []).map((b) => {
              const rawName = b.AssetPathName?.split(".").pop() || "";
              return resolveBuffFullIntel(rawName);
            });

            waveEnemies.push({
              wave: waveIdx + 1,
              poolKey,
              mobIndex: mobSubIdx + 1,
              attributeId: m.AttributeID,
              nameEn: mobInfo.nameEn,
              nameRu: mobInfo.nameRu,
              bossId: mobInfo.bossId,
              monsterType: m.MonsterType,
              count: m.MonsterCount || 1,
              level: m.MonsterLevel || 100,
              singleHp,
              combinedHp,
              hpFormatted: singleHp.toLocaleString("en-US"),
              atk: attr.CommonAtkBase || 0,
              def: attr.PhyDefBase || 0,
              image: mobInfo.image,
              blueprint: mobInfo.blueprint,
              stats: attr,
              inherentBuffs
            });
          });
        }
      }

      if (waveEnemies.length > 0) {
        floorList.push({
          floor: round,
          isFinalFloor: false,
          totalHp: floorTotalHp,
          totalHpBillions: Number((floorTotalHp / 1e9).toFixed(3)),
          totalHpMillions: Number((floorTotalHp / 1e6).toFixed(2)),
          maxMobHp: floorMaxMobHp,
          maxMobHpBillions: Number((floorMaxMobHp / 1e9).toFixed(3)),
          maxMobHpMillions: Number((floorMaxMobHp / 1e6).toFixed(2)),
          rewardDropId: rRow.RoundAwardId?.[0]?.Value || "",
          helpPoints: rRow.RoundHelpPoint || 0,
          stageMutators,
          dropBuffs,
          enemies: waveEnemies
        });
      }
    }

    if (floorList.length > 0) {
      floorList[floorList.length - 1].isFinalFloor = true;
      const totalSeasonHp = floorList.reduce((sum, f) => sum + f.totalHp, 0);

      outputSeasons.push({
        season: sNum,
        startDate,
        endDate,
        floorCount: floorList.length,
        minFloor: floorList[0]?.floor || 1,
        maxFloor: floorList[floorList.length - 1]?.floor || floorList.length,
        totalSeasonHp,
        finalBossHp: floorList[floorList.length - 1]?.maxMobHp || 0,
        floors: floorList
      });
    }
  }

  outputSeasons.sort((a, b) => a.season - b.season);

  if (outputSeasons.length === 0) {
    throw new Error("[required] OOW deep intel produced zero seasons; no output was published.");
  }
  const oowDir = path.join(projectRoot, "datamine", "oow", "data");
  if (!fs.existsSync(oowDir)) fs.mkdirSync(oowDir, { recursive: true });

  const deepIntelPayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalSeasons: outputSeasons.length,
      description: "Comprehensive Origin of War (BigSecret) Intel with localized mob names, boss links, mutator descriptions, drop rates, real icons, and stats."
    },
    seasons: outputSeasons
  };

  const outFile = path.join(oowDir, "oow_deep_intel.json");
  fs.writeFileSync(outFile, JSON.stringify(deepIntelPayload, null, 2), "utf8");

  console.log(`[oow-deep-intel] Successfully extracted deep intel across ${outputSeasons.length} seasons.`);
  console.log(`[oow-deep-intel] Saved to: ${outFile}`);

  return deepIntelPayload;
}

if (require.main === module) {
  extractOowDeepIntel();
}

module.exports = {
  extractOowDeepIntel
};
