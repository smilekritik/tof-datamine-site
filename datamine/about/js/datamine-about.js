(function () {
  const ABOUT_CONTENT = {
    en: {
      metaTitle: "About TOF Datamine — Data Sources & Pipeline",
      metaDesc: "How TOF Datamine extracts, processes and curates Tower of Fantasy data for OOW, FCE, Sequential, Multype and Items.",
      heroEyebrow: "ABOUT DATAMINE",
      heroTitle: "Where the data comes from",
      heroSubtitle: "How Tower of Fantasy game resources become the tables, charts, mechanics and identifiers shown in this archive.",

      snapshotLabel: "DATA SNAPSHOT",
      snapshotVersion: "Dataset snapshot:",
      snapshotClient: "Sources:",
      snapshotExport: "Exported:",
      snapshotLive: "Live Global:",
      unavailable: "Unavailable",

      tocTitle: "ON THIS PAGE",
      tocGroupBasics: "FOUNDATION",
      tocOverview: "Overview",
      tocBasics: "Terminology",
      tocExtraction: "Data discovery",
      tocGroupDatasets: "DATASETS",
      tocPipeline: "Update pipeline",
      tocOow: "Origin of War",
      tocSeq: "Sequential",
      tocFce: "FCE",
      tocItems: "Items",
      tocMultype: "Multype",
      tocMeta: "Release metadata",
      tocGroupSafety: "SAFETY & CODE",
      tocCuration: "Principles",
      tocValidation: "Validation",
      tocReproduce: "Reproducing",
      tocSources: "Sources",

      intro1: "This site does not manually type most values from screenshots or guides.",
      intro2: "Most datasets begin with structured resources exported directly from the Tower of Fantasy client. Those resources are checked, processed by reproducible scripts, and reduced to the clean datasets used by each Datamine tool. Some displayed metrics are calculated from those raw values, while a smaller layer — such as readable renames or safe image mappings — is maintained manually.",

      badgeGame: "GAME DATA",
      badgeGameDesc: "Directly extracted from game asset files",
      badgeCalc: "CALCULATED",
      badgeCalcDesc: "Derived mathematically from raw game values",
      badgeCurated: "MANUALLY MAINTAINED",
      badgeCuratedDesc: "Human-maintained mapping, label or composition",
      badgeIntermediate: "BUILD INTERMEDIATE",
      badgeIntermediateDesc: "Aggregated state used only during build",
      badgeRuntime: "PUBLIC RUNTIME",
      badgeRuntimeDesc: "Served directly to site routes and tools",

      dataTypesAria: "Data types",
      permalinkLabel: "Permalink",
      tagBossArtwork: "Manually maintained boss artwork mapping",
      tagBossComposition: "Manually maintained card composition and artwork",
      tagItemRenames: "Manually maintained renames (keys preserved)",
      tagMultypePresentation: "Manually maintained presentation and readable names",

      secTerminologyTitle: "Before the pipeline",
      secTerminologyIntro: "Tower of Fantasy does not ship its data as a neat folder of JSON files for this website. The PC client contains packaged Unreal Engine resources. The first step is therefore to extract only the resources that the Datamine needs into formats that ordinary processing scripts can read.",
      glossaryPak: "A packaged game archive containing many Unreal Engine resources.",
      glossaryUasset: "An Unreal Engine asset. Depending on its type, it may contain a data table, configuration, texture or another game resource.",
      glossaryLocres: "Game text is stored separately from many gameplay tables. English and Russian localization exports are used where the Datamine needs the game's own text.",
      glossaryJson: "JSON is usually an exported representation, not necessarily the original format stored inside the game. It makes selected structured resources practical to inspect and process.",
      glossaryPng: "Image resources needed by the archive are exported separately as ordinary image files.",

      secTwoWaysTitle: "Two ways we find data",
      twoWaysIntro: "Depending on where the relevant values live inside the game, the archive relies on two distinct workflows:",
      way1Title: "Targeted extraction",
      way1Tagline: "When we already know the source tables",
      way1Desc: "Used for regular updates (OOW, Sequential, FCE, Items). The exporter extracts only configured, known resource paths, validates them, and hands them off to fast processing scripts.",
      way2Title: "Discovery scan",
      way2Tagline: "When modifier fields live across many assets",
      way2Desc: "Used for research tasks such as Multype. A broad export of the game is searched recursively for modifier structures to build source maps and discover multiplier relationships.",

      secPipelineTitle: "Regular Datamine update pipeline",
      secPipelineIntro: "The packaged fast-export handoff uses an exact whitelist instead of exporting the entire game. Processing then follows a reproducible, multi-stage sequence:",
      step1Title: "GAME CLIENT",
      step1Desc: "Tower of Fantasy installation files, launcher configuration, and packaged Unreal Engine PAK archives on the game PC.",
      step2Title: "TARGETED EXPORT (SCRIPT 1)",
      step2Desc: "tof-fast-datamine configures UnrealExporter with 27 exact structured-data rules and a mode-dependent image selection (Small or Full).",
      step3Title: "SOURCE VALIDATION",
      step3Desc: "The packaged exporter verifies 12 structured source groups in both modes; Full mode verifies 3 additional image groups. Missing export requirements abort archive creation.",
      step4Title: "CANONICAL PROCESSORS (SCRIPT 2)",
      step4Desc: "Deterministic Node.js scripts in pipeline/processors/ parse Items, calculate Sequential scaling & Global cutoff, extract FCE mechanics, aggregate OOW stats, and shard OOW into per-season files.",
      step5Title: "INTEGRITY & STAGING VALIDATION",
      step5Desc: "generate-release-manifest.js normalizes provenance metadata; validate-datamine.js verifies the replacement bundle against pipeline/contracts/outputs.json before publication.",
      step6Title: "BUNDLE REPLACEMENT & DEPLOYMENT",
      step6Desc: "A replacement bundle (dist_datamine_bundle) is generated; maintained deployments publish verified static assets to the production server.",

      secOowTitle: "Origin of War (OOW)",
      oowPlain: "Origin of War combines season configuration, floor rounds (F1..F30), wave enemy composition, monster attributes, and localization into unified floor progression cards and difficulty curves.",
      oowCalcNote: "Raw monster health is extracted from client tables. The archive then applies the resistance configured for each season to estimate Effective HP:",
      oowCuratedNote: "Boss artwork uses explicit verified mappings. If no mapping is available, Datamine does not substitute an unrelated portrait.",
      oowDetailsTitle: "Technical details & data trace",

      secSeqTitle: "Sequential",
      seqPlain: "Sequential Phantasm charts track boss HP growth, powercreep percentages, and effective damage estimates per stage.",
      seqCutoffPlain: "The game table contains unreleased stages beyond the active Global progression. The build walks stages 1..100; if the ratio between consecutive stages exceeds 3.0x (MaxHealth(next) / MaxHealth(previous) > 3.0), the jump indicates unscaled CN baseline data, cleanly ending the Global dataset at the preceding stage.",
      seqDetailsTitle: "Technical details & stage cutoff",

      secFceTitle: "FCE Boss Mechanics",
      fcePlain: "Frontier Clash Evolution cards pair authoritative in-game mechanics descriptions with boss portraits, organized by phase.",
      fceClarification: "Mechanic text comes directly from game localization (Game.json), not from historical spreadsheets. Canonical descriptions on this site are extracted directly from the client.",
      fceCandidatePlain: "A dedicated parser scans EN/RU localization keys, groups descriptions by phase, and compares them with VoidCloneBossConfigDataTable_Overseas.json. Unregistered bosses and missing texts are written to review files, while verified runtime cards remain in bosses/*.json.",
      fceDetailsTitle: "Technical details & manifest rebuild",

      secItemsTitle: "Items",
      itemsPlain: "The Items directory provides searchable catalog tables for Gacha and MMO modes, maintaining developer identity while supporting readable naming.",
      itemsSourcesPlain: "MappingItemId.json is the authoritative source for developer numeric IDs (NUM 1..N). Supplemental items (from ST_Item_Oversea.json) are appended strictly after the maximum developer numeric ID with consecutive synthetic IDs (maxDeveloperId + 1, maxDeveloperId + 2, ...).",
      itemsRenamePlain: "Where an English item name is unavailable in game resources, Datamine provides a maintained machine-translated fallback while preserving original game text separately. Curated renames attach strictly to stable string item IDs without altering original keys.",
      itemsDetailsTitle: "Technical details & identity contract",

      secMultypeTitle: "Multype (Research Pipeline)",
      multypePlain: "Multype maps combat modifier attributes, multiplier tags, and ModuleExtraType relationships discovered through a broad scan of Tower of Fantasy assets.",
      multypeScannerPlain: "A full research export of game assets is processed offline by Tower-of-fantasy-exporter-scanner. The scanner indexes files where modifier structures occur: Properties.ModuleExtraModifierInfos, Properties.Modifiers (categorized under NoModule), and Properties.CustomApplicationRequirement[].GameplayModifierInfos.",
      multypeExampleTitle: "Why ModuleExtraType matters (Real Example):",
      multypeExampleDesc: "The attribute PhyAtkExtraUpMult appears across multiple distinct systems. The scanner indexes both the attribute and its module context:",
      multypeExample1: "• NoModule: found in GE_BattleRobot_002_Passive, GE_Buff_Pet_CommonDamage...",
      multypeExample2: "• ModuleExtraType_Wormhole: found in buff_War_PhyDamage_Level1, buff_Wormhole_PhyDamage_Level1...",
      multypeExampleNote: "The same attribute name is not enough by itself. Its ModuleExtraType reveals which multiplication context the modifier belongs to.",
      multypeModesTitle: "Three Presentation Modes on Multype:",
      multypeModeDatamined: "• Datamined: The raw technical structure and identifiers straight from the scanner dataset.",
      multypeModeRenamed: "• Renamed: Human-readable, manually maintained names attached to stable buff keys.",
      multypeModeCombined: "• Combined: Displays readable manually maintained names while keeping the primary technical key visible.",
      multypeExcelNote: "The spreadsheet used during analysis (exported_v1.xlsx) is a downstream visualization generated by scanned_result_to_exel.py from module_extra_to_files_mapping3.json, not the authoritative game-data source.",
      multypeScannerToolNote: "A separate exporter/scanner project (Tower-of-fantasy-exporter-scanner) is used for large-scale research tasks where the relevant game files are not known in advance. Those scans are substantially heavier than the normal Datamine update and do not run during routine site builds.",
      multypeDetailsTitle: "Technical scanner outputs & patch diffing",

      secMetaTitle: "Release & Version Metadata",
      metaPlain: "The archive tracks provenance metadata so users know exactly which game client version, branch, and export timestamp produced the current datasets. The release manifest (datamine/release-manifest.json) serves as the single source of truth for snapshot versioning.",
      metaDetailsTitle: "Technical details & provenance lineage",

      secNotDoTitle: "What this archive does not do",
      notDo1Title: "Screenshots are not treated as authoritative numerical sources.",
      notDo1Desc: "Structured game data is preferred where available.",
      notDo2Title: "Calculated values are not presented as raw game values.",
      notDo2Desc: "Effective HP and similar derived metrics are clearly labelled as calculations.",
      notDo3Title: "Missing localization is not invented.",
      notDo3Desc: "If an ID is known but original text is unavailable, the source field remains empty.",
      notDo4Title: "Boss artwork is not blindly guessed.",
      notDo4Desc: "Explicit mappings are preferred when automatic association is unsafe.",
      notDo5Title: "Manual names do not overwrite original identifiers.",
      notDo5Desc: "Manually maintained renames are kept as a separate layer attached to original string IDs.",
      notDo6Title: "Scanner results are not presented as proof of every combat formula.",
      notDo6Desc: "The scan indexes modifier structures and categories; it does not replace runtime combat testing.",

      secValidationTitle: "Validation & pipeline safety",
      validationDesc: "Before a handoff archive is created, the packaged exporter verifies 12 structured data groups. Full mode also verifies 3 image groups. Missing export requirements abort ZIP creation. Downstream processors check contracts and hashes, ensuring that failed sharding or invalid schemas never overwrite active runtime data.",
      validationDetailsTitle: "Technical validation rules & export modes",
      validationDetailsFullVsSmall: "Full vs Small: both modes export all 27 exact structured-data rules. Small checks only the void and WorldBossList image rules and uses the persistent image ignore index; Full exports all 9 configured image groups without that index.",
      validationDetailsGroups: "12 Structured Groups Verified:\n1. Items: ID mapping (MappingItemId.json)\n2. Items: name mapping (MappingItemIdAndName.json)\n3. Items: rarity mapping (MappingItemIdAndColor.json)\n4. Items: Global StringTable (ST_Item_Oversea.json)\n5. Localization: English (Game.json)\n6. Localization: Russian (Game.json)\n7. OOW/Sequential: monster HP (DT_MonsterStaticData_Overseas.json)\n8. OOW: season config (OriginWarSeasonConfigDataTable_Overseas.json)\n9. OOW: round config (OriginWarRoundConfigDataTable_Overseas.json)\n10. OOW: monster pools (OriginWarMonsterPoolDataTable_Overseas.json)\n11. FCE: overseas ordered boss catalog (VoidCloneBossConfigDataTable_Overseas.json)\n12. Client version metadata (export-version.json / config.xml)\nFull mode also verifies 3 image groups.",

      secReproduceTitle: "Reproducing the regular pipeline",
      reproduceDesc: "Use the packaged exporter on the game machine, then run repository processing and verification checks:",
      cmdExport: "tof-fast-datamine/RUN_EXPORT_SMALL.bat",
      cmdExportDesc: "# Exact-whitelist routine export; use RUN_EXPORT_FULL.bat when all image groups must be refreshed",
      cmdProcess: "npm run process:datamine",
      cmdProcessDesc: "# Runs scripts/2-process-datamine.ps1: executes canonical processors, validates output contracts, and prepares replacement bundle",
      cmdCheck: "npm test && npm run check:datamine",
      cmdCheckDesc: "# Runs full automated regression test suites, validates 11 public pages, headers, and dataset integrity",
      reproduceNote: "Maintainers then deploy the replacement bundle to production. Multype discovery scans remain a separate offline Python workflow.",

      secSourcesTitle: "Source code & research tools",
      sourceDatamineTitle: "TOF Datamine Site & Pipeline",
      sourceDatamineDesc: "The source code for this web archive, data contracts, processing scripts, and interface components.",
      sourceScannerTitle: "Tower of Fantasy Exporter Scanner",
      sourceScannerDesc: "Scanning tools to inspect broad game asset exports and discover modifier structures for research tasks (e.g. Multype).",
      githubLink: "View on GitHub →",

      disclaimer: "Tower of Fantasy, names, game data, and visual assets belong to their respective copyright holders. This is an unofficial community project, neither affiliated with nor endorsed by the game developers or publishers.",

      traceLabels: {
        inputs: "Inputs & Roles",
        processing: "Processing & Relations",
        outputs: "Outputs & Consumers",
        gameData: "Game data",
        manualData: "Manually maintained",
        intermediate: "Build intermediate",
        publicRuntime: "Public runtime",
        processor: "Canonical processor",
        joinKey: "Join key / Relation",
        calc: "Calculated fields",
        route: "Route consumer"
      }
    },
    ru: {
      metaTitle: "О TOF Datamine — Источники данных и пайплайн",
      metaDesc: "Откуда берутся данные в архиве Datamine TOF: экспорт, обработка и ручное сопровождение OOW, FCE, Sequential, Multype и Items.",
      heroEyebrow: "О ДАТАМАЙНЕ",
      heroTitle: "Откуда берутся данные",
      heroSubtitle: "Как ресурсы клиента Tower of Fantasy превращаются в таблицы, графики, механики и списки идентификаторов в этом архиве.",

      snapshotLabel: "СНИМОК ДАННЫХ",
      snapshotVersion: "Снимок Datamine:",
      snapshotClient: "Источники:",
      snapshotExport: "Экспортирован:",
      snapshotLive: "Live Global:",
      unavailable: "Недоступно",

      tocTitle: "НА ЭТОЙ СТРАНИЦЕ",
      tocGroupBasics: "ОСНОВЫ",
      tocOverview: "Обзор",
      tocBasics: "Терминология",
      tocExtraction: "Поиск данных",
      tocGroupDatasets: "ДАТАСЕТЫ",
      tocPipeline: "Пайплайн",
      tocOow: "Истоки войны",
      tocSeq: "Последовательность",
      tocFce: "FCE",
      tocItems: "Предметы",
      tocMultype: "Multype",
      tocMeta: "Метаданные релиза",
      tocGroupSafety: "ПРАВИЛА И КОД",
      tocCuration: "Принципы",
      tocValidation: "Валидация",
      tocReproduce: "Воспроизведение",
      tocSources: "Репозитории",

      intro1: "На этом сайте значения не перепечатываются вручную со скриншотов или гайдов.",
      intro2: "Большинство наборов данных начинаются со структурированных ресурсов, извлекаемых напрямую из ПК-клиента Tower of Fantasy. Они валидируются, обрабатываются воспроизводимыми скриптами и приводятся к компактным наборам данных для каждого раздела. Некоторые показатели рассчитываются по игровым формулам, а небольшой слой — понятные переименования или проверенные привязки картинок — поддерживается вручную.",

      badgeGame: "ИГРОВЫЕ ДАННЫЕ",
      badgeGameDesc: "Извлечено напрямую из файлов ассетов игры",
      badgeCalc: "РАССЧИТАНО",
      badgeCalcDesc: "Рассчитано математически по формулам игры",
      badgeCurated: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ",
      badgeCuratedDesc: "Поддерживаемые вручную привязки, названия и композиция",
      badgeIntermediate: "ПРОМЕЖУТОЧНЫЕ ДАННЫЕ СБОРКИ",
      badgeIntermediateDesc: "Агрегированные файлы, используемые только во время сборки",
      badgeRuntime: "ДАННЫЕ САЙТА",
      badgeRuntimeDesc: "Финальные файлы, загружаемые веб-страницами и инструментами",

      dataTypesAria: "Типы данных",
      permalinkLabel: "Постоянная ссылка",
      tagBossArtwork: "Привязка изображений боссов поддерживается вручную",
      tagBossComposition: "Композиция карточек и изображения поддерживаются вручную",
      tagItemRenames: "Названия поддерживаются вручную, ключи сохранены",
      tagMultypePresentation: "Представление и понятные названия поддерживаются вручную",

      secTerminologyTitle: "Перед началом пайплайна",
      secTerminologyIntro: "Tower of Fantasy не хранит данные в виде готовой папки JSON. Клиент состоит из упакованных архивов Unreal Engine. Поэтому первый шаг — извлечь только необходимые архиву ресурсы в форматы, доступные для обычных скриптов обработки.",
      glossaryPak: "Архив пакета игры, содержащий множество упакованных ресурсов Unreal Engine.",
      glossaryUasset: "Файл ассета Unreal Engine. В зависимости от типа содержит таблицу данных, параметры, текстуру или другой ресурс.",
      glossaryLocres: "Тексты игры хранятся отдельно от логических таблиц. Экспорты английской и русской локализации используются там, где нужен оригинальный текст игры.",
      glossaryJson: "JSON — это формат экспорта для обработки, а не исходное хранение внутри движка. Он позволяет удобно читать и преобразовывать структуры данных.",
      glossaryPng: "Изображения, необходимые архиву, экспортируются отдельно в виде стандартных графических файлов.",

      secTwoWaysTitle: "Два способа поиска данных",
      twoWaysIntro: "В зависимости от того, где лежат нужные значения, архив использует два разных подхода:",
      way1Title: "Целевой экспорт",
      way1Tagline: "Когда исходные таблицы заранее известны",
      way1Desc: "Используется для регулярных обновлений (OOW, Sequential, FCE, Items). Экспортёр извлекает только заданные пути ресурсов, проверяет их и передаёт быстрым скриптам обработки.",
      way2Title: "Поисковое сканирование",
      way2Tagline: "Когда модификаторы распределены по множеству ассетов",
      way2Desc: "Используется для исследовательских задач (таких как Multype). Широкий экспорт ассетов рекурсивно сканируется для построения карт источников и поиска связей множителей.",

      secPipelineTitle: "Регулярный пайплайн обновлений",
      secPipelineIntro: "Пакетный целевой экспорт использует строгий whitelist вместо выгрузки всей игры. Дальнейшая обработка следует воспроизводимому многоэтапному процессу:",
      step1Title: "КЛИЕНТ ИГРЫ",
      step1Desc: "Файлы установки Tower of Fantasy, конфигурация лаунчера и упакованные PAK-архивы Unreal Engine на компьютере с игрой.",
      step2Title: "ЦЕЛЕВОЙ ЭКСПОРТ (СКРИПТ 1)",
      step2Desc: "tof-fast-datamine запускает UnrealExporter с 27 точными правилами структурированных данных и набором изображений для выбранного режима (Small или Full).",
      step3Title: "ВАЛИДАЦИЯ ИСХОДНИКОВ",
      step3Desc: "Пакетный экспортёр проверяет 12 групп структурированных данных в обоих режимах; Full дополнительно проверяет 3 группы изображений. При нехватке данных архив не создаётся.",
      step4Title: "КАНОНИЧЕСКАЯ ОБРАБОТКА (СКРИПТ 2)",
      step4Desc: "Скрипты Node.js в pipeline/processors/ собирают Items, рассчитывают графики Sequential и отсечку CN, извлекают механики FCE, агрегируют OOW и шардируют OOW по сезонам.",
      step5Title: "ПРОВЕРКА ЦЕЛОСТНОСТИ И STAGING",
      step5Desc: "generate-release-manifest.js нормализует метаданные; validate-datamine.js проверяет обновленный бандл по контракту pipeline/contracts/outputs.json перед публикацией.",
      step6Title: "ЗАМЕНА БАНДЛА И ДЕПЛОЙ",
      step6Desc: "Формируется готовый бандл dist_datamine_bundle; мейнтейнер выполняет публикацию проверенных статических файлов на рабочий сервер.",

      secOowTitle: "Истоки войны (OOW)",
      oowPlain: "Раздел «Истоки войны» объединяет конфигурацию сезонов, этажи (F1..F30), состав волн, базовые характеристики монстров и локализацию в наглядные карточки этажей и графики сложности.",
      oowCalcNote: "Сырое здоровье монстров извлекается из таблиц клиента. Затем архив применяет сопротивление, установленное для выбранного сезона, для расчёта Effective HP:",
      oowCuratedNote: "Изображения боссов используют строго проверенные сопоставления. При отсутствии проверенного арта портрет остаётся пустым, без случайных подстановок.",
      oowDetailsTitle: "Технические детали и цепочка данных",

      secSeqTitle: "Последовательность (Sequential)",
      seqPlain: "Графики Последовательности отображают рост чистого HP боссов, процентный прирост (Powercreep) и примерный необходимый урон по этапам.",
      seqCutoffPlain: "Таблица игры содержит невыпущенные этапы за пределами активной Global-версии. Скрипт сборки проверяет этапы 1..100: если отношение HP к предыдущему этапу превышает 3.0x (MaxHealth(next) / MaxHealth(prev) > 3.0), этот скачок указывает на неадаптированные данные CN-базы, и Global-набор завершается на предыдущем этапе.",
      seqDetailsTitle: "Технические детали и логика отсечки CN",

      secFceTitle: "Механики боссов FCE",
      fcePlain: "Раздел Frontier Clash Evolution объединяет оригинальные описания механик боссов из клиента игры с проверенными портретами, сгруппированными по фазам.",
      fceClarification: "Текст механик берётся напрямую из локализации игры (Game.json), а не из старых таблиц. Старые материалы могли служить ориентиром, но канонический текст на сайте извлечен из клиента.",
      fceCandidatePlain: "Парсер ищет описания в локализациях EN/RU, группирует их по фазам и сверяет с VoidCloneBossConfigDataTable_Overseas.json. Он создает файлы для проверки незарегистрированных боссов и пропущенных текстов; runtime-карточки остаются в bosses/*.json.",
      fceDetailsTitle: "Технические детали и пересборка манифеста",

      secItemsTitle: "Предметы (Items)",
      itemsPlain: "Раздел «Предметы» содержит каталог предметов для режимов Gacha и MMO, сохраняя числовой порядок разработчиков и поддерживая понятные названия.",
      itemsSourcesPlain: "MappingItemId.json является единственным источником авторских числовых ID разработчиков (NUM 1..N). Дополнительные предметы (из ST_Item_Oversea.json) добавляются строго после максимального developer ID с последовательными синтетическими номерами (maxDeveloperId + 1, maxDeveloperId + 2, ...).",
      itemsRenamePlain: "Если английское название отсутствует в ресурсах игры, Datamine использует поддерживаемый машинный перевод, сохраняя оригинальный текст игры отдельно. Ручные переименования привязываются строго к строковым ID без перезаписи ключей.",
      itemsDetailsTitle: "Технические детали и контракт идентичности",

      secMultypeTitle: "Multype (Исследовательский пайплайн)",
      multypePlain: "Multype устроен иначе, чем большинство других разделов. Нужные типы модификаторов не лежат в одной заранее известной таблице. Для их поиска используется отдельный исследовательский процесс: полный экспорт ассетов игры обходится сканером на Python.",
      multypeScannerPlain: "Полный исследовательский экспорт игровых ассетов обрабатывается отдельным автономным сканером на Python (Tower-of-fantasy-exporter-scanner). Сканер обходит экспортированные JSON-ассеты и фиксирует файлы, где реально встречаются структуры модификаторов: Properties.ModuleExtraModifierInfos, Properties.Modifiers (попадают в NoModule) и Properties.CustomApplicationRequirement[].GameplayModifierInfos.",
      multypeExampleTitle: "Почему важен ModuleExtraType (Реальный пример):",
      multypeExampleDesc: "Атрибут PhyAtkExtraUpMult встречается в разных игровых контекстах. Сканер фиксирует и атрибут, и категорию модуля:",
      multypeExample1: "• NoModule: найден в GE_BattleRobot_002_Passive, GE_Buff_Pet_CommonDamage...",
      multypeExample2: "• ModuleExtraType_Wormhole: найден в buff_War_PhyDamage_Level1, buff_Wormhole_PhyDamage_Level1...",
      multypeExampleNote: "Одного названия атрибута недостаточно: ModuleExtraType указывает, к какой группе перемножения/контексту относится модификатор.",
      multypeModesTitle: "Три режима отображения на странице Multype:",
      multypeModeDatamined: "• Datamined: исходная техническая структура и идентификаторы из набора данных сканера.",
      multypeModeRenamed: "• Renamed: Человеко-читаемые названия сообщества, привязанные к стабильным ключам баффов.",
      multypeModeCombined: "• Combined: Отображает понятное название, сохраняя первичный технический ключ на виду.",
      multypeExcelNote: "Таблица Excel (exported_v1.xlsx) является визуализацией результатов сканирования, создаваемой скриптом scanned_result_to_exel.py из module_extra_to_files_mapping3.json, а не первичным источником игры.",
      multypeScannerToolNote: "Отдельный проект exporter/scanner (Tower-of-fantasy-exporter-scanner) используется для масштабных исследований, когда нужные файлы заранее неизвестны. Такие сканы значительно тяжелее обычного обновления Datamine и не запускаются при обычных обновлениях сайта.",
      multypeDetailsTitle: "Технические результаты сканера и сравнение патчей",

      secMetaTitle: "Метаданные релиза и версии",
      metaPlain: "Архив отслеживает метаданные происхождения данных, чтобы пользователи точно знали, из какой версии клиента, ветки и момента экспорта сформированы наборы данных.",
      metaDetailsTitle: "Технические детали и происхождение метаданных",

      secNotDoTitle: "Чего этот архив не делает",
      notDo1Title: "Скриншоты не считаются авторитетными числовыми источниками.",
      notDo1Desc: "При наличии структурированных игровых данных предпочтение отдаётся им.",
      notDo2Title: "Рассчитанные значения не выдаются за сырые константы из игры.",
      notDo2Desc: "Effective HP и подобные производные показатели явно помечаются как расчетные.",
      notDo3Title: "Отсутствующая локализация не выдумывается.",
      notDo3Desc: "Если ID известен, но игрового текста нет, поле источника остается пустым.",
      notDo4Title: "Изображения боссов не угадываются наугад.",
      notDo4Desc: "Предпочтение отдается проверенным сопоставлениям, если авто-привязка ненадежна.",
      notDo5Title: "Ручные названия не перезаписывают исходные идентификаторы игры.",
      notDo5Desc: "Слой понятных переименований хранится отдельно и крепится к исходным строковым ключам.",
      notDo6Title: "Результаты сканера не выдаются за полное доказательство всех формул боя.",
      notDo6Desc: "Сканирование индексирует структуры и категории модификаторов, но не заменяет боевой симулятор.",

      secValidationTitle: "Валидация и безопасность обновлений",
      validationDesc: "Перед созданием архива пакетный экспортёр проверяет 12 групп структурированных данных. Режим Full дополнительно проверяет 3 группы изображений. Нехватка источников прерывает создание ZIP. Обработчики проверяют контракты и хеши, гарантируя, что сбой шардирования или невалидная схема никогда не повредят текущие данные сайта.",
      validationDetailsTitle: "Технические правила валидации и режимы экспорта",
      validationDetailsFullVsSmall: "Full и Small: оба режима выгружают все 27 точных правил структурированных данных. Small проверяет только изображения void и WorldBossList и использует постоянный ignore-индекс; Full выгружает все 9 групп изображений без него.",
      validationDetailsGroups: "12 проверяемых групп структурированных данных:\n1. Items: привязка ID (MappingItemId.json)\n2. Items: привязка имен (MappingItemIdAndName.json)\n3. Items: привязка редкости (MappingItemIdAndColor.json)\n4. Items: глобальная таблица строк (ST_Item_Oversea.json)\n5. Локализация EN (Game.json)\n6. Локализация RU (Game.json)\n7. OOW/Sequential: монстры HP (DT_MonsterStaticData_Overseas.json)\n8. OOW: сезоны (OriginWarSeasonConfigDataTable_Overseas.json)\n9. OOW: раунды (OriginWarRoundConfigDataTable_Overseas.json)\n10. OOW: пулы монстров (OriginWarMonsterPoolDataTable_Overseas.json)\n11. FCE: overseas-каталог боссов (VoidCloneBossConfigDataTable_Overseas.json)\n12. Метаданные версии клиента (export-version.json / config.xml)\nFull дополнительно проверяет 3 группы изображений.",

      secReproduceTitle: "Воспроизведение регулярного пайплайна",
      reproduceDesc: "Для передачи данных с игрового ПК используйте пакетный экспортёр, затем запустите обработку и проверки репозитория:",
      cmdExport: "tof-fast-datamine/RUN_EXPORT_SMALL.bat",
      cmdExportDesc: "# Точный whitelist для обычного обновления; RUN_EXPORT_FULL.bat обновляет все группы изображений",
      cmdProcess: "npm run process:datamine",
      cmdProcessDesc: "# Запускает scripts/2-process-datamine.ps1: выполняет канонические процессоры, валидирует контракт выходов и готовит заменяющий бандл",
      cmdCheck: "npm test && npm run check:datamine",
      cmdCheckDesc: "# Запускает полный сьют регрессионных тестов, проверяет 11 страниц, шапку и целостность наборов данных",
      reproduceNote: "Затем мейнтейнеры деплоят готовый бандл на рабочий сервер. Исследовательское сканирование Multype остается отдельным автономным процессом на Python.",

      secSourcesTitle: "Исходный код и инструменты",
      sourceDatamineTitle: "Сайт и пайплайн TOF Datamine",
      sourceDatamineDesc: "Исходный код этого веб-архива, структуры данных, скрипты обработки и компоненты интерфейса.",
      sourceScannerTitle: "Tower of Fantasy Exporter Scanner",
      sourceScannerDesc: "Инструменты для сканирования больших дампов игры и поиска модификаторов для исследовательских задач (таких как Multype).",
      githubLink: "Смотреть на GitHub →",

      disclaimer: "Tower of Fantasy, названия, игровые данные и визуальные материалы принадлежат соответствующим правообладателям. Это неофициальный проект сообщества, не связанный с разработчиками или издателями игры и не одобренный ими.",

      traceLabels: {
        inputs: "Источники и роли",
        processing: "Обработка и связи",
        outputs: "Выходные данные и потребители",
        gameData: "Игровые данные",
        manualData: "Поддерживается вручную",
        intermediate: "Промежуточные данные сборки",
        publicRuntime: "Данные сайта",
        processor: "Канонический процессор",
        joinKey: "Ключ связи / Отношение",
        calc: "Рассчитанные поля",
        route: "Потребитель / Маршрут"
      }
    }
  };

  const SECTION_SOURCES = {
    oow: {
      en: [
        { label: "Season", file: "OriginWarSeasonConfigDataTable_Overseas.json", desc: "Season definitions, active schedule, and dates." },
        { label: "Rounds", file: "OriginWarRoundConfigDataTable_Overseas.json", desc: "Floor configurations (F1..F30), round buffs, and drop items." },
        { label: "Monster pools", file: "OriginWarMonsterPoolDataTable_Overseas.json", desc: "Wave enemy composition and spawn allocations." },
        { label: "Monster stats", file: "DT_MonsterStaticData_Overseas.json", desc: "Base monster attributes: MaxHealth, PhyDefBase, CommonAtkBase." },
        { label: "MMO mode", file: "OriginWar*DataTable_MMO.json", desc: "Dedicated MMO season/round/pool/stat tables (separate branch, no substitution)." },
        { label: "Buff tips", file: "GameplayEffectTipsDataTable_Overseas.json", desc: "Seasonal buff descriptions and effect texts." },
        { label: "Localization", file: "Game.json (EN / RU)", desc: "Localized monster names and buff titles." }
      ],
      ru: [
        { label: "Сезоны", file: "OriginWarSeasonConfigDataTable_Overseas.json", desc: "Определение сезонов, расписание активности и даты." },
        { label: "Этажи", file: "OriginWarRoundConfigDataTable_Overseas.json", desc: "Конфигурация этажей (F1..F30), параметры баффов и награды." },
        { label: "Пулы волн", file: "OriginWarMonsterPoolDataTable_Overseas.json", desc: "Состав волн и распределение врагов." },
        { label: "Характеристики", file: "DT_MonsterStaticData_Overseas.json", desc: "Базовые параметры монстров: MaxHealth, PhyDefBase, CommonAtkBase." },
        { label: "MMO-режим", file: "OriginWar*DataTable_MMO.json", desc: "Выделенные таблицы MMO-режима (обрабатываются отдельно, без подмены)." },
        { label: "Баффы", file: "GameplayEffectTipsDataTable_Overseas.json", desc: "Описания эффектов и подсказки сезонных баффов." },
        { label: "Локализация", file: "Game.json (EN / RU)", desc: "Локализованные имена монстров и названия баффов." }
      ]
    },
    sequential: {
      en: [
        { label: "Boss stats", file: "DT_MonsterStaticData_Overseas.json", desc: "Sequential boss rows: endless_special_boss_<stage> MaxHealth." },
        { label: "Stage notes", file: "seq-mechanics-overrides.json", desc: "Verified floor mechanics notes and vulnerability adjustments." }
      ],
      ru: [
        { label: "Статы боссов", file: "DT_MonsterStaticData_Overseas.json", desc: "Строки характеристик боссов: endless_special_boss_<stage> MaxHealth." },
        { label: "Заметки этажей", file: "seq-mechanics-overrides.json", desc: "Проверенные описания механик этажей и заметки." }
      ]
    },
    fce: {
      en: [
        { label: "Boss catalog", file: "VoidCloneBossConfigDataTable_Overseas.json", desc: "Ordered overseas boss catalog and phase configurations." },
        { label: "Localization", file: "Game.json (EN / RU)", desc: "Canonical skill and mechanics text extracted directly from client localization." },
        { label: "Artwork", file: "monster-image-mapping.json & fce-index.json", desc: "Verified boss portraits." }
      ],
      ru: [
        { label: "Каталог боссов", file: "VoidCloneBossConfigDataTable_Overseas.json", desc: "Упорядоченный каталог боссов и конфигурация фаз." },
        { label: "Локализация", file: "Game.json (EN / RU)", desc: "Оригинальный текст навыков и механик напрямую из локализации клиента." },
        { label: "Портреты", file: "monster-image-mapping.json & fce-index.json", desc: "Проверенные привязки артов боссов." }
      ]
    },
    items: {
      en: [
        { label: "ID mapping", file: "MappingItemId.json", desc: "Authoritative developer numeric IDs (NUM 1..N)." },
        { label: "Names & Rarity", file: "MappingItemIdAndName.json, MappingItemIdAndColor.json", desc: "Game display titles and rarity color tiers." },
        { label: "Supplemental", file: "ST_Item_Oversea.json", desc: "Global string table items (assigned synthetic IDs maxDeveloperId + 1..)." },
        { label: "Translations", file: "curated/gacha-translations.json", desc: "Maintained machine translation fallback layer where English game text is missing." },
        { label: "Renames", file: "curated/gacha-overrides.json", desc: "Curated renames attached to stable string IDs." }
      ],
      ru: [
        { label: "ID и порядок", file: "MappingItemId.json", desc: "Авторитетный порядок числовых ID разработчиков (NUM 1..N)." },
        { label: "Имена и редкость", file: "MappingItemIdAndName.json, MappingItemIdAndColor.json", desc: "Игровые названия и цвета редкости." },
        { label: "Дополнительные", file: "ST_Item_Oversea.json", desc: "Строковая таблица Global-клиента (номера maxDeveloperId + 1..)." },
        { label: "Переводы", file: "curated/gacha-translations.json", desc: "Слой переводов там, где английский текст отсутствует в игре." },
        { label: "Переименования", file: "curated/gacha-overrides.json", desc: "Ручные уточнения названий, привязанные к строковым ID." }
      ]
    },
    multype: {
      en: [
        { label: "Asset scan", file: "Tower-of-fantasy-exporter-scanner (Python)", desc: "Deep offline scan of ModuleExtraModifierInfos, Modifiers (NoModule), and GameplayModifierInfos." },
        { label: "Rename layer", file: "renames.base.json", desc: "Community-maintained readable names attached to stable buff keys." }
      ],
      ru: [
        { label: "Сканирование", file: "Tower-of-fantasy-exporter-scanner (Python)", desc: "Глубокое сканирование ModuleExtraModifierInfos, Modifiers (NoModule) и GameplayModifierInfos." },
        { label: "Названия", file: "renames.base.json", desc: "Понятные названия сообщества, привязанные к ключам баффов." }
      ]
    }
  };

  const SECTION_PROVENANCE = {
    oow: {
      en: [
        { type: "game", tag: "GAME DATA", text: "Raw monster HP, defense, attack, floor structure, wave spawns, and buff descriptions." },
        { type: "calculated", tag: "CALCULATED", text: "Effective HP, S14+ base HP scaling (×100), difficulty curves (100%..2000%), wave HP shares." },
        { type: "curated", tag: "MANUALLY MAINTAINED", text: "Verified boss artwork mappings (no guessed portraits) and seasonal resistance schedule." }
      ],
      ru: [
        { type: "game", tag: "ИГРОВЫЕ ДАННЫЕ", text: "Сырое HP, защита, атака монстров, структура этажей, состав волн и тексты баффов." },
        { type: "calculated", tag: "РАССЧИТАНО", text: "Effective HP, базовое масштабирование HP с S14 (×100), кривые сложности (100%..2000%), доли HP по волнам." },
        { type: "curated", tag: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ", text: "Проверенные привязки артов боссов (без угадывания) и график сопротивлений сезонов." }
      ]
    },
    sequential: {
      en: [
        { type: "game", tag: "GAME DATA", text: "Raw boss HP (MaxHealth) per stage." },
        { type: "calculated", tag: "CALCULATED", text: "Effective HP (MaxHealth × 1.3471, base resistance 7500 / 34.71%) and stage-over-stage powercreep." },
        { type: "curated", tag: "MANUALLY MAINTAINED", text: "Specific stage mechanics notes and vulnerability adjustments." }
      ],
      ru: [
        { type: "game", tag: "ИГРОВЫЕ ДАННЫЕ", text: "Чистое HP боссов (MaxHealth) по этапам." },
        { type: "calculated", tag: "РАССЧИТАНО", text: "Effective HP (MaxHealth × 1.3471, базовое сопротивление 7500 / 34.71%) и прирост к предыдущему этапу." },
        { type: "curated", tag: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ", text: "Заметки по механикам этажей и ручные уточнения." }
      ]
    },
    fce: {
      en: [
        { type: "game", tag: "GAME DATA", text: "Boss identifiers, phase structure, and localized mechanics text from Game.json (not historical spreadsheets)." },
        { type: "output", tag: "GENERATED", text: "Structured per-boss mechanics extracted and grouped by phase." },
        { type: "curated", tag: "MANUALLY MAINTAINED", text: "Verified portrait bindings and curated card compositions in bosses/*.json." }
      ],
      ru: [
        { type: "game", tag: "ИГРОВЫЕ ДАННЫЕ", text: "Идентификаторы боссов, фазы и оригинальный текст навыков из Game.json (не из старых таблиц)." },
        { type: "output", tag: "СГЕНЕРИРОВАНО", text: "Структурированные механики по боссам с группировкой по фазам." },
        { type: "curated", tag: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ", text: "Проверенная привязка артов и финальная композиция карточек в bosses/*.json." }
      ]
    },
    items: {
      en: [
        { type: "game", tag: "GAME DATA", text: "Developer IDs (NUM), raw item keys, original game names, and rarity tiers." },
        { type: "calculated", tag: "TRANSLATION FALLBACK", text: "Maintained translation layer where English name is unavailable; original game text preserved separately." },
        { type: "curated", tag: "MANUALLY MAINTAINED", text: "Curated renames attached strictly to stable string IDs without altering original keys." }
      ],
      ru: [
        { type: "game", tag: "ИГРОВЫЕ ДАННЫЕ", text: "Числовые ID разработчиков (NUM), строковые ключи, оригинальные названия и редкость." },
        { type: "calculated", tag: "РЕЗЕРВНЫЙ ПЕРЕВОД", text: "Слой переводов при отсутствии английского текста; оригинальный текст игры сохранён отдельно." },
        { type: "curated", tag: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ", text: "Ручные переименования, привязанные строго к строковым ID без перезаписи ключей." }
      ]
    },
    multype: {
      en: [
        { type: "game", tag: "GAME DATA", text: "Scanned attribute names, asset relationships, and ModuleExtraType multiplier categories." },
        { type: "curated", tag: "MANUALLY MAINTAINED", text: "Human-readable community names for discovered buff structures." }
      ],
      ru: [
        { type: "game", tag: "ИГРОВЫЕ ДАННЫЕ", text: "Найденные имена атрибутов, связи ассетов и категории ModuleExtraType." },
        { type: "curated", tag: "ПОДДЕРЖИВАЕТСЯ ВРУЧНУЮ", text: "Понятные названия для найденных структур баффов." }
      ]
    }
  };

  const DATA_TRACES = {
    oow: {
      en: {
        inputs: [
          { role: "game", file: "OriginWarSeasonConfigDataTable_Overseas.json", desc: "Standard season configurations, schedule, active season dates (alias: OriginWarSeasonConfigDataTable.json)." },
          { role: "game", file: "OriginWarRoundConfigDataTable_Overseas.json", desc: "Standard floor round definitions (F1..F30), round buff definitions, drop buffs (alias: OriginWarRoundConfigDataTable.json)." },
          { role: "game", file: "OriginWarMonsterPoolDataTable_Overseas.json", desc: "Standard wave monster pool definitions and spawn allocations (alias: OriginWarMonsterPoolDataTable.json)." },
          { role: "game", file: "DT_MonsterStaticData_Overseas.json", desc: "Standard monster base stats: MaxHealth, PhyDefBase, CommonAtkBase (alias: DT_MonsterStaticData.json)." },
          { role: "game", file: "OriginWarSeasonConfigDataTable_MMO.json, OriginWarRoundConfigDataTable_MMO.json, OriginWarMonsterPoolDataTable_MMO.json, DT_MonsterStaticData_MMO.json", desc: "MMO mode dedicated season configs, round definitions, monster pools, and MMO stats (separate branch, no cross-mode substitution)." },
          { role: "game", file: "GameplayEffectTipsDataTable_Overseas.json", desc: "Buff effect tips, localization keys, and gameplay descriptions (alias: GameplayEffectTipsDataTable.json)." },
          { role: "game", file: "OriginWarMonster_Overseas.json", desc: "Difficulty scaling curve steps and daily unlock schedule (alias: OriginWarMonster.json, OriginWarMonster_Balance.json)." },
          { role: "game", file: "Hotta/Content/Localization/Game/{en,ru}/Game.json", desc: "Localized monster names and buff titles." },
          { role: "manual", file: "scripts/monster-image-mapping.json & datamine/fce/data/fce-index.json", desc: "Verified boss and mob portrait mappings (no speculative portraits)." }
        ],
        processor: "pipeline/processors/build-user-stats.js → pipeline/processors/shard-oow-data.js (synced to tof-fast-datamine/core/)",
        joinKey: "Season key (sKey / sNum) → Round (OriginSeasonID/Season & OriginRound/Round) → WaveMonsterPool[waveIdx] → PoolMonsters[].AttributeID & MonsterClass → DT_MonsterStaticData rows + GameplayEffectTips + Localization",
        calc: "Effective HP = Raw HP / (1 - Season resistance); S14+ base HP scaled ×100; floor difficulty multipliers from curves (100%..2000%); wave HP distribution",
        intermediate: "datamine/oow/data/oow_stats.json, datamine/oow/data/oow_mmo_stats.json (aggregated build states, not public runtime)",
        outputs: [
          { file: "datamine/oow/data/season_dates.json", desc: "Generated season start/end calendar dates (S1..S23+)." },
          { file: "datamine/oow/data/oow_buffs_catalog.json", desc: "Generated seasonal buff catalog and localized titles." },
          { file: "datamine/oow/data/index.json", desc: "Lightweight catalog index with season list and floor counts." },
          { file: "datamine/oow/data/current/summary.json", desc: "Active season summary payload for initial quick render." },
          { file: "datamine/oow/data/seasons/sNN.json", desc: "Standard mode floor-by-floor stats and wave monster details (S1..S23)." },
          { file: "datamine/oow/data/seasons/mmo_sNN.json", desc: "MMO mode floor-by-floor stats and wave monster details." }
        ],
        route: "/datamine/oow/"
      },
      ru: {
        inputs: [
          { role: "game", file: "OriginWarSeasonConfigDataTable_Overseas.json", desc: "Стандартная конфигурация сезонов, расписание, даты активности (алиас: OriginWarSeasonConfigDataTable.json)." },
          { role: "game", file: "OriginWarRoundConfigDataTable_Overseas.json", desc: "Стандартная конфигурация этажей (F1..F30), параметры баффов и дропа (алиас: OriginWarRoundConfigDataTable.json)." },
          { role: "game", file: "OriginWarMonsterPoolDataTable_Overseas.json", desc: "Стандартные пулы монстров и состав волн (алиас: OriginWarMonsterPoolDataTable.json)." },
          { role: "game", file: "DT_MonsterStaticData_Overseas.json", desc: "Стандартные характеристики врагов: MaxHealth, PhyDefBase, CommonAtkBase (алиас: DT_MonsterStaticData.json)." },
          { role: "game", file: "OriginWarSeasonConfigDataTable_MMO.json, OriginWarRoundConfigDataTable_MMO.json, OriginWarMonsterPoolDataTable_MMO.json, DT_MonsterStaticData_MMO.json", desc: "Выделенные таблицы MMO-режима: сезоны, раунды, пулы и базовые статы (отдельная ветка, без кросс-режимной подмены)." },
          { role: "game", file: "GameplayEffectTipsDataTable_Overseas.json", desc: "Описания эффектов и подсказки баффов (алиас: GameplayEffectTipsDataTable.json)." },
          { role: "game", file: "OriginWarMonster_Overseas.json", desc: "Кривые масштабирования сложности и график снижения (алиас: OriginWarMonster.json, OriginWarMonster_Balance.json)." },
          { role: "game", file: "Hotta/Content/Localization/Game/{en,ru}/Game.json", desc: "Локализованные имена монстров и названия баффов." },
          { role: "manual", file: "scripts/monster-image-mapping.json & datamine/fce/data/fce-index.json", desc: "Проверенные привязки портретов боссов и мобов (без угадывания портретов)." }
        ],
        processor: "pipeline/processors/build-user-stats.js → pipeline/processors/shard-oow-data.js (синхронизировано с tof-fast-datamine/core/)",
        joinKey: "Ключ сезона (sKey / sNum) → Раунд (OriginSeasonID/Season и OriginRound/Round) → WaveMonsterPool[waveIdx] → PoolMonsters[].AttributeID и MonsterClass → DT_MonsterStaticData + GameplayEffectTips + Локализация",
        calc: "Effective HP = Raw HP / (1 - Сопротивление сезона); масштабирование базы ×100 с S14; кривые сложности (100%..2000%); распределение HP по волнам",
        intermediate: "datamine/oow/data/oow_stats.json, datamine/oow/data/oow_mmo_stats.json (промежуточные агрегаты сборки)",
        outputs: [
          { file: "datamine/oow/data/season_dates.json", desc: "Сгенерированные календарные даты сезонов (S1..S23+)." },
          { file: "datamine/oow/data/oow_buffs_catalog.json", desc: "Сгенерированный каталог сезонных баффов и локализованные описания." },
          { file: "datamine/oow/data/index.json", desc: "Легковесный индекс каталога со списком сезонов и количеством этажей." },
          { file: "datamine/oow/data/current/summary.json", desc: "Сводный пейлоад текущего сезона для быстрой отрисовки." },
          { file: "datamine/oow/data/seasons/sNN.json", desc: "Поэтажные характеристики стандартного режима и враги по волнам (S1..S23)." },
          { file: "datamine/oow/data/seasons/mmo_sNN.json", desc: "Поэтажные характеристики MMO-режима и враги по волнам." }
        ],
        route: "/datamine/oow/"
      }
    },
    sequential: {
      en: {
        inputs: [
          { role: "game", file: "DT_MonsterStaticData_Overseas.json", desc: "Sequential boss stat rows: endless_special_boss_<stage> MaxHealth (fallback: DT_MonsterStaticData.json)." },
          { role: "manual", file: "datamine/seq/data/seq-mechanics-overrides.json", desc: "Verified floor mechanics, special vulnerabilities, and notes." }
        ],
        processor: "pipeline/processors/build-seq-data.js (synced to tof-fast-datamine/core/)",
        joinKey: "Stage number N (1..100) → Row key endless_special_boss_<stage>",
        calc: "Global Cutoff: stage loop halts when MaxHealth(N) / MaxHealth(N-1) > 3.0 (unscaled CN anomaly); Base EHP = MaxHealth × 1.3471 (34.71% resist)",
        intermediate: "None (processed directly from raw game tables into cached cache format)",
        outputs: [
          { file: "datamine/seq/data/seq-boss-cache.json", desc: "Pre-calculated HP, EHP, stage progression, and boss stats." },
          { file: "datamine/seq/data/seq-stage-limit.txt", desc: "Authoritative active Global stage limit integer." },
          { file: "datamine/seq/data/DT_MonsterStaticData_Overseas.json", desc: "Target raw table copy for offline audit." },
          { file: "datamine/seq/data/seq-mechanics-overrides.json", desc: "Stage mechanics and floor override data." }
        ],
        route: "/datamine/seq/"
      },
      ru: {
        inputs: [
          { role: "game", file: "DT_MonsterStaticData_Overseas.json", desc: "Строки характеристик боссов: endless_special_boss_<stage> MaxHealth (fallback: DT_MonsterStaticData.json)." },
          { role: "manual", file: "datamine/seq/data/seq-mechanics-overrides.json", desc: "Проверенные описания механик этажей, уязвимостей и заметок." }
        ],
        processor: "pipeline/processors/build-seq-data.js (синхронизировано с tof-fast-datamine/core/)",
        joinKey: "Номер этажа N (1..100) → Ключ строки endless_special_boss_<stage>",
        calc: "Отсечка CN: сканирование останавливается при MaxHealth(N) / MaxHealth(N-1) > 3.0; Base EHP = MaxHealth × 1.3471 (резист 34.71%)",
        intermediate: "Отсутствуют (прямая компиляция из сырых таблиц в кэш)",
        outputs: [
          { file: "datamine/seq/data/seq-boss-cache.json", desc: "Предрассчитанные HP, EHP, шкала прогрессии и параметры боссов." },
          { file: "datamine/seq/data/seq-stage-limit.txt", desc: "Число максимального доступного этажа Глобала." },
          { file: "datamine/seq/data/DT_MonsterStaticData_Overseas.json", desc: "Копия исходной таблицы для аудита." },
          { file: "datamine/seq/data/seq-mechanics-overrides.json", desc: "Описания механик и переопределения этажей." }
        ],
        route: "/datamine/seq/"
      }
    },
    fce: {
      en: {
        inputs: [
          { role: "game", file: "Hotta/Content/Localization/Game/{en,ru}/Game.json", desc: "In-game ability titles and mechanic descriptions (scanned for boss.*des keys)." },
          { role: "game", file: "VoidCloneBossConfigDataTable_Overseas.json", desc: "Ordered boss catalog and configuration (fallback: VoidCloneBossConfigDataTable.json)." },
          { role: "game", file: "Hotta/Content/Resources/UI/plugin/FB/bigmon/*.png & void/boss/*.png", desc: "Raw boss illustration and icon textures." },
          { role: "manual", file: "datamine/fce/data/bosses/*.json", desc: "Curated individual boss card files: structure, phase grouping, and card layout." }
        ],
        processor: "pipeline/processors/parse-fce-mechanics.js → pipeline/processors/build-fce-index.js",
        joinKey: "Boss number parsed from localization key boss(?:_hum)?_?0*(\\d+) → VoidCloneBossConfigDataTable config → Boss card slug (datamine/fce/data/bosses/<slug>.json)",
        calc: "384px card preview generation (scripts/generate-fce-previews.ps1); manifest ordering preservation",
        intermediate: "fce-unregistered-bosses.json, fce-missing-loc-texts.json (audit/review outputs, not runtime)",
        outputs: [
          { file: "datamine/fce/data/fce-index.json", desc: "Lightweight manifest index of all registered bosses." },
          { file: "datamine/fce/data/bosses/<slug>.json", desc: "Lazy-loaded individual boss mechanics card payloads." },
          { file: "datamine/fce/assets/bosses-preview/*.png", desc: "Optimized card preview artwork." }
        ],
        route: "/datamine/fce/"
      },
      ru: {
        inputs: [
          { role: "game", file: "Hotta/Content/Localization/Game/{en,ru}/Game.json", desc: "Внутриигровые названия способностей и описания механик (сканирование ключей boss.*des)." },
          { role: "game", file: "VoidCloneBossConfigDataTable_Overseas.json", desc: "Каталог и конфигурация боссов в каноническом порядке (fallback: VoidCloneBossConfigDataTable.json)." },
          { role: "game", file: "Hotta/Content/Resources/UI/plugin/FB/bigmon/*.png & void/boss/*.png", desc: "Оригинальные текстуры иллюстраций и иконок боссов." },
          { role: "manual", file: "datamine/fce/data/bosses/*.json", desc: "Индивидуальные карточки боссов: структура, фазы и композиция." }
        ],
        processor: "pipeline/processors/parse-fce-mechanics.js → pipeline/processors/build-fce-index.js",
        joinKey: "Номер босса из ключа локализации boss(?:_hum)?_?0*(\\d+) → Конфигурация VoidCloneBossConfigDataTable → Slug карточки (datamine/fce/data/bosses/<slug>.json)",
        calc: "Генерация 384px превью (scripts/generate-fce-previews.ps1); сохранение порядка каталога",
        intermediate: "fce-unregistered-bosses.json, fce-missing-loc-texts.json (файлы аудита и проверки)",
        outputs: [
          { file: "datamine/fce/data/fce-index.json", desc: "Легковесный индекс-манифест всех зарегистрированных боссов." },
          { file: "datamine/fce/data/bosses/<slug>.json", desc: "Лениво подгружаемые карточки механик конкретного босса." },
          { file: "datamine/fce/assets/bosses-preview/*.png", desc: "Оптимизированные превью-иллюстрации карточек." }
        ],
        route: "/datamine/fce/"
      }
    },
    items: {
      en: {
        inputs: [
          { role: "game", file: "MappingItemId.json", desc: "Authoritative developer numeric ID dictionary ({ [stringId]: numId })." },
          { role: "game", file: "MappingItemIdAndName.json", desc: "Numeric developer ID to original internal name." },
          { role: "game", file: "MappingItemIdAndColor.json", desc: "Numeric developer ID to item rarity/quality color." },
          { role: "game", file: "ST_Item_Oversea.json", desc: "Global StringTable with localized item titles and supplemental items." },
          { role: "game", file: "ST_Item_MMO.json, CookingFoodDataTable_MMO.json, DT_LifeJob_*.json", desc: "MMO item definitions, recipes, and gathering tables." },
          { role: "manual", file: "datamine/items/curated/gacha-overrides.json", desc: "Community renames keyed strictly by string item IDs." },
          { role: "manual", file: "datamine/items/curated/mmo-overrides.json", desc: "MMO item community renames keyed by string item IDs." }
        ],
        processor: "pipeline/processors/build-items-json.js (synced to tof-fast-datamine/core/)",
        joinKey: "MappingItemId string ID → Developer NUM; num → nameMap/colorMap; ST_Item_Oversea enriches existing dev rows; supplemental items assigned synthetic IDs starting at maxDeveloperId + 1",
        calc: "Developer rows sorted numeric ascending (NUM 1..N) and placed first; supplemental items appended after maxDeveloperId; curated renames preserved by string ID across re-exports",
        intermediate: "None (processed directly from raw mapping files and curated layers)",
        outputs: [
          { file: "datamine/items/data/merged_mapping_with_original.json", desc: "Complete Gacha item dataset with developer NUMs (1..N) and renames." },
          { file: "datamine/items/data/merged_mapping_with_original_mmo.json", desc: "Complete MMO item dataset." }
        ],
        route: "/datamine/items/"
      },
      ru: {
        inputs: [
          { role: "game", file: "MappingItemId.json", desc: "Авторитетный словарь числовых ID разработчиков ({ [stringId]: numId })." },
          { role: "game", file: "MappingItemIdAndName.json", desc: "Числовой developer ID в оригинальное имя игры." },
          { role: "game", file: "MappingItemIdAndColor.json", desc: "Числовой developer ID в цвет редкости предмета." },
          { role: "game", file: "ST_Item_Oversea.json", desc: "Таблица строк с локализованными именами и дополнительными предметами." },
          { role: "game", file: "ST_Item_MMO.json, CookingFoodDataTable_MMO.json, DT_LifeJob_*.json", desc: "Таблицы предметов MMO, рецептов и сбора профессий." },
          { role: "manual", file: "datamine/items/curated/gacha-overrides.json", desc: "Понятные переименования, привязанные строго к строковым ID." },
          { role: "manual", file: "datamine/items/curated/mmo-overrides.json", desc: "Понятные переименования предметов MMO по строковым ID." }
        ],
        processor: "pipeline/processors/build-items-json.js (синхронизировано с tof-fast-datamine/core/)",
        joinKey: "Строковый ID MappingItemId → Числовой NUM разработчиков; num → nameMap/colorMap; ST_Item_Oversea обогащает существующие строки; дополнительные предметы нумеруются с maxDeveloperId + 1",
        calc: "Строки разработчиков сортируются по возрастанию числа (NUM 1..N) и идут первыми; дополнительные предметы добавляются после maxDeveloperId; ручные переименования сохраняются по строковому ID",
        intermediate: "Отсутствуют (прямая компиляция из сырых таблиц и слоя переименований)",
        outputs: [
          { file: "datamine/items/data/merged_mapping_with_original.json", desc: "Полный набор гача-предметов с авторскими NUM (1..N) и переименованиями." },
          { file: "datamine/items/data/merged_mapping_with_original_mmo.json", desc: "Полный набор предметов MMO." }
        ],
        route: "/datamine/items/"
      }
    },
    multype: {
      en: {
        inputs: [
          { role: "game", file: "Full exported Unreal asset dataset (JSON assets)", desc: "Broad game asset export containing character, gear, and combat assets." },
          { role: "manual", file: "datamine/multype/data/renames.base.json", desc: "Community-maintained readable names for technical buff keys." }
        ],
        processor: "Tower-of-fantasy-exporter-scanner (main_scanning_files.py) → Offline Python scanning pipeline (distinct from routine Node.js pipeline)",
        joinKey: "AttributeName (e.g. PhyAtkExtraUpMult) × ModuleExtraType (e.g. NoModule, ModuleExtraType_Wormhole) × Asset Filename",
        calc: "Recursive scanner indexing of Properties.ModuleExtraModifierInfos and Properties.Modifiers; patch diff generation",
        intermediate: "unique_attributes_sorted.json, attribute_files_map1.json, attribute_to_module_mapping2.json (scanner research maps)",
        outputs: [
          { file: "datamine/multype/data/module_extra_to_files_mapping3.json", desc: "Primary Module → Attribute → [files] multi-multiplier matrix." },
          { file: "datamine/multype/data/renames.base.json", desc: "Display renames mapping for buff keys." },
          { file: "datamine/multype/data/version.txt", desc: "Scanner scan timestamp and export provenance." }
        ],
        route: "/datamine/multype/ (in-memory dataset via datamine-multype-core.js + windowed column virtualization via multype-column-window.js)"
      },
      ru: {
        inputs: [
          { role: "game", file: "Полная выгрузка игровых Unreal-ассетов (JSON)", desc: "Широкий экспорт ассетов игры, содержащий файлы персонажей, экипировки и боевой системы." },
          { role: "manual", file: "datamine/multype/data/renames.base.json", desc: "Поддерживаемые вручную понятные названия для технических ключей баффов." }
        ],
        processor: "Tower-of-fantasy-exporter-scanner (main_scanning_files.py) → Автономный Python-пайплайн сканирования (отдельный от регулярного Node.js)",
        joinKey: "AttributeName (напр. PhyAtkExtraUpMult) × ModuleExtraType (напр. NoModule, ModuleExtraType_Wormhole) × Имя файла ассета",
        calc: "Рекурсивное сканирование Properties.ModuleExtraModifierInfos и Properties.Modifiers; построение разницы патчей",
        intermediate: "unique_attributes_sorted.json, attribute_files_map1.json, attribute_to_module_mapping2.json (исследовательские карты сканера)",
        outputs: [
          { file: "datamine/multype/data/module_extra_to_files_mapping3.json", desc: "Основная матрица перемножения Модуль → Атрибут → [файлы]." },
          { file: "datamine/multype/data/renames.base.json", desc: "Словарь отображаемых названий баффов." },
          { file: "datamine/multype/data/version.txt", desc: "Временная метка и происхождение скана." }
        ],
        route: "/datamine/multype/ (полная модель в памяти через datamine-multype-core.js + оконная виртуализация колонок через multype-column-window.js)"
      }
    },
    meta: {
      en: {
        inputs: [
          { role: "game", file: "raw_exports/export-version.json", desc: "Raw client version, branch identifier (e.g. TestPC_KR2New), and timestamp extracted by Script 1 from launcher config.xml." },
          { role: "manual", file: "pipeline/build/generate-release-manifest.js", desc: "Canonical branch provenance mapping (BRANCH_NAMES_MAP: TestPC_KR2New → Korea Dev 1, TestPC_KRNew → Korea Dev 2)." }
        ],
        processor: "pipeline/build/generate-release-manifest.js",
        joinKey: "Branch identifier → Canonical client display labels; dataset summary entity counters",
        calc: "Snapshot metadata normalization; dataset entity counting (OOW seasons, FCE bosses, Sequential stages, Items, Multype)",
        intermediate: "None (produces authoritative manifest and compatible projections)",
        outputs: [
          { file: "datamine/release-manifest.json", desc: "Authoritative snapshot metadata, build status, and sources." },
          { file: "datamine/data/export-version.json", desc: "Compatibility projection for legacy consumers." },
          { file: "datamine/data/datamine-summary.json", desc: "Dataset summary metrics for Hub and metadata consumers." }
        ],
        route: "Header Export Details, /datamine/about/, /datamine/changelog/, /datamine/ (Supplemental /datamine/data/live-global-version.json provides the daily Global version)"
      },
      ru: {
        inputs: [
          { role: "game", file: "raw_exports/export-version.json", desc: "Исходная версия клиента, ветка (напр. TestPC_KR2New) и timestamp, извлеченные Скриптом 1 из лаунчера config.xml." },
          { role: "manual", file: "pipeline/build/generate-release-manifest.js", desc: "Канонический маппинг веток (BRANCH_NAMES_MAP: TestPC_KR2New → Корея Dev 1, TestPC_KRNew → Корея Dev 2)." }
        ],
        processor: "pipeline/build/generate-release-manifest.js",
        joinKey: "Идентификатор ветки → Канонические названия клиентов; подсчёт сущностей датасетов",
        calc: "Нормализация снимка; подсчёт сущностей (сезоны OOW, боссы FCE, этажи Sequential, предметы, Multype)",
        intermediate: "Отсутствуют (создаёт авторитетный манифест и проекции совместимости)",
        outputs: [
          { file: "datamine/release-manifest.json", desc: "Авторитетные метаданные снимка, статус сборки и источники." },
          { file: "datamine/data/export-version.json", desc: "Проекция совместимости для существующих потребителей." },
          { file: "datamine/data/datamine-summary.json", desc: "Сводные метрики датасетов для главного хаба и мета-потребителей." }
        ],
        route: "Шапка Export Details, /datamine/about/, /datamine/changelog/, /datamine/ (файл /datamine/data/live-global-version.json предоставляет ежедневную версию Global)"
      }
    }
  };

  function getLanguage() {
    if (typeof window !== "undefined") {
      if (window.DatamineI18n && typeof window.DatamineI18n.getLanguage === "function") {
        return window.DatamineI18n.getLanguage();
      }
      if (window.DatamineHeader && typeof window.DatamineHeader.getLanguage === "function") {
        return window.DatamineHeader.getLanguage();
      }
    }
    if (typeof document !== "undefined") {
      const cookie = document.cookie.split("; ").find((row) => row.startsWith("tof-datamine-language="));
      if (cookie) {
        const val = cookie.split("=")[1];
        if (val === "ru" || val === "en") return val;
      }
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("tof-datamine-language");
        if (stored === "ru" || stored === "en") return stored;
      }
      return document.documentElement.lang === "ru" ? "ru" : "en";
    }
    return "en";
  }

  function getExportMeta() {
    if (typeof window !== "undefined" && window.DatamineHeader && typeof window.DatamineHeader.getExportMeta === "function") {
      return window.DatamineHeader.getExportMeta();
    }
    if (typeof window !== "undefined" && window.DatamineMeta && typeof window.DatamineMeta.getSync === "function") {
      return window.DatamineMeta.getSync();
    }
    return {
      version: "unavailable", sources: [], lastUpdate: "—", lastUpdateIso: "", available: false
    };
  }

  function renderSourceList(items) {
    if (!items || !items.length) return "";
    return `
      <div class="about-source-list">
        ${items.map((it) => `
          <div class="about-source-row">
            <span class="about-source-row__label">${it.label}</span>
            <div class="about-source-row__content">
              <span class="about-source-row__file">${it.file}</span>
              <span class="about-source-row__desc">${it.desc}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderProvenanceGrid(items) {
    if (!items || !items.length) return "";
    return `
      <div class="about-provenance-grid">
        ${items.map((it) => `
          <div class="about-provenance-col">
            <span class="about-provenance-col__tag about-tag--${it.type}">${it.tag}</span>
            <p class="about-provenance-col__text">${it.text}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderDataTraceCard(key, lang, labels) {
    const trace = (DATA_TRACES[key] && DATA_TRACES[key][lang]) || (DATA_TRACES[key] && DATA_TRACES[key].en);
    if (!trace) return "";

    const inputsHtml = trace.inputs.map((item) => {
      const tagClass = item.role === "game" ? "about-tag--game" : "about-tag--curated";
      const tagText = item.role === "game" ? labels.gameData : labels.manualData;
      return `
        <div class="about-trace-flow__item">
          <span class="about-tag ${tagClass}">${tagText}</span>
          <span class="about-trace-flow__code">${item.file}</span>
          <span class="about-trace-flow__desc">${item.desc}</span>
        </div>
      `;
    }).join("");

    const outputsHtml = trace.outputs.map((item) => {
      return `
        <div class="about-trace-flow__item">
          <span class="about-tag about-tag--output">${labels.publicRuntime}</span>
          <span class="about-trace-flow__code">${item.file}</span>
          <span class="about-trace-flow__desc">${item.desc}</span>
        </div>
      `;
    }).join("");

    const intermediateRow = trace.intermediate && trace.intermediate !== "None" && trace.intermediate !== "Отсутствуют"
      ? `<div class="about-trace-flow__meta-row"><span class="about-trace-flow__meta-key">${labels.intermediate}:</span> <span class="about-trace-flow__meta-val">${trace.intermediate}</span></div>`
      : "";

    return `
      <div class="about-trace-flow">
        <div class="about-trace-flow__section">
          <div class="about-trace-flow__section-title">${labels.inputs}</div>
          <div class="about-trace-flow__list">
            ${inputsHtml}
          </div>
        </div>

        <div class="about-trace-flow__section">
          <div class="about-trace-flow__section-title">${labels.processing}</div>
          <div class="about-trace-flow__details">
            <div class="about-trace-flow__meta-row"><span class="about-trace-flow__meta-key">${labels.processor}:</span> <span class="about-trace-flow__meta-val about-trace-flow__code">${trace.processor}</span></div>
            <div class="about-trace-flow__meta-row"><span class="about-trace-flow__meta-key">${labels.joinKey}:</span> <span class="about-trace-flow__meta-val">${trace.joinKey}</span></div>
            <div class="about-trace-flow__meta-row"><span class="about-trace-flow__meta-key">${labels.calc}:</span> <span class="about-trace-flow__meta-val">${trace.calc}</span></div>
            ${intermediateRow}
          </div>
        </div>

        <div class="about-trace-flow__section">
          <div class="about-trace-flow__section-title">${labels.outputs}</div>
          <div class="about-trace-flow__list">
            ${outputsHtml}
          </div>
          <div class="about-trace-flow__consumer-row">
            <span class="about-trace-flow__meta-key">${labels.route}:</span> <strong>${trace.route}</strong>
          </div>
        </div>
      </div>
    `;
  }

  let scrollSpyCleanup = null;

  function initTocObserver() {
    if (scrollSpyCleanup) {
      scrollSpyCleanup();
      scrollSpyCleanup = null;
    }

    const targetIds = [
      "overview",
      "basics",
      "extraction",
      "pipeline",
      "oow",
      "sequential",
      "fce",
      "items",
      "multype",
      "meta",
      "curation",
      "validation",
      "reproduce",
      "sources"
    ];
    const sections = targetIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const tocLinks = Array.from(document.querySelectorAll(".about-toc__link"));
    const inlineLinks = Array.from(document.querySelectorAll(".about-inline-toc__links a"));

    if (!sections.length || (!tocLinks.length && !inlineLinks.length)) return;

    let currentActiveId = "";
    let isProgrammaticScroll = false;
    let scrollTimer = null;

    function updateActiveState(activeId, updateHash = true) {
      if (!activeId || activeId === currentActiveId) return;
      currentActiveId = activeId;

      tocLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("about-toc__link--active", href === `#${activeId}`);
      });
      inlineLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("about-toc__link--active", href === `#${activeId}`);
      });

      if (updateHash && typeof window !== "undefined" && window.history && window.history.replaceState) {
        const newHash = activeId === "overview" ? "" : `#${activeId}`;
        const newUrl = window.location.pathname + window.location.search + newHash;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, "", newUrl);
        }
      }
    }

    function handleScroll() {
      if (isProgrammaticScroll) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (windowHeight + scrollY >= documentHeight - 80) {
        const lastSec = sections[sections.length - 1];
        if (lastSec) {
          updateActiveState(lastSec.id, true);
          return;
        }
      }

      if (scrollY < 120) {
        updateActiveState("overview", true);
        return;
      }

      const headerOffset = 110;
      let targetId = "overview";

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const rect = sec.getBoundingClientRect();
        if (rect.top <= headerOffset) {
          targetId = sec.id;
        } else {
          break;
        }
      }

      if (targetId) {
        updateActiveState(targetId, true);
      }
    }

    let rafId = null;
    function onScrollThrottled() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    }

    function onLinkClick(e) {
      const link = e.target.closest("a[href^='#']");
      if (!link) return;
      const targetId = link.getAttribute("href").slice(1);
      if (targetId === "overview") {
        e.preventDefault();
        isProgrammaticScroll = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        updateActiveState("overview", true);

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          isProgrammaticScroll = false;
          handleScroll();
        }, 800);
        return;
      }
      const targetElement = document.getElementById(targetId);
      if (!targetElement) return;

      e.preventDefault();
      const headerOffset = 80;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      isProgrammaticScroll = true;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      updateActiveState(targetId, true);

      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isProgrammaticScroll = false;
        handleScroll();
      }, 800);
    }

    window.addEventListener("scroll", onScrollThrottled, { passive: true });
    document.addEventListener("click", onLinkClick);

    const initialHash = window.location.hash.slice(1);
    if (initialHash && initialHash !== "overview" && document.getElementById(initialHash)) {
      updateActiveState(initialHash, false);
    } else {
      updateActiveState("overview", false);
    }

    scrollSpyCleanup = () => {
      window.removeEventListener("scroll", onScrollThrottled);
      document.removeEventListener("click", onLinkClick);
      clearTimeout(scrollTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }

  function renderAboutPage() {
    const lang = getLanguage();
    const t = ABOUT_CONTENT[lang] || ABOUT_CONTENT.en;
    const meta = getExportMeta();

    document.title = t.metaTitle;
    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) metaDescTag.setAttribute("content", t.metaDesc);

    const sourceDisplay = (meta.sources || []).map((source) => `${lang === "ru" ? (source.clientRu || source.client) : source.client} — ${source.branch}`).join("; ") || t.unavailable;
    const snapshotDisplay = meta.available ? meta.version : t.unavailable;
    const liveGlobalDisplay = window.DatamineHeader?.getGlobalVersion?.() || t.unavailable;

    const formattedExportDate = window.DatamineMeta && typeof window.DatamineMeta.formatSnapshotDate === "function"
      ? window.DatamineMeta.formatSnapshotDate(meta.exportedAt || meta.lastUpdateIso || meta.lastUpdate, lang)
      : (meta.lastUpdate || "—");

    const root = document.querySelector("[data-about-app]");
    if (!root) return;

    const tocGroups = [
      {
        groupLabel: t.tocGroupBasics,
        items: [
          { id: "overview", label: t.tocOverview },
          { id: "basics", label: t.tocBasics },
          { id: "extraction", label: t.tocExtraction }
        ]
      },
      {
        groupLabel: t.tocGroupDatasets,
        items: [
          { id: "pipeline", label: t.tocPipeline },
          { id: "oow", label: t.tocOow },
          { id: "sequential", label: t.tocSeq },
          { id: "fce", label: t.tocFce },
          { id: "items", label: t.tocItems },
          { id: "multype", label: t.tocMultype },
          { id: "meta", label: t.tocMeta }
        ]
      },
      {
        groupLabel: t.tocGroupSafety,
        items: [
          { id: "curation", label: t.tocCuration },
          { id: "validation", label: t.tocValidation },
          { id: "reproduce", label: t.tocReproduce },
          { id: "sources", label: t.tocSources }
        ]
      }
    ];

    const tocListHtml = tocGroups
      .map((grp) => {
        const links = grp.items
          .map((entry) => `<a class="about-toc__link" href="#${entry.id}">${entry.label}</a>`)
          .join("");
        return `
          <div class="about-toc__group-label">${grp.groupLabel}</div>
          ${links}
        `;
      })
      .join("");

    const inlineTocHtml = tocGroups
      .map((grp) => {
        return grp.items
          .map((entry) => `<a href="#${entry.id}">${entry.label}</a>`)
          .join("");
      })
      .join("");

    root.innerHTML = `
      <div class="about-container">
        <!-- Main Article Column -->
        <article class="about-article">
          <!-- Hero -->
          <header class="about-hero" id="overview">
            <p class="about-hero__eyebrow">${t.heroEyebrow}</p>
            <h1 class="about-hero__title">${t.heroTitle}</h1>
            <p class="about-hero__subtitle">${t.heroSubtitle}</p>
          </header>

          <!-- Dynamic Data Snapshot Strip -->
          <aside class="about-snapshot" aria-label="${t.snapshotLabel}">
            <div class="about-snapshot__header">
              <span class="about-snapshot__label">${t.snapshotLabel}</span>
            </div>
            <div class="about-snapshot__grid">
              <div class="about-snapshot__item">
                <span class="about-snapshot__key">${t.snapshotVersion}</span>
                <strong class="about-snapshot__val">${snapshotDisplay}</strong>
              </div>
              <div class="about-snapshot__item">
                <span class="about-snapshot__key">${t.snapshotClient}</span>
                <strong class="about-snapshot__val">${sourceDisplay}</strong>
              </div>
              <div class="about-snapshot__item">
                <span class="about-snapshot__key">${t.snapshotExport}</span>
                <strong class="about-snapshot__val">${formattedExportDate}</strong>
              </div>
              <div class="about-snapshot__item">
                <span class="about-snapshot__key">${t.snapshotLive}</span>
                <strong class="about-snapshot__val">${liveGlobalDisplay}</strong>
              </div>
            </div>
          </aside>

          <!-- Mobile / Tablet Inline TOC -->
          <nav class="about-inline-toc" aria-label="${t.tocTitle}">
            <span class="about-inline-toc__title">${t.tocTitle}:</span>
            <div class="about-inline-toc__links">
              ${inlineTocHtml}
            </div>
          </nav>

          <!-- Overview Prose & Restrained Legend -->
          <section class="about-section">
            <div class="about-prose">
              <p><strong>${t.intro1}</strong></p>
              <p>${t.intro2}</p>
            </div>

            <div class="about-legend" role="region" aria-label="${t.dataTypesAria}">
              <div class="about-legend__item">
                <span class="about-legend__label about-legend__label--game">${t.badgeGame}</span>
                <span class="about-legend__desc">${t.badgeGameDesc}</span>
              </div>
              <div class="about-legend__item">
                <span class="about-legend__label about-legend__label--calculated">${t.badgeCalc}</span>
                <span class="about-legend__desc">${t.badgeCalcDesc}</span>
              </div>
              <div class="about-legend__item">
                <span class="about-legend__label about-legend__label--curated">${t.badgeCurated}</span>
                <span class="about-legend__desc">${t.badgeCuratedDesc}</span>
              </div>
              <div class="about-legend__item">
                <span class="about-legend__label about-legend__label--output">${t.badgeRuntime}</span>
                <span class="about-legend__desc">${t.badgeRuntimeDesc}</span>
              </div>
            </div>
          </section>

          <!-- Section: Terminology (Basics) -->
          <section class="about-section" id="basics">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secTerminologyTitle}
                <a class="about-anchor-link" href="#basics" aria-label="${t.permalinkLabel}: ${t.secTerminologyTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.secTerminologyIntro}</p>
            </div>
            <div class="about-glossary">
              <div class="about-glossary__card">
                <div class="about-glossary__term">PAK</div>
                <div class="about-glossary__desc">${t.glossaryPak}</div>
              </div>
              <div class="about-glossary__card">
                <div class="about-glossary__term">UASSET</div>
                <div class="about-glossary__desc">${t.glossaryUasset}</div>
              </div>
              <div class="about-glossary__card">
                <div class="about-glossary__term">LOCRES</div>
                <div class="about-glossary__desc">${t.glossaryLocres}</div>
              </div>
              <div class="about-glossary__card">
                <div class="about-glossary__term">JSON</div>
                <div class="about-glossary__desc">${t.glossaryJson}</div>
              </div>
              <div class="about-glossary__card">
                <div class="about-glossary__term">PNG</div>
                <div class="about-glossary__desc">${t.glossaryPng}</div>
              </div>
            </div>
          </section>

          <!-- Section: Two Ways We Find Data (Extraction) -->
          <section class="about-section" id="extraction">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secTwoWaysTitle}
                <a class="about-anchor-link" href="#extraction" aria-label="${t.permalinkLabel}: ${t.secTwoWaysTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.twoWaysIntro}</p>
            </div>
            <div class="about-two-ways">
              <div class="about-way-col">
                <div class="about-way-col__header">
                  <h3 class="about-way-col__title">${t.way1Title}</h3>
                </div>
                <div class="about-way-col__tagline">${t.way1Tagline}</div>
                <p class="about-way-col__desc">${t.way1Desc}</p>
              </div>
              <div class="about-way-col">
                <div class="about-way-col__header">
                  <h3 class="about-way-col__title">${t.way2Title}</h3>
                </div>
                <div class="about-way-col__tagline">${t.way2Tagline}</div>
                <p class="about-way-col__desc">${t.way2Desc}</p>
              </div>
            </div>
          </section>

          <!-- Section: Regular Pipeline Flow -->
          <section class="about-section" id="pipeline">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secPipelineTitle}
                <a class="about-anchor-link" href="#pipeline" aria-label="${t.permalinkLabel}: ${t.secPipelineTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.secPipelineIntro}</p>
            </div>
            <div class="about-timeline">
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step1Title}</h4>
                  <p class="about-timeline-step__desc">${t.step1Desc}</p>
                </div>
              </div>
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step2Title}</h4>
                  <p class="about-timeline-step__desc">${t.step2Desc}</p>
                </div>
              </div>
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step3Title}</h4>
                  <p class="about-timeline-step__desc">${t.step3Desc}</p>
                </div>
              </div>
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step4Title}</h4>
                  <p class="about-timeline-step__desc">${t.step4Desc}</p>
                </div>
              </div>
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step5Title}</h4>
                  <p class="about-timeline-step__desc">${t.step5Desc}</p>
                </div>
              </div>
              <div class="about-timeline-step">
                <div class="about-timeline-step__marker">
                  <span class="about-timeline-step__dot"></span>
                  <span class="about-timeline-step__line"></span>
                </div>
                <div class="about-timeline-step__body">
                  <h4 class="about-timeline-step__title">${t.step6Title}</h4>
                  <p class="about-timeline-step__desc">${t.step6Desc}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Origin of War -->
          <section class="about-section" id="oow">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secOowTitle}
                <a class="about-anchor-link" href="#oow" aria-label="${t.permalinkLabel}: ${t.secOowTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.oowPlain}</p>
              ${renderSourceList(SECTION_SOURCES.oow[lang])}
              ${renderProvenanceGrid(SECTION_PROVENANCE.oow[lang])}
              <p>${t.oowCalcNote}</p>
              <div class="about-formula">
                Season resistance = verified schedule (40% in S1 to 85.01% in S14+ & MMO)<br>
                Effective HP = Raw HP / (1 - Season resistance)
              </div>
              <p>${t.oowCuratedNote}</p>
            </div>
            <details class="about-details">
              <summary>${t.oowDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("oow", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: Sequential -->
          <section class="about-section" id="sequential">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secSeqTitle}
                <a class="about-anchor-link" href="#sequential" aria-label="${t.permalinkLabel}: ${t.secSeqTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.seqPlain}</p>
              ${renderSourceList(SECTION_SOURCES.sequential[lang])}
              ${renderProvenanceGrid(SECTION_PROVENANCE.sequential[lang])}
              <p>${t.seqCutoffPlain}</p>
              <div class="about-formula">
                Ratio = MaxHealth(Stage N) / MaxHealth(Stage N - 1)<br>
                if Ratio > 3.0 → Cutoff detected at Stage N - 1
              </div>
            </div>
            <details class="about-details">
              <summary>${t.seqDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("sequential", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: FCE Boss Mechanics -->
          <section class="about-section" id="fce">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secFceTitle}
                <a class="about-anchor-link" href="#fce" aria-label="${t.permalinkLabel}: ${t.secFceTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.fcePlain}</p>
              ${renderSourceList(SECTION_SOURCES.fce[lang])}
              ${renderProvenanceGrid(SECTION_PROVENANCE.fce[lang])}
              <p><strong>${t.fceClarification}</strong></p>
              <p>${t.fceCandidatePlain}</p>
            </div>
            <details class="about-details">
              <summary>${t.fceDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("fce", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: Items -->
          <section class="about-section" id="items">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secItemsTitle}
                <a class="about-anchor-link" href="#items" aria-label="${t.permalinkLabel}: ${t.secItemsTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.itemsPlain}</p>
              ${renderSourceList(SECTION_SOURCES.items[lang])}
              ${renderProvenanceGrid(SECTION_PROVENANCE.items[lang])}
              <p>${t.itemsSourcesPlain}</p>
              <p>${t.itemsRenamePlain}</p>
            </div>
            <details class="about-details">
              <summary>${t.itemsDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("items", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: Multype (Research Pipeline) -->
          <section class="about-section" id="multype">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secMultypeTitle}
                <a class="about-anchor-link" href="#multype" aria-label="${t.permalinkLabel}: ${t.secMultypeTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.multypePlain}</p>
              ${renderSourceList(SECTION_SOURCES.multype[lang])}
              ${renderProvenanceGrid(SECTION_PROVENANCE.multype[lang])}
              <p>${t.multypeScannerPlain}</p>
              <p><strong>${t.multypeExampleTitle}</strong> ${t.multypeExampleDesc}</p>
              <div class="about-code-block">
                <strong>Attribute: PhyAtkExtraUpMult</strong><br>
                ${t.multypeExample1}<br>
                ${t.multypeExample2}
              </div>
              <p>${t.multypeExampleNote}</p>
              <div class="about-not-do-block" style="border-left-color: var(--dm-gold); margin: 16px 0;">
                <div class="about-not-do-item">
                  <strong>${t.multypeModesTitle}</strong>
                </div>
                <div class="about-not-do-item">${t.multypeModeDatamined}</div>
                <div class="about-not-do-item">${t.multypeModeRenamed}</div>
                <div class="about-not-do-item">${t.multypeModeCombined}</div>
              </div>
              <p>${t.multypeExcelNote}</p>
              <p>${t.multypeScannerToolNote}</p>
            </div>
            <details class="about-details">
              <summary>${t.multypeDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("multype", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: Release Metadata -->
          <section class="about-section" id="meta">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secMetaTitle}
                <a class="about-anchor-link" href="#meta" aria-label="${t.permalinkLabel}: ${t.secMetaTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.metaPlain}</p>
            </div>
            <details class="about-details">
              <summary>${t.metaDetailsTitle}</summary>
              <div class="about-details__body">
                ${renderDataTraceCard("meta", lang, t.traceLabels)}
              </div>
            </details>
          </section>

          <!-- Section: Principles / What This Archive Does Not Do -->
          <section class="about-section" id="curation">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secNotDoTitle}
                <a class="about-anchor-link" href="#curation" aria-label="${t.permalinkLabel}: ${t.secNotDoTitle}">#</a>
              </h2>
            </div>
            <div class="about-not-do-block">
              <div class="about-not-do-item">
                <strong>${t.notDo1Title}</strong> ${t.notDo1Desc}
              </div>
              <div class="about-not-do-item">
                <strong>${t.notDo2Title}</strong> ${t.notDo2Desc}
              </div>
              <div class="about-not-do-item">
                <strong>${t.notDo3Title}</strong> ${t.notDo3Desc}
              </div>
              <div class="about-not-do-item">
                <strong>${t.notDo4Title}</strong> ${t.notDo4Desc}
              </div>
              <div class="about-not-do-item">
                <strong>${t.notDo5Title}</strong> ${t.notDo5Desc}
              </div>
              <div class="about-not-do-item">
                <strong>${t.notDo6Title}</strong> ${t.notDo6Desc}
              </div>
            </div>
          </section>

          <!-- Section: Validation -->
          <section class="about-section" id="validation">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secValidationTitle}
                <a class="about-anchor-link" href="#validation" aria-label="${t.permalinkLabel}: ${t.secValidationTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.validationDesc}</p>
            </div>
            <details class="about-details">
              <summary>${t.validationDetailsTitle}</summary>
              <div class="about-details__body">
                <p><strong>${t.validationDetailsFullVsSmall}</strong></p>
                <div class="about-code-block">
                  ${t.validationDetailsGroups.replace(/\n/g, '<br>')}
                </div>
              </div>
            </details>
          </section>

          <!-- Section: Reproducing the Regular Pipeline -->
          <section class="about-section" id="reproduce">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secReproduceTitle}
                <a class="about-anchor-link" href="#reproduce" aria-label="${t.permalinkLabel}: ${t.secReproduceTitle}">#</a>
              </h2>
            </div>
            <div class="about-prose">
              <p>${t.reproduceDesc}</p>
              <div class="about-code-block">
                <strong>${t.cmdExport}</strong><br>
                <span style="color: var(--dm-muted);">${t.cmdExportDesc}</span><br><br>
                <strong>${t.cmdProcess}</strong><br>
                <span style="color: var(--dm-muted);">${t.cmdProcessDesc}</span><br><br>
                <strong>${t.cmdCheck}</strong><br>
                <span style="color: var(--dm-muted);">${t.cmdCheckDesc}</span>
              </div>
              <p>${t.reproduceNote}</p>
            </div>
          </section>

          <!-- Section: Source Code & Tools -->
          <section class="about-section" id="sources">
            <div class="about-section__header">
              <h2 class="about-section__title">
                ${t.secSourcesTitle}
                <a class="about-anchor-link" href="#sources" aria-label="${t.permalinkLabel}: ${t.secSourcesTitle}">#</a>
              </h2>
            </div>
            <div class="about-sources-grid">
              <div class="about-source-card">
                <div>
                  <h3 class="about-source-card__title">${t.sourceDatamineTitle}</h3>
                  <p class="about-source-card__desc">${t.sourceDatamineDesc}</p>
                </div>
                <a class="about-source-card__link" href="https://github.com/smilekritik/tof-datamine-site" target="_blank" rel="noopener noreferrer">
                  ${t.githubLink}
                </a>
              </div>
              <div class="about-source-card">
                <div>
                  <h3 class="about-source-card__title">${t.sourceScannerTitle}</h3>
                  <p class="about-source-card__desc">${t.sourceScannerDesc}</p>
                </div>
                <a class="about-source-card__link" href="https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner" target="_blank" rel="noopener noreferrer">
                  ${t.githubLink}
                </a>
              </div>
            </div>
          </section>

          <!-- Disclaimer -->
          <aside class="about-disclaimer" id="disclaimer">
            <strong>Disclaimer:</strong> ${t.disclaimer}
          </aside>
        </article>

        <!-- Desktop Sticky TOC Rail -->
        <aside class="about-sidebar" aria-label="${t.tocTitle}">
          <nav class="about-toc">
            <span class="about-toc__title">${t.tocTitle}</span>
            <div class="about-toc__links">
              ${tocListHtml}
            </div>
          </nav>
        </aside>
      </div>
    `;

    initTocObserver();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("datamine:language-change", () => {
      renderAboutPage();
    });
    window.addEventListener("datamine:languagechange", () => {
      renderAboutPage();
    });
    window.addEventListener("datamine:meta-loaded", renderAboutPage);
    window.addEventListener("datamine:live-version-loaded", renderAboutPage);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderAboutPage, { once: true });
    } else {
      renderAboutPage();
    }
  }
})();
