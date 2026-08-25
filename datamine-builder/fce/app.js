/**
 * FCE Boss Card Builder - Main Application Logic
 * Standalone, offline-ready card builder with full RU/EN dual-language support,
 * simultaneous dual export (EN + RU), live scaling, WYSIWYG editing,
 * floating color palette, PC image selector, and PNG/JSON export.
 */

(function () {
  'use strict';

  const SCENE_WIDTH = 1920;
  const SCENE_HEIGHT = 1080;
  const DEFAULT_ART_SCALE = 1.08;
  const DEFAULT_ART_X = -96;
  const DEFAULT_ART_Y = 0;
  const DEFAULT_NAME_RIGHT = 0;
  const DEFAULT_NAME_Y = 38;
  const DEFAULT_NAME_WIDTH = 620;
  const STORAGE_KEY = 'tof_fce_builder_draft_v4';

  // I18N Translation Dictionaries
  const I18N = {
    ru: {
      brandTitle: "Card Builder",
      presetLabel: "Шаблон босса:",
      presetDefault: "-- Выбрать существующего босса (32) --",
      btnNew: "+ Новый",
      titleBtnNewBoss: "Создать пустую карточку с нуля",
      statusOriginal: "Оригинал с сайта",
      statusEdited: "Отредактировано",
      btnRevertToOriginal: "↺ Сбросить к оригиналу",
      titleBtnRevertToOriginal: "Сбросить все изменения этого босса к оригинальным с сайта",
      zoomFit: "Авто",
      titleZoomFit: "Подогнать под экран",
      zoomSize: "Размер",
      btnQuickExportZip: "ZIP (JSON + Арт)",
      titleBtnQuickExportZip: "Скачать ZIP-пакет (JSON + Арт в структуре datamine/fce)",
      btnDownloadPng: "Скачать PNG (1920×1080)",
      titleBtnDownloadPng: "Скачать карточку в высоком разрешении 1920×1080",
      
      tabBoss: "Параметры",
      tabArt: "Арт",
      tabLayout: "Позиция",
      tabTypography: "Шрифт и Стиль",
      tabExport: "Экспорт",
      
      panelBossDetailsTitle: "Имя босса (RU / EN)",
      badgeDisplayedOnCard: "Отображается на карточке",
      labelBossNameRu: "🇷🇺 Имя на русском",
      labelBossNameEn: "🇺🇸 Имя на английском (EN)",
      labelBossDetails: "Идентификаторы и параметры",
      labelBossSlug: "Slug (URL / имя файла)",
      labelBossId: "Game Boss ID",
      labelSourcePsd: "Источник / Заметка",
      paletteTitle: "Цвет имени босса",
      badge18Colors: "18 оттенков",
      titleSpectrum: "Перетащите для выбора оттенка и яркости",
      titleHue: "Перетащите для выбора спектра",
      titleEyeDropper: "Пипетка (выбрать цвет с экрана)",
      
      panelImagesTitle: "Слои изображений",
      btnAddExtraImage: "+ Добавить картинку",
      layerBossArt: "Арт босса",
      layerExtraImage: "🖼️ Картинка {n}",
      labelArtOpacity: "Прозрачность (Opacity):",
      btnLayerForward: "▲ Вперед",
      btnLayerBackward: "▼ Назад",
      btnDeleteImage: "✕ Удалить",
      btnBackToBossArt: "👑 К арту босса",

      panelBossArtTitle: "Изображение / Арт босса",
      badgeReady: "Готово",
      badgeArtLoaded: "Арт загружен",
      badgeNoArt: "Без арта",
      dropzoneStrong: "Перетащите картинку босса сюда",
      dropzoneSpan: "или нажмите для выбора файла с ПК (.png, .webp, .jpg)",
      labelArtUrl: "Или путь / URL к арту",
      titleBtnClearArt: "Удалить арт",
      toggleAutoFitArt: "Авто-положение арта (как на сайте)",
      labelArtScale: "Масштаб (Scale):",
      labelArtX: "Смещение по X (px):",
      labelArtY: "Смещение по Y (px):",
      
      panelNameSettingsTitle: "Настройки имени босса",
      toggleAutoFitName: "Авто-подбор масштаба и ширины имени (как на сайте)",
      labelNameY: "Позиция по высоте (Y offset):",
      labelNameRight: "Отступ справа (Right offset):",
      labelNameWidth: "Ширина блока имени:",
      
      panelCopySettingsTitle: "Настройки блока механик",
      toggleAutoFitCopy: "Авто-подбор масштаба и высоты (как на сайте)",
      labelCopyY: "Начало сверху (Y):",
      labelCopyWidth: "Ширина блока текста:",
      labelCopyScale: "Масштаб шрифта блока:",
      
      panelNameTypographyTitle: "Шрифт имени босса",
      labelNameFontFamily: "Шрифт имени босса:",
      labelNameStroke: "Обводка имени босса",
      panelFontSpecimensTitle: "Примеры шрифтов",
      panelFontTitle: "Шрифт текста механик",
      labelFontFamily: "Семейство шрифта:",
      panelStrokeTitle: "Обводка текста механик",
      labelStrokeWidth: "Толщина обводки:",
      labelStrokeColor: "Цвет обводки:",
      badgeFontOfficial: "Оригинал FCE",
      badgeFontCustom: "Пользовательский",
      panelFontPackageTitle: "Официальный пакет шрифтов",
      badgeZipAsset: "ZIP Ресурс",
      btnUploadFont: "+ Загрузить официальный файл шрифта (.ttf, .otf, .woff, .woff2)",
      hintFontPackage: "📦 Загруженный файл шрифта будет автоматически включен в ZIP-архив в папку /assets/fonts/.",
      
      panelExportTitle: "Экспорт для сайта (EN + RU)",
      panelExportDesc: "Экспортируйте обе версии босса (English и Русский) в едином JSON или отдельных файлах.",
      exportZipTitle: "Скачать ZIP-архив (JSON + Арт)",
      exportZipDesc: "Структура datamine/fce: data/bosses/{slug}.json + assets/bosses/. Распакуйте поверх datamine/fce, затем запустите build-fce-index.js",
      exportModalBtnTitle: "Открыть меню копирования",
      exportModalBtnDesc: "Готовый файл боссы data/bosses/{slug}.json",
      exportPngTitle: "Скачать PNG (1920×1080)",
      exportPngDesc: "Готовое изображение сверхвысокой четкости",
      exportHtmlTitle: "Скопировать HTML код",
      exportHtmlDesc: "Чистый HTML для вставки на страницу",
      panelJsonPreviewTitle: "Превью экспорта:",
      
      panelMechanicsTitle: "Строки механик",
      lineSingular: "строка",
      lineFew: "строки",
      lineMany: "строк",
      btnAddLine: "+ Добавить строку",
      btnAddLineOnCard: "+ Добавить строку механики",
      btnAutoRenumber: "🔢 Авто-нумерация строк (1, 2, 3...)",
      linePlaceholder: "Введите текст механики...",
      btnMoveUp: "Вверх",
      btnMoveDown: "Вниз",
      btnDeleteLine: "Удалить строку",
      
      canvasStatusText: "Интерактивный холст (1920×1080) · Редактируйте прямо здесь",
      btnToggleFullscreenTitle: "Во весь экран",
      cardNameTitle: "Нажмите чтобы отредактировать имя босса прямо на карточке",
      
      titleSelBold: "Жирный шрифт (Ctrl+B)",
      titleSelItalic: "Курсив (Ctrl+I)",
      titleSelUnderline: "Подчеркнутый (Ctrl+U)",
      titleSelStrike: "Зачеркнутый",
      titleSelFont: "Шрифт выделенного фрагмента",
      titleSelStroke: "Обводка выделенного текста",
      titleSelRed: "Красный акцент (Ctrl+R)",
      titleSelGold: "Золотистый",
      titleSelCyan: "Бирюзовый",
      titleSelPurple: "Фиолетовый",
      titleSelLime: "Лайм",
      titleSelColorPicker: "Выбрать цвет из палитры",
      titleSelClear: "Очистить форматирование",
      titleSelClose: "Закрыть панель",
      
      modalTitle: "Экспорт кода (EN + RU)",
      modalInstructionsDual: "Готовый файл босса — сохраните как <code>datamine/fce/data/bosses/{slug}.json</code>, затем запустите <code>build-fce-index.js</code>:",
      modalInstructionsEn: "Только английская часть (для справки; сайт использует объединённый файл выше):",
      modalInstructionsRu: "Только русская часть (для справки; сайт использует объединённый файл выше):",
      modalInstructionsHtml: "Скопируйте готовый HTML код карточки:",
      btnModalCopy: "📋 Скопировать в буфер обмена",
      btnModalDownload: "💾 Скачать файл",
      
      toastLineAdded: "Строка добавлена (EN + RU)! ➕",
      toastLineDeleted: "Строка удалена",
      toastNumbered: "Строки пронумерованы: 1, 2, 3... 🔢",
      toastRedApplied: "Красный акцент применен! 🔴",
      toastColorApplied: "Цвет применен! 🎨",
      toastRedCleared: "Форматирование очищено",
      toastPresetLoaded: "Загружен шаблон босса: {name} ✨",
      toastNewBoss: "Создана новая карточка босса! 🌟",
      toastRendering: "Рендеринг PNG 1920×1080... ⏳",
      toastPngDownloaded: "PNG карточка успешно скачана! 🖼️",
      toastJsonCopied: "JSON скопирован в буфер! 📋",
      toastJsonDownloaded: "JSON файл скачан! 💾",
      toastHtmlCopied: "HTML карточки скопирован! 🌐",
      toastArtReset: "Позиция арта сброшена к стандартной",
      toastArtLoaded: "Загружен арт: {name} 🖼️",
      toastArtPasted: "Арт вставлен из буфера обмена! 📋",
      toastImageAdded: "Картинка добавлена на карточку! 🖼️",
      toastImageDeleted: "Картинка удалена с карточки",
      toastZipCreating: "Сборка ZIP архива (JSON + Арт)... 📦",
      toastZipDownloaded: "ZIP архив успешно собран и скачан! 📦✨",
      toastMinLines: "Карточка должна содержать хотя бы одну строку!",
      confirmNewBoss: "Создать новую чистую карточку? Несохраненные изменения будут перезаписаны.",
      toastReverted: "Карточка сброшена к оригиналу с сайта! ↺",
      toastLiveSynced: "База боссов синхронизирована с сайтом! ☁️",
      confirmRevert: "Сбросить все сделанные правки этого босса к оригинальным данным с сайта?",
      toastFontLoaded: "Шрифт {name} успешно подключен! ✍️",
      toastStrokeApplied: "Обводка применена к фрагменту! ⭕",
      toastStrokeRemoved: "Обводка снята с фрагмента",
      toastFontApplied: "Шрифт применен к фрагменту! ✍️",
      badgeSelectedText: "Выделение",
      hintCopyStroke: "Выделите фрагмент текста на карточке или в списке механик для настройки индивидуальной обводки:",
      btnApplyCopyStroke: "Применить к выделению",
      btnRemoveCopyStroke: "Снять",
      titlePopoverStroke: "Обводка (1–48px)",
      btnApply: "OK",
      btnRemove: "✕"
    },
    en: {
      brandTitle: "Card Builder",
      presetLabel: "Boss Preset:",
      presetDefault: "-- Select existing boss (32) --",
      btnNew: "+ New",
      titleBtnNewBoss: "Create a blank card from scratch",
      statusOriginal: "Site Original",
      statusEdited: "Edited",
      btnRevertToOriginal: "↺ Revert to Original",
      titleBtnRevertToOriginal: "Revert all changes for this boss back to the site original",
      zoomFit: "Fit",
      titleZoomFit: "Fit to screen",
      zoomSize: "Size",
      btnQuickExportZip: "ZIP (JSON + Art)",
      titleBtnQuickExportZip: "Download ZIP package (JSON + Art matching datamine/fce structure)",
      btnDownloadPng: "Download PNG (1920×1080)",
      titleBtnDownloadPng: "Download high-resolution 1920×1080 card image",
      
      tabBoss: "Boss Info",
      tabArt: "Artwork",
      tabLayout: "Position",
      tabTypography: "Typography & Styles",
      tabExport: "Export",
      
      panelBossDetailsTitle: "Boss Name (RU / EN)",
      badgeDisplayedOnCard: "Displayed on card",
      labelBossNameRu: "🇷🇺 Russian Name",
      labelBossNameEn: "🇺🇸 English Name (EN)",
      labelBossDetails: "Identifiers & Parameters",
      labelBossSlug: "Slug (URL / file identifier)",
      labelBossId: "Game Boss ID",
      labelSourcePsd: "Source / Notes",
      paletteTitle: "Boss Name Color",
      badge18Colors: "18 swatches",
      titleSpectrum: "Drag to pick saturation & brightness",
      titleHue: "Drag to pick hue spectrum",
      titleEyeDropper: "Eyedropper (pick color from screen)",
      
      panelImagesTitle: "Image Layers",
      btnAddExtraImage: "+ Add Image",
      layerBossArt: "Boss Art",
      layerExtraImage: "🖼️ Image {n}",
      labelArtOpacity: "Opacity:",
      btnLayerForward: "▲ Forward",
      btnLayerBackward: "▼ Backward",
      btnDeleteImage: "✕ Delete",
      btnBackToBossArt: "👑 Back to Boss Art",

      panelBossArtTitle: "Boss Artwork Image",
      badgeReady: "Ready",
      badgeArtLoaded: "Art loaded",
      badgeNoArt: "No art",
      dropzoneStrong: "Drag & drop boss image here",
      dropzoneSpan: "or click to select file from PC (.png, .webp, .jpg)",
      labelArtUrl: "Or path / URL to art",
      titleBtnClearArt: "Remove artwork",
      toggleAutoFitArt: "Auto-fit art position (like on site)",
      labelArtScale: "Scale:",
      labelArtX: "X Offset (px):",
      labelArtY: "Y Offset (px):",
      
      panelNameSettingsTitle: "Boss Name Settings",
      toggleAutoFitName: "Auto-fit name width & scale (like on site)",
      labelNameY: "Vertical offset (Y offset):",
      labelNameRight: "Right offset (Right offset):",
      labelNameWidth: "Name block width:",
      
      panelCopySettingsTitle: "Mechanics Block Settings",
      toggleAutoFitCopy: "Auto-fit height & scale (like on site)",
      labelCopyY: "Top offset (Y):",
      labelCopyWidth: "Text block width:",
      labelCopyScale: "Font scale:",
      
      panelNameTypographyTitle: "Boss Name Font",
      labelNameFontFamily: "Boss Name Font:",
      labelNameStroke: "Boss Name Outline",
      panelFontSpecimensTitle: "Font Specimens",
      panelFontTitle: "Mechanic Text Font",
      labelFontFamily: "Font Family:",
      panelStrokeTitle: "Mechanic Text Outline",
      labelStrokeWidth: "Outline Width:",
      labelStrokeColor: "Outline Color:",
      badgeFontOfficial: "FCE Original",
      badgeFontCustom: "Custom",
      panelFontPackageTitle: "Official Font Package",
      badgeZipAsset: "ZIP Asset",
      btnUploadFont: "+ Upload official font file (.ttf, .otf, .woff, .woff2)",
      hintFontPackage: "📦 Uploaded font file will be automatically bundled into ZIP under /assets/fonts/.",
      
      panelExportTitle: "Export for Website (EN + RU)",
      panelExportDesc: "Export both English and Russian boss definitions in a unified JSON or separate files.",
      exportZipTitle: "Download ZIP Package (JSON + Art)",
      exportZipDesc: "datamine/fce structure: data/bosses/{slug}.json + assets/bosses/. Unzip over datamine/fce, then run build-fce-index.js",
      exportModalBtnTitle: "Open Export Menu",
      exportModalBtnDesc: "Ready boss file data/bosses/{slug}.json",
      exportPngTitle: "Download PNG (1920×1080)",
      exportPngDesc: "Ultra high-resolution image ready for website",
      exportHtmlTitle: "Copy HTML Code",
      exportHtmlDesc: "Clean HTML for page embedding",
      panelJsonPreviewTitle: "Export Preview:",
      
      panelMechanicsTitle: "Mechanic Lines",
      lineSingular: "line",
      lineFew: "lines",
      lineMany: "lines",
      btnAddLine: "+ Add Line",
      btnAddLineOnCard: "+ Add Mechanic Line",
      btnAutoRenumber: "🔢 Auto-renumber lines (1, 2, 3...)",
      linePlaceholder: "Enter mechanic text...",
      btnMoveUp: "Move up",
      btnMoveDown: "Move down",
      btnDeleteLine: "Delete line",
      
      canvasStatusText: "Interactive Canvas (1920×1080) · Edit directly here",
      btnToggleFullscreenTitle: "Fullscreen mode",
      cardNameTitle: "Click to edit boss name directly on canvas",
      
      titleSelBold: "Bold (Ctrl+B)",
      titleSelItalic: "Italic (Ctrl+I)",
      titleSelUnderline: "Underline (Ctrl+U)",
      titleSelStrike: "Strikethrough",
      titleSelFont: "Font of highlighted selection",
      titleSelStroke: "Outline highlighted text",
      titleSelRed: "Red accent (Ctrl+R)",
      titleSelGold: "Gold accent",
      titleSelCyan: "Cyan accent",
      titleSelPurple: "Purple accent",
      titleSelLime: "Lime accent",
      titleSelColorPicker: "Custom color from palette",
      titleSelClear: "Clear formatting",
      titleSelClose: "Close toolbar",
      
      modalTitle: "Export Code (EN + RU)",
      modalInstructionsDual: "Ready-to-drop boss file — save as <code>datamine/fce/data/bosses/{slug}.json</code>, then run <code>build-fce-index.js</code>:",
      modalInstructionsEn: "English part only (reference; the site uses the combined file above):",
      modalInstructionsRu: "Russian part only (reference; the site uses the combined file above):",
      modalInstructionsHtml: "Copy the ready card HTML code:",
      btnModalCopy: "📋 Copy to clipboard",
      btnModalDownload: "💾 Download file",
      
      toastLineAdded: "Line added (EN + RU)! ➕",
      toastLineDeleted: "Line deleted",
      toastNumbered: "Lines renumbered: 1, 2, 3... 🔢",
      toastRedApplied: "Red accent applied! 🔴",
      toastColorApplied: "Color applied! 🎨",
      toastRedCleared: "Formatting cleared",
      toastPresetLoaded: "Loaded boss preset: {name} ✨",
      toastNewBoss: "Created new boss card! 🌟",
      toastRendering: "Rendering PNG 1920×1080... ⏳",
      toastPngDownloaded: "PNG card downloaded successfully! 🖼️",
      toastJsonCopied: "JSON copied to clipboard! 📋",
      toastJsonDownloaded: "JSON file downloaded! 💾",
      toastHtmlCopied: "Card HTML copied! 🌐",
      toastArtReset: "Art position reset to default",
      toastArtLoaded: "Loaded art: {name} 🖼️",
      toastArtPasted: "Art pasted from clipboard! 📋",
      toastZipCreating: "Generating ZIP package (JSON + Art)... 📦",
      toastZipDownloaded: "ZIP package downloaded successfully! 📦✨",
      toastMinLines: "Card must have at least one line!",
      confirmNewBoss: "Create a new blank card? Unsaved changes will be overwritten.",
      toastReverted: "Card reset to site original! ↺",
      toastLiveSynced: "Boss catalog synced with the live site! ☁️",
      confirmRevert: "Revert all custom edits for this boss back to the site original?",
      toastFontLoaded: "Font {name} loaded successfully! ✍️",
      toastStrokeApplied: "Outline applied to selection! ⭕",
      toastStrokeRemoved: "Outline removed from selection",
      toastFontApplied: "Font applied to selection! ✍️",
      badgeSelectedText: "Selection",
      hintCopyStroke: "Select a text fragment on the card or in the mechanics list to apply individual outline:",
      btnApplyCopyStroke: "Apply to Selection",
      btnRemoveCopyStroke: "Remove",
      titlePopoverStroke: "Outline (1–48px)",
      btnApply: "OK",
      btnRemove: "✕"
    }
  };

  // State with Dual Translations
  const state = {
    slug: 'chaos-armor',
    boss_id: 'boss_hum_046',
    source_psd: 'хаос.psd',
    name_color: '#f16937',
    art: '../../datamine/fce/assets/bosses/chaos-armor.png',
    art_scale: 1.08,
    art_scale_x: 1.08,
    art_scale_y: 1.08,
    art_x: -96,
    art_y: 0,
    art_opacity: 1.0,
    extra_images: [],
    activeImageTarget: 'boss',
    name_right: 0,
    name_y: 38,
    name_width: 620,
    name_scale: 1,
    name_font_family: "var(--fce-font-title)",
    name_stroke_enabled: true,
    name_stroke_width: 3,
    name_stroke_color: "rgba(17, 17, 17, 0.92)",
    copy_y: 220,
    copy_width: 1300,
    copy_scale: 1,
    copy_font_family: "var(--fce-font-copy)",
    customFontName: null,
    customFontFileName: null,
    customFontFormat: null,
    customFontData: null,
    customFontBuffer: null,
    copy_stroke_enabled: false,
    copy_stroke_width: 2,
    copy_stroke_color: "#000000",
    autoFitArt: true,
    interactiveArtDrag: true,
    autoFitName: true,
    autoFitCopy: true,
    currentLangPreset: 'en',
    previewMode: 'dual', // 'dual', 'en', 'ru'
    modalActiveTab: 'dual', // 'dual', 'en', 'ru', 'html'
    translations: {
      ru: {
        name: 'Хаос Армор',
        mechanics: [
          {
            index: '1',
            html: 'Атаки накладывают мощный эффект Graying Bite. Повышайте соответствующее стихийное сопротивление или уклоняйтесь от попаданий.'
          },
          {
            index: '2',
            html: 'Чем меньше HP босса, тем выше его снижение урона. <span class="fce-card__text-accent">Снижение урона на 20% за каждые потерянные 20% HP.</span> После этого босса можно добить. Используйте оружие с высоким shatter, чтобы сломать щит и выполнить добивание. Урон добивания игнорирует снижение урона босса и зависит от ATK, сопротивлений и бонуса урона Странника.'
          },
          {
            index: '3',
            html: 'Босс получает навык Infernal Flames. Большинство атак босса оставляют на земле большую горящую область, которая непрерывно наносит урон. Не заходите в пылающие зоны.'
          },
          {
            index: '4',
            html: 'По области будут происходить большие случайные взрывы, наносящие смертельный урон при попадании и оставляющие Infernal Flames.'
          }
        ]
      },
      en: {
        name: 'Chaos Armor',
        mechanics: [
          {
            index: '1',
            html: 'Attacks come with a powerful Graying Bite effect. Increase corresponding elemental resistance or avoid being hit.'
          },
          {
            index: '2',
            html: 'The lower the boss&#x27;s HP, the greater its damage reduction. <span class="fce-card__text-accent">Damage reduction 20% for each 20% HP lost.</span> The boss can then be executed. Use weapons with high shatter to break its shield and execute it. Execution damage ignores the boss&#x27;s damage reduction and is affected by the Wanderer&#x27;s ATK, resistance, and damage boost.'
          },
          {
            index: '3',
            html: 'Gain the Infernal Flames skill. The majority of the boss&#x27;s attacks will leave a large area on the ground that burns continuously. Avoid entering the burning areas.'
          },
          {
            index: '4',
            html: 'Large random explosions will occur in the area, dealing lethal damage upon hit and leaving Infernal Flames in the area.'
          }
        ]
      }
    },
    zoomMode: 'auto',
    interactiveArtDrag: true,
    scale: 0.65
  };

  const STORAGE_KEY_CURRENT = 'fce_boss_current_draft_v2';
  const STORAGE_KEY_EDITS = 'fce_boss_custom_edits_map_v2';

  let isDraggingArt = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragInitialArtX = 0;
  let dragInitialArtY = 0;

  const dom = {};

  window.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    cacheDomElements();
    restoreSavedDraft();
    applyLanguage(state.currentLangPreset || 'ru');
    populatePresetsDropdown();
    bindEvents();
    syncFormInputsFromState();
    renderAll();
    renderFontSpecimens();
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
    updateBossEditStatus();
    syncRemoteCatalog();
  }

  function getActiveTranslation() {
    const lang = state.currentLangPreset === 'en' ? 'en' : 'ru';
    if (!state.translations[lang]) {
      state.translations[lang] = {
        name: 'Boss Name',
        mechanics: [{ index: '1', html: 'Mechanic description' }]
      };
    }
    return state.translations[lang];
  }

  function t(key, vars = {}) {
    const lang = state.currentLangPreset || 'ru';
    let str = I18N[lang]?.[key] || I18N.ru[key] || key;
    Object.keys(vars).forEach((v) => {
      str = str.replace(new RegExp(`\\{${v}\\}`, 'g'), vars[v]);
    });
    return str;
  }

  function applyLanguage(lang) {
    state.currentLangPreset = lang;
    document.documentElement.lang = lang;

    dom.langBtns.forEach((btn) => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && I18N[lang]?.[key]) {
        el.textContent = I18N[lang][key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key && I18N[lang]?.[key]) {
        el.setAttribute('title', I18N[lang][key]);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && I18N[lang]?.[key]) {
        el.setAttribute('placeholder', I18N[lang][key]);
      }
    });

    if (dom.inputBossName) {
      dom.inputBossName.placeholder = t('bossNamePlaceholder');
      dom.inputBossName.value = getActiveTranslation().name || '';
    }
    if (dom.cardNameText) {
      renderBossNameInto(getActiveTranslation());
    }

    updateFontDropdownLabels(lang);
    populatePresetsDropdown();
    renderMechanicsList();
    renderCardCopy();
    renderArtLayersChips();
    syncArtworkSidebarFromActiveImage();
    updateArtStatusBadge();
    updateFontStatusBadge();
    updateNameFontStatusBadge();
    updateJsonPreview();
    saveDraft();
  }

  function updateFontDropdownLabels(lang) {
    const isEn = lang === 'en';
    const fontLabels = {
      title: isEn ? 'Haettenschweiler (Boss Name Original)' : 'Haettenschweiler (Оригинал имени босса)',
      copy: isEn ? 'Franklin Gothic Medium Cond (Mechanics Original)' : 'Franklin Gothic Medium Cond (Шрифт механик)',
      manrope: isEn ? 'Manrope (TOF Interface)' : 'Manrope (Интерфейс TOF)',
      spectral: isEn ? 'Spectral (Serif Stylistic)' : 'Spectral (Стилистический)',
      impact: isEn ? 'Impact (Heavy Bold)' : 'Impact (Плотный гротеск)',
      arial: isEn ? 'Arial Narrow (Condensed)' : 'Arial Narrow (Узкий)',
      mono: isEn ? 'JetBrains Mono (Monospace)' : 'JetBrains Mono (Моноширинный)',
      selAuto: isEn ? 'Font: Auto' : 'Шрифт: Авто',
    };

    if (dom.selectNameFont && dom.selectNameFont.options.length >= 7) {
      dom.selectNameFont.options[0].text = fontLabels.title;
      dom.selectNameFont.options[1].text = fontLabels.copy;
      dom.selectNameFont.options[2].text = fontLabels.manrope;
      dom.selectNameFont.options[3].text = fontLabels.spectral;
      dom.selectNameFont.options[4].text = fontLabels.impact;
      dom.selectNameFont.options[5].text = fontLabels.arial;
      dom.selectNameFont.options[6].text = fontLabels.mono;
    }

    if (dom.selectCopyFont && dom.selectCopyFont.options.length >= 7) {
      dom.selectCopyFont.options[0].text = fontLabels.copy;
      dom.selectCopyFont.options[1].text = fontLabels.title;
      dom.selectCopyFont.options[2].text = fontLabels.manrope;
      dom.selectCopyFont.options[3].text = fontLabels.spectral;
      dom.selectCopyFont.options[4].text = fontLabels.impact;
      dom.selectCopyFont.options[5].text = fontLabels.arial;
      dom.selectCopyFont.options[6].text = fontLabels.mono;
    }

    if (dom.selTextFontFamily && dom.selTextFontFamily.options[0]) {
      dom.selTextFontFamily.options[0].text = fontLabels.selAuto;
    }
  }

  function cacheDomElements() {
    dom.presetSelect = document.getElementById('fcePresetSelect');
    dom.btnNewBoss = document.getElementById('btnNewBoss');
    dom.bossStatusBadge = document.getElementById('bossStatusBadge');
    dom.bossStatusText = document.getElementById('bossStatusText');
    dom.btnRevertToOriginal = document.getElementById('btnRevertToOriginal');
    dom.btnQuickCopyJson = document.getElementById('btnQuickCopyJson');
    dom.btnDownloadPng = document.getElementById('btnDownloadPng');
    dom.langBtns = document.querySelectorAll('.fceb-lang-btn');
    dom.zoomBtns = document.querySelectorAll('.fceb-zoom-btn');
    dom.tabBtns = document.querySelectorAll('.fceb-tab');
    dom.panels = document.querySelectorAll('.fceb-panel');

    // Sidebar mechanics
    dom.linesList = document.getElementById('linesList');
    dom.btnAddLine = document.getElementById('btnAddLine');
    dom.btnAddLineBottom = document.getElementById('btnAddLineBottom');
    dom.btnAutoRenumber = document.getElementById('btnAutoRenumber');
    dom.lineCountBadge = document.getElementById('lineCountBadge');

    // Sidebar boss info
    dom.inputBossNameRu = document.getElementById('inputBossNameRu');
    dom.inputBossNameEn = document.getElementById('inputBossNameEn');
    dom.inputBossName = document.getElementById('inputBossName'); // fallback
    dom.inputBossSlug = document.getElementById('inputBossSlug');
    dom.inputBossId = document.getElementById('inputBossId');
    dom.inputSourcePsd = document.getElementById('inputSourcePsd');

    // Sidebar boss art & layers
    dom.btnAddExtraImageBtn = document.getElementById('btnAddExtraImageBtn');
    dom.inputExtraImageFile = document.getElementById('inputExtraImageFile');
    dom.artLayersChips = document.getElementById('artLayersChips');
    dom.activeImageInspectorCard = document.getElementById('activeImageInspectorCard');
    dom.activeImageTitle = document.getElementById('activeImageTitle');
    dom.artDropzone = document.getElementById('artDropzone');
    dom.inputArtFile = document.getElementById('inputArtFile');
    dom.inputArtUrl = document.getElementById('inputArtUrl');
    dom.btnClearArt = document.getElementById('btnClearArt');
    dom.wrapAutoFitArt = document.getElementById('wrapAutoFitArt');
    dom.chkAutoFitArt = document.getElementById('chkAutoFitArt');
    dom.rangeArtOpacity = document.getElementById('rangeArtOpacity');
    dom.valArtOpacity = document.getElementById('valArtOpacity');
    dom.rangeArtScale = document.getElementById('rangeArtScale');
    dom.valArtScale = document.getElementById('valArtScale');
    dom.rangeArtX = document.getElementById('rangeArtX');
    dom.valArtX = document.getElementById('valArtX');
    dom.rangeArtY = document.getElementById('rangeArtY');
    dom.valArtY = document.getElementById('valArtY');
    dom.artStatusBadge = document.getElementById('artStatusBadge');
    dom.extraImageActions = document.getElementById('extraImageActions');
    dom.btnLayerForward = document.getElementById('btnLayerForward');
    dom.btnLayerBackward = document.getElementById('btnLayerBackward');
    dom.btnDeleteActiveImage = document.getElementById('btnDeleteActiveImage');
    dom.btnBackToBossArt = document.getElementById('btnBackToBossArt');

    // Sidebar layout
    dom.chkAutoFitName = document.getElementById('chkAutoFitName');
    dom.rangeNameY = document.getElementById('rangeNameY');
    dom.valNameY = document.getElementById('valNameY');
    dom.rangeNameRight = document.getElementById('rangeNameRight');
    dom.valNameRight = document.getElementById('valNameRight');
    dom.rangeNameWidth = document.getElementById('rangeNameWidth');
    dom.valNameWidth = document.getElementById('valNameWidth');
    dom.chkAutoFitCopy = document.getElementById('chkAutoFitCopy');
    dom.rangeCopyY = document.getElementById('rangeCopyY');
    dom.valCopyY = document.getElementById('valCopyY');
    dom.rangeCopyWidth = document.getElementById('rangeCopyWidth');
    dom.valCopyWidth = document.getElementById('valCopyWidth');
    dom.rangeCopyScale = document.getElementById('rangeCopyScale');
    dom.valCopyScale = document.getElementById('valCopyScale');

    // Sidebar fonts & stroke
    dom.selectNameFont = document.getElementById('selectNameFont');
    dom.nameFontStatusBadge = document.getElementById('nameFontStatusBadge');
    dom.chkNameStroke = document.getElementById('chkNameStroke');
    dom.nameStrokeControls = document.getElementById('nameStrokeControls');
    dom.rangeNameStrokeWidth = document.getElementById('rangeNameStrokeWidth');
    dom.valNameStrokeWidth = document.getElementById('valNameStrokeWidth');
    dom.nameStrokeNativeColorPicker = document.getElementById('nameStrokeNativeColorPicker');
    dom.nameStrokeHexColorInput = document.getElementById('nameStrokeHexColorInput');
    dom.nameStrokeColorPreviewDot = document.getElementById('nameStrokeColorPreviewDot');

    dom.selectCopyFont = document.getElementById('selectCopyFont');
    dom.fontStatusBadge = document.getElementById('fontStatusBadge');
    dom.btnUploadFontFile = document.getElementById('btnUploadFontFile');
    dom.inputFontFile = document.getElementById('inputFontFile');
    dom.chkCopyStroke = document.getElementById('chkCopyStroke');
    dom.copyStrokeControls = document.getElementById('copyStrokeControls');
    dom.rangeCopyStrokeWidth = document.getElementById('rangeCopyStrokeWidth');
    dom.valCopyStrokeWidth = document.getElementById('valCopyStrokeWidth');
    dom.strokeNativeColorPicker = document.getElementById('strokeNativeColorPicker');
    dom.strokeHexColorInput = document.getElementById('strokeHexColorInput');
    dom.strokeColorPreviewDot = document.getElementById('strokeColorPreviewDot');

    // Export tab
    dom.btnQuickExportZip = document.getElementById('btnQuickExportZip');
    dom.btnExportZipPackage = document.getElementById('btnExportZipPackage');
    dom.btnExportDualJson = document.getElementById('btnExportDualJson');
    dom.btnExportCopyModal = document.getElementById('btnExportCopyModal');
    dom.btnExportDownloadPng = document.getElementById('btnExportDownloadPng');
    dom.btnExportCopyHtml = document.getElementById('btnExportCopyHtml');
    dom.jsonPreviewBlock = document.getElementById('jsonPreviewBlock');
    dom.miniPreviewTabs = document.querySelectorAll('.fceb-mini-tab');

    // Workspace & Card
    dom.workspace = document.getElementById('fcebWorkspace');
    dom.canvasStage = document.getElementById('canvasStage');
    dom.cardViewport = document.getElementById('cardViewport');
    dom.fceCard = document.getElementById('fceCard');
    dom.cardCopy = document.getElementById('cardCopy');
    dom.cardVisual = document.getElementById('cardVisual');
    dom.cardArtImg = document.getElementById('cardArtImg');
    dom.cardExtraImages = document.getElementById('cardExtraImages');
    dom.imageTransformGizmo = document.getElementById('imageTransformGizmo');
    dom.gizmoScaleBadge = document.getElementById('gizmoScaleBadge');
    dom.cardNameText = document.getElementById('cardNameText');
    dom.btnToggleFullscreen = document.getElementById('btnToggleFullscreen');

    // Floating palette
    dom.floatingColorPalette = document.getElementById('floatingColorPalette');
    dom.colorPreviewDot = document.getElementById('colorPreviewDot');
    dom.colorSwatches = document.getElementById('colorSwatches');
    dom.hexColorInput = document.getElementById('hexColorInput');
    dom.btnClosePalette = document.getElementById('btnClosePalette');

    // Floating palette Custom Dark Spectrum Color Picker
    dom.pickerSpectrumWrap = document.getElementById('pickerSpectrumWrap');
    dom.pickerSpectrum = document.getElementById('pickerSpectrum');
    dom.pickerCursor = document.getElementById('pickerCursor');
    dom.pickerHueBar = document.getElementById('pickerHueBar');
    dom.pickerHueThumb = document.getElementById('pickerHueThumb');
    dom.btnEyeDropper = document.getElementById('btnEyeDropper');
    dom.pickerPreviewBox = document.getElementById('pickerPreviewBox');
    dom.inputRgbR = document.getElementById('inputRgbR');
    dom.inputRgbG = document.getElementById('inputRgbG');
    dom.inputRgbB = document.getElementById('inputRgbB');

    // Sidebar Tab 1 Dark Spectrum Color Picker
    dom.sidebarColorPreviewDot = document.getElementById('sidebarColorPreviewDot');
    dom.sidebarColorSwatches = document.getElementById('sidebarColorSwatches');
    dom.sidebarSpectrumWrap = document.getElementById('sidebarSpectrumWrap');
    dom.sidebarSpectrum = document.getElementById('sidebarSpectrum');
    dom.sidebarCursor = document.getElementById('sidebarCursor');
    dom.sidebarHueBar = document.getElementById('sidebarHueBar');
    dom.sidebarHueThumb = document.getElementById('sidebarHueThumb');
    dom.sidebarBtnEyeDropper = document.getElementById('sidebarBtnEyeDropper');
    dom.sidebarPickerPreviewBox = document.getElementById('sidebarPickerPreviewBox');
    dom.sidebarHexColorInput = document.getElementById('sidebarHexColorInput');
    dom.sidebarInputRgbR = document.getElementById('sidebarInputRgbR');
    dom.sidebarInputRgbG = document.getElementById('sidebarInputRgbG');
    dom.sidebarInputRgbB = document.getElementById('sidebarInputRgbB');

    // Selection toolbar
    dom.selectionToolbar = document.getElementById('selectionToolbar');
    dom.btnSelBold = document.getElementById('btnSelBold');
    dom.btnSelItalic = document.getElementById('btnSelItalic');
    dom.btnSelUnderline = document.getElementById('btnSelUnderline');
    dom.btnSelStrike = document.getElementById('btnSelStrike');
    dom.selTextFontFamily = document.getElementById('selTextFontFamily');
    dom.btnSelStroke = document.getElementById('btnSelStroke');
    dom.selStrokePopover = document.getElementById('selStrokePopover');
    dom.rangePopoverStrokeWidth = document.getElementById('rangePopoverStrokeWidth');
    dom.valPopoverStrokeWidth = document.getElementById('valPopoverStrokeWidth');
    dom.pickerPopoverStrokeColor = document.getElementById('pickerPopoverStrokeColor');
    dom.hexPopoverStrokeColor = document.getElementById('hexPopoverStrokeColor');
    dom.btnPopoverApplyStroke = document.getElementById('btnPopoverApplyStroke');
    dom.btnPopoverRemoveStroke = document.getElementById('btnPopoverRemoveStroke');
    dom.textCustomColorPicker = document.getElementById('textCustomColorPicker');
    dom.btnSelectionClear = document.getElementById('btnSelectionClear');
    dom.btnSelectionClose = document.getElementById('btnSelectionClose');

    // Sidebar stroke controls
    dom.btnApplyCopyStroke = document.getElementById('btnApplyCopyStroke');
    dom.btnRemoveCopyStroke = document.getElementById('btnRemoveCopyStroke');


    // Modal
    dom.exportModal = document.getElementById('exportModal');
    dom.modalTitle = document.getElementById('modalTitle');
    dom.modalInstructions = document.getElementById('modalInstructions');
    dom.modalCodeArea = document.getElementById('modalCodeArea');
    dom.btnModalClose = document.getElementById('btnModalClose');
    dom.modalBackdrop = document.getElementById('modalBackdrop');
    dom.btnModalCopy = document.getElementById('btnModalCopy');
    dom.btnModalDownload = document.getElementById('btnModalDownload');
    dom.modalTabs = document.querySelectorAll('.fceb-modal-tab');

    // Toast
    dom.toastContainer = document.getElementById('toastContainer');
  }

  function populatePresetsDropdown() {
    if (!window.FCE_PRESETS || !dom.presetSelect) return;

    const list = state.currentLangPreset === 'ru' ? window.FCE_PRESETS.ru : window.FCE_PRESETS.en;
    if (!Array.isArray(list)) return;

    const editsMap = getStoredEditsMap();
    const currentVal = state.slug || dom.presetSelect.value;
    dom.presetSelect.innerHTML = `<option value="">${t('presetDefault')}</option>`;

    const siteSlugs = new Set(list.map((b) => b.slug));
    list.forEach((boss) => {
      const opt = document.createElement('option');
      opt.value = boss.slug;
      opt.dataset.baseName = boss.name;
      const isMod = !!editsMap[boss.slug];
      opt.textContent = isMod ? `${boss.name} (${boss.slug}) ✏️` : `${boss.name} (${boss.slug})`;
      dom.presetSelect.appendChild(opt);
    });

    // Locally-created bosses that are not on the live site yet — list them at the
    // bottom (marked 🆕) so you can reselect the temp card you're working on.
    const lang = state.currentLangPreset === 'ru' ? 'ru' : 'en';
    const tempSlugs = Object.keys(editsMap)
      .filter((slug) => !siteSlugs.has(slug))
      .sort((a, b) => {
        const oa = Number(editsMap[a]?.order) || 0;
        const ob = Number(editsMap[b]?.order) || 0;
        return oa - ob;
      });
    tempSlugs.forEach((slug) => {
      const draft = editsMap[slug] || {};
      const name = draft.translations?.[lang]?.name
        || draft.translations?.en?.name
        || draft.translations?.ru?.name
        || slug;
      const opt = document.createElement('option');
      opt.value = slug;
      opt.dataset.baseName = name;
      opt.textContent = `${name} (${slug}) 🆕`;
      dom.presetSelect.appendChild(opt);
    });

    if (currentVal && (siteSlugs.has(currentVal) || tempSlugs.includes(currentVal))) {
      dom.presetSelect.value = currentVal;
    }
  }

  function bindEvents() {
    dom.presetSelect.addEventListener('change', handlePresetSelect);
    dom.btnNewBoss.addEventListener('click', handleNewBoss);
    dom.btnRevertToOriginal?.addEventListener('click', handleRevertToOriginal);

    dom.langBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextLang = btn.dataset.lang || 'ru';
        if (nextLang === state.currentLangPreset) return;
        applyLanguage(nextLang);
        syncFormInputsFromState();
        renderAll();
      });
    });

    dom.zoomBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.zoomBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const zoom = btn.dataset.zoom;
        state.zoomMode = zoom;
        updateSceneScale();
      });
    });

    dom.tabBtns.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.tabBtns.forEach((t) => t.classList.remove('is-active'));
        dom.panels.forEach((p) => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        const targetPanel = document.querySelector(`.fceb-panel[data-panel="${tab.dataset.tab}"]`);
        if (targetPanel) {
          targetPanel.classList.add('is-active');
        }
        if (tab.dataset.tab === 'art') {
          showTransformGizmo();
        } else {
          hideTransformGizmo();
        }
        if (tab.dataset.tab === 'export') {
          updateJsonPreview();
        }
      });
    });

    dom.miniPreviewTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.miniPreviewTabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.previewMode = tab.dataset.preview;
        updateJsonPreview();
      });
    });

    dom.btnAddLine?.addEventListener('click', addMechanicLine);
    dom.btnAddLineBottom?.addEventListener('click', addMechanicLine);
    dom.btnAutoRenumber?.addEventListener('click', autoRenumberLines);

    dom.inputBossNameRu?.addEventListener('input', (e) => {
      state.translations.ru.name = e.target.value;
      state.translations.ru.name_html = '';
      if (state.currentLangPreset === 'ru') {
        dom.cardNameText.textContent = e.target.value;
      }
      fitCardContent();
      saveDraft();
    });

    dom.inputBossNameEn?.addEventListener('input', (e) => {
      state.translations.en.name = e.target.value;
      state.translations.en.name_html = '';
      if (state.currentLangPreset === 'en') {
        dom.cardNameText.textContent = e.target.value;
      }
      fitCardContent();
      saveDraft();
    });

    if (dom.inputBossName) {
      dom.inputBossName.addEventListener('input', (e) => {
        const active = getActiveTranslation();
        active.name = e.target.value;
        active.name_html = '';
        dom.cardNameText.textContent = e.target.value;
        fitCardContent();
        saveDraft();
      });
    }

    dom.inputBossSlug?.addEventListener('input', (e) => {
      const oldSlug = state.slug;
      state.slug = e.target.value;
      // When renaming a not-yet-saved temp boss, drop its old draft entry so the
      // dropdown doesn't keep a stale "(old-slug) 🆕" row (e.g. the default
      // "new-boss") alongside the renamed one.
      if (oldSlug && oldSlug !== state.slug && isNewBossSlug(oldSlug)) {
        const editsMap = getStoredEditsMap();
        if (editsMap[oldSlug]) {
          delete editsMap[oldSlug];
          setStoredEditsMap(editsMap);
        }
      }
      saveDraft();
    });

    dom.inputBossId?.addEventListener('input', (e) => {
      state.boss_id = e.target.value;
      saveDraft();
    });

    dom.inputSourcePsd?.addEventListener('input', (e) => {
      state.source_psd = e.target.value;
      saveDraft();
    });

    dom.cardNameText.addEventListener('input', () => {
      persistBossName();
    });

    function showBossColorPalette() {
      if (dom.floatingColorPalette) {
        dom.floatingColorPalette.style.display = 'flex';
        dom.floatingColorPalette.classList.add('is-visible');
      }
    }

    function hideBossColorPalette() {
      if (dom.floatingColorPalette) {
        dom.floatingColorPalette.style.display = 'none';
        dom.floatingColorPalette.classList.remove('is-visible');
      }
    }

    dom.cardNameText?.addEventListener('focus', showBossColorPalette);
    dom.cardNameText?.addEventListener('click', showBossColorPalette);
    dom.inputBossNameRu?.addEventListener('focus', showBossColorPalette);
    dom.inputBossNameEn?.addEventListener('focus', showBossColorPalette);
    dom.inputBossName?.addEventListener('focus', showBossColorPalette);
    dom.btnClosePalette?.addEventListener('click', hideBossColorPalette);

    document.addEventListener('pointerdown', (e) => {
      // 1. Floating palette click-outside logic
      if (dom.floatingColorPalette && dom.floatingColorPalette.style.display !== 'none') {
        const isInsidePalette = dom.floatingColorPalette.contains(e.target);
        const isCardName = dom.cardNameText?.contains(e.target);
        const isInputRu = dom.inputBossNameRu?.contains(e.target);
        const isInputEn = dom.inputBossNameEn?.contains(e.target);
        const isInputBossName = dom.inputBossName?.contains(e.target);
        const isSidebarColor = dom.sidebarColorSwatches?.contains(e.target) ||
                               dom.sidebarSpectrumWrap?.contains(e.target) ||
                               dom.sidebarHexColorInput?.contains(e.target) ||
                               dom.sidebarColorPreviewDot?.contains(e.target) ||
                               e.target.closest('#sidebarColorPaletteGroup');
        const isSwatchOrPicker = e.target.closest('.fceb-swatch') ||
                                 e.target.closest('.fceb-custom-color') ||
                                 e.target.closest('.fceb-color-preview') ||
                                 e.target.closest('.fceb-picker-spectrum-wrap') ||
                                 e.target.closest('.fceb-rgb-inputs-row') ||
                                 e.target.closest('.fceb-card-group--compact');

        if (!isInsidePalette && !isCardName && !isInputRu && !isInputEn && !isInputBossName && !isSidebarColor && !isSwatchOrPicker) {
          hideBossColorPalette();
        }
      }

      // 2. Transform Gizmo click-outside logic
      if (dom.imageTransformGizmo && dom.imageTransformGizmo.style.display !== 'none') {
        const isGizmoClick = dom.imageTransformGizmo.contains(e.target);
        const isArtClick = dom.cardArtImg?.contains(e.target);
        const isExtraImgClick = e.target.closest('.fce-card__extra-img');
        const isArtSidebarClick = e.target.closest('.fceb-panel[data-panel="art"]') || e.target.closest('.fceb-tab[data-tab="art"]');

        if (!isGizmoClick && !isArtClick && !isExtraImgClick && !isArtSidebarClick) {
          if (!isArtTabActive()) {
            hideTransformGizmo();
          }
        }
      }
    });

    // Floating palette color events
    dom.colorSwatches?.addEventListener('click', (e) => {
      const swatch = e.target.closest('.fceb-swatch');
      if (!swatch) return;
      const color = swatch.dataset.color;
      if (color) {
        setNameColor(color);
        showBossColorPalette();
      }
    });

    dom.hexColorInput?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
        setNameColor(val);
      }
    });

    // Sidebar color events
    dom.sidebarColorSwatches?.addEventListener('click', (e) => {
      const swatch = e.target.closest('.fceb-swatch');
      if (!swatch) return;
      const color = swatch.dataset.color;
      if (color) {
        setNameColor(color);
      }
    });

    dom.sidebarHexColorInput?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
        setNameColor(val);
      }
    });

    initSpectrumColorPicker();

    dom.inputArtFile?.addEventListener('change', handleArtFileSelect);
    dom.inputArtUrl?.addEventListener('input', (e) => {
      setArtSource(e.target.value);
    });
    dom.btnClearArt?.addEventListener('click', () => {
      setArtSource('');
    });

    // Add extra image button & file input
    dom.btnAddExtraImageBtn?.addEventListener('click', () => {
      dom.inputExtraImageFile?.click();
    });
    dom.inputExtraImageFile?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            addExtraImage(evt.target.result, file.name.replace(/\.[^/.]+$/, ''));
          }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });

    dom.btnDeleteActiveImage?.addEventListener('click', deleteActiveImage);
    dom.btnLayerForward?.addEventListener('click', () => moveActiveImageLayer(1));
    dom.btnLayerBackward?.addEventListener('click', () => moveActiveImageLayer(-1));
    dom.btnBackToBossArt?.addEventListener('click', () => selectImageTarget('boss'));

    ['dragenter', 'dragover'].forEach((eventName) => {
      dom.artDropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dom.artDropzone.classList.add('is-dragover');
      });
      dom.fceCard?.addEventListener(eventName, (e) => {
        e.preventDefault();
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dom.artDropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dom.artDropzone.classList.remove('is-dragover');
      });
    });

    dom.artDropzone?.addEventListener('drop', handleDropFile);
    dom.fceCard?.addEventListener('drop', handleDropFile);

    window.addEventListener('paste', handleGlobalPaste);

    dom.chkAutoFitArt?.addEventListener('change', (e) => {
      state.autoFitArt = e.target.checked;
      if (state.autoFitArt) {
        state.art_scale = 1.08;
        state.art_x = -96;
        state.art_y = 0;
        dom.rangeArtScale.value = 1.08;
        dom.valArtScale.textContent = '1.08x';
        dom.rangeArtX.value = -96;
        dom.valArtX.textContent = '-96px';
        dom.rangeArtY.value = 0;
        dom.valArtY.textContent = '0px';
        updateArtTransform();
        saveDraft();
      }
    });

    dom.rangeArtOpacity?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      dom.valArtOpacity.textContent = `${Math.round(val * 100)}%`;
      if (state.activeImageTarget === 'boss') {
        state.art_opacity = val;
      } else {
        const img = state.extra_images && state.extra_images.find(x => x.id === state.activeImageTarget);
        if (img) img.opacity = val;
      }
      updateArtTransform();
      saveDraft();
    });

    dom.rangeArtScale?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      dom.valArtScale.textContent = val.toFixed(2) + 'x';
      if (state.activeImageTarget === 'boss') {
        state.autoFitArt = false;
        if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
        state.art_scale = val;
      } else {
        const img = state.extra_images && state.extra_images.find(x => x.id === state.activeImageTarget);
        if (img) img.scale = val;
      }
      updateArtTransform();
      saveDraft();
    });

    dom.rangeArtX?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dom.valArtX.textContent = val + 'px';
      if (state.activeImageTarget === 'boss') {
        state.autoFitArt = false;
        if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
        state.art_x = val;
      } else {
        const img = state.extra_images && state.extra_images.find(x => x.id === state.activeImageTarget);
        if (img) img.x = val;
      }
      updateArtTransform();
      saveDraft();
    });

    dom.rangeArtY?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dom.valArtY.textContent = val + 'px';
      if (state.activeImageTarget === 'boss') {
        state.autoFitArt = false;
        if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
        state.art_y = val;
      } else {
        const img = state.extra_images && state.extra_images.find(x => x.id === state.activeImageTarget);
        if (img) img.y = val;
      }
      updateArtTransform();
      saveDraft();
    });

    // Art and Gizmo drag listeners
    dom.cardArtImg?.addEventListener('mousedown', (e) => {
      handleImageMouseDown(e, 'boss');
    });

    dom.imageTransformGizmo?.querySelectorAll('.fceb-gizmo__handle').forEach((handleEl) => {
      handleEl.addEventListener('mousedown', (e) => {
        handleGizmoHandleMouseDown(e, handleEl.dataset.handle);
      });
    });

    window.addEventListener('mousemove', handleGlobalPointerMove);
    window.addEventListener('mouseup', handleGlobalPointerUp);

    // Deselect gizmo / switch to boss art if clicking empty background of card
    dom.fceCard?.addEventListener('mousedown', (e) => {
      if (e.target === dom.fceCard || e.target.classList.contains('fce-card__sky') || e.target.classList.contains('fce-card__grid') || e.target.classList.contains('fce-card__wash')) {
        selectImageTarget('boss');
      }
    });

    dom.chkAutoFitName.addEventListener('change', (e) => {
      state.autoFitName = e.target.checked;
      if (state.autoFitName) {
        state.name_y = 38;
        state.name_right = 0;
        state.name_width = 620;
        dom.rangeNameY.value = 38;
        dom.valNameY.textContent = '38px';
        dom.rangeNameRight.value = 0;
        dom.valNameRight.textContent = '0px';
        dom.rangeNameWidth.value = 620;
        dom.valNameWidth.textContent = '620px';
      }
      updateVisualStyles();
      fitCardContent();
      saveDraft();
    });

    dom.rangeNameY.addEventListener('input', (e) => {
      state.autoFitName = false;
      if (dom.chkAutoFitName) dom.chkAutoFitName.checked = false;
      state.name_y = parseInt(e.target.value, 10);
      dom.valNameY.textContent = state.name_y + 'px';
      updateVisualStyles();
      saveDraft();
    });

    dom.rangeNameRight.addEventListener('input', (e) => {
      state.autoFitName = false;
      if (dom.chkAutoFitName) dom.chkAutoFitName.checked = false;
      state.name_right = parseInt(e.target.value, 10);
      dom.valNameRight.textContent = state.name_right + 'px';
      updateVisualStyles();
      saveDraft();
    });

    dom.rangeNameWidth.addEventListener('input', (e) => {
      state.autoFitName = false;
      if (dom.chkAutoFitName) dom.chkAutoFitName.checked = false;
      state.name_width = parseInt(e.target.value, 10);
      dom.valNameWidth.textContent = state.name_width + 'px';
      updateVisualStyles();
      fitCardContent();
      saveDraft();
    });

    dom.chkAutoFitCopy.addEventListener('change', (e) => {
      state.autoFitCopy = e.target.checked;
      if (state.autoFitCopy) {
        state.copy_y = 220;
        state.copy_width = 1300;
        state.copy_scale = 1;
        dom.rangeCopyY.value = 220;
        dom.valCopyY.textContent = '220px';
        dom.rangeCopyWidth.value = 1300;
        dom.valCopyWidth.textContent = '1300px';
        dom.rangeCopyScale.value = 1;
        dom.valCopyScale.textContent = '1.00x';
      }
      updateCopyStyles();
      fitCardContent();
      saveDraft();
    });

    dom.rangeCopyY.addEventListener('input', (e) => {
      state.autoFitCopy = false;
      if (dom.chkAutoFitCopy) dom.chkAutoFitCopy.checked = false;
      state.copy_y = parseInt(e.target.value, 10);
      dom.valCopyY.textContent = state.copy_y + 'px';
      updateCopyStyles();
      saveDraft();
    });

    dom.rangeCopyWidth.addEventListener('input', (e) => {
      state.autoFitCopy = false;
      if (dom.chkAutoFitCopy) dom.chkAutoFitCopy.checked = false;
      state.copy_width = parseInt(e.target.value, 10);
      dom.valCopyWidth.textContent = state.copy_width + 'px';
      updateCopyStyles();
      saveDraft();
    });

    dom.rangeCopyScale.addEventListener('input', (e) => {
      state.autoFitCopy = false;
      if (dom.chkAutoFitCopy) dom.chkAutoFitCopy.checked = false;
      state.copy_scale = parseFloat(e.target.value);
      dom.valCopyScale.textContent = state.copy_scale.toFixed(2) + 'x';
      updateCopyStyles();
      saveDraft();
    });

    // Boss Name font family dropdown
    dom.selectNameFont?.addEventListener('change', (e) => {
      state.name_font_family = e.target.value;
      updateVisualStyles();
      updateNameFontStatusBadge();
      saveDraft();
    });

    // Boss Name stroke toggle
    dom.chkNameStroke?.addEventListener('change', (e) => {
      state.name_stroke_enabled = e.target.checked;
      if (dom.nameStrokeControls) {
        dom.nameStrokeControls.style.display = state.name_stroke_enabled ? 'block' : 'none';
      }
      updateVisualStyles();
      saveDraft();
    });

    // Boss Name stroke width slider
    dom.rangeNameStrokeWidth?.addEventListener('input', (e) => {
      state.name_stroke_width = parseFloat(e.target.value);
      if (dom.valNameStrokeWidth) {
        dom.valNameStrokeWidth.textContent = state.name_stroke_width + 'px';
      }
      updateVisualStyles();
      saveDraft();
    });

    // Boss Name stroke color inputs
    dom.nameStrokeNativeColorPicker?.addEventListener('input', (e) => {
      setNameStrokeColor(e.target.value);
    });

    dom.nameStrokeHexColorInput?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
        setNameStrokeColor(val);
      }
    });

    // Mechanic text Font family dropdown
    dom.selectCopyFont?.addEventListener('change', (e) => {
      state.copy_font_family = e.target.value;
      updateCopyStyles();
      updateFontStatusBadge();
      saveDraft();
    });

    // Font upload button
    dom.btnUploadFontFile?.addEventListener('click', () => {
      dom.inputFontFile?.click();
    });

    dom.inputFontFile?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFontFileUpload(file);
      }
    });



    dom.selectionToolbar?.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
      }
    });

    dom.btnSelBold?.addEventListener('click', () => applyRichFormat('bold'));
    dom.btnSelItalic?.addEventListener('click', () => applyRichFormat('italic'));
    dom.btnSelUnderline?.addEventListener('click', () => applyRichFormat('underline'));
    dom.btnSelStrike?.addEventListener('click', () => applyRichFormat('strikeThrough'));

    // Selection toolbar quick font dropdown
    dom.selTextFontFamily?.addEventListener('change', (e) => {
      if (e.target.value) {
        applyFontSelection(e.target.value);
        e.target.value = '';
      }
    });

    // Quick font-size combobox (works on boss name + mechanic text selections).
    // Shows the current size; accepts a preset or any typed number; empty = auto.
    dom.selTextFontSize = document.getElementById('selTextFontSize');
    function commitFontSize() {
      if (!dom.selTextFontSize) return;
      const raw = (dom.selTextFontSize.value || '').trim();
      if (raw === '' || raw === '0') {
        applyFontSizeSelection('');            // reset to auto
      } else {
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n > 0) applyFontSizeSelection(String(n));
      }
      updateSelectionToolbarState();           // reflect the applied size
    }
    dom.selTextFontSize?.addEventListener('change', commitFontSize);
    dom.selTextFontSize?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); dom.selTextFontSize.blur(); }
    });
    // A <datalist> filters its options by the field's current value, so when the
    // field already holds a size (e.g. "50") the dropdown collapses to that one
    // match and looks empty. Clear the field on focus so the full preset list
    // shows; if the user picks/types nothing, restore the previous value on blur.
    dom.selTextFontSize?.addEventListener('focus', (e) => {
      e.target.dataset.prevSize = e.target.value;
      e.target.dataset.touched = '0';
      e.target.value = '';
    });
    dom.selTextFontSize?.addEventListener('input', (e) => {
      e.target.dataset.touched = '1';
    });
    dom.selTextFontSize?.addEventListener('blur', (e) => {
      if (e.target.dataset.touched !== '1' && e.target.dataset.prevSize != null) {
        e.target.value = e.target.dataset.prevSize;
      }
      delete e.target.dataset.prevSize;
      delete e.target.dataset.touched;
    });

    // ===== Outline Popover (new unified system) =====
    // Cache all outline popover elements
    dom.outlinePopover       = document.getElementById('outlinePopover');
    dom.rangeOutlineWidth    = document.getElementById('rangeOutlineWidth');
    dom.valOutlineWidth      = document.getElementById('valOutlineWidth');
    dom.pickerOutlineColor   = document.getElementById('pickerOutlineColor');
    dom.hexOutlineColor      = document.getElementById('hexOutlineColor');
    dom.outlineWidthRow      = document.getElementById('outlineWidthRow');
    dom.outlineOpacityRow    = document.getElementById('outlineOpacityRow');
    dom.outlineTextColorRow  = document.getElementById('outlineTextColorRow');
    dom.rangeOutlineOpacity  = document.getElementById('rangeOutlineOpacity');
    dom.valOutlineOpacity    = document.getElementById('valOutlineOpacity');
    dom.pickerOutlineTextColor = document.getElementById('pickerOutlineTextColor');
    dom.hexOutlineTextColor  = document.getElementById('hexOutlineTextColor');
    dom.btnOutlineRemove     = document.getElementById('btnOutlineRemove');
    dom.btnSelStrokeRemove   = document.getElementById('btnSelStrokeRemove');

    // Outline state
    if (!state.outline_mode)    state.outline_mode    = 'stroke';
    if (!state.outline_color)   state.outline_color   = '#ff0000';
    if (!state.outline_width)   state.outline_width   = 2;
    if (!state.outline_opacity) state.outline_opacity = 80;
    if (!state.outline_text)    state.outline_text    = '#ffffff';
    state.copy_stroke_width = state.copy_stroke_width || 2;
    state.copy_stroke_color = state.copy_stroke_color || '#ff0000';

    // ── helpers ──────────────────────────────────────────────────────────
    let _savedRange = null;

    function openOutlinePopover() {
      if (!dom.outlinePopover) return;
      // Sync controls from state
      const mode = state.outline_mode || 'stroke';
      dom.outlinePopover.querySelectorAll('.fceb-outline-mode-btn').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.mode === mode);
      });
      if (dom.rangeOutlineWidth)   dom.rangeOutlineWidth.value = state.outline_width || 2;
      if (dom.valOutlineWidth)     dom.valOutlineWidth.textContent = `${state.outline_width || 2}px`;
      if (dom.pickerOutlineColor)  dom.pickerOutlineColor.value = state.outline_color || '#ff0000';
      if (dom.hexOutlineColor)     dom.hexOutlineColor.value = state.outline_color || '#ff0000';
      if (dom.rangeOutlineOpacity) dom.rangeOutlineOpacity.value = state.outline_opacity || 80;
      if (dom.valOutlineOpacity)   dom.valOutlineOpacity.textContent = `${state.outline_opacity || 80}%`;
      if (dom.pickerOutlineTextColor) dom.pickerOutlineTextColor.value = state.outline_text || '#ffffff';
      if (dom.hexOutlineTextColor)    dom.hexOutlineTextColor.value = state.outline_text || '#ffffff';
      updateOutlineModeUI(mode);

      // Position adaptively near the selection
      positionOutlinePopover();
      dom.outlinePopover.style.display = 'flex';
    }

    function positionOutlinePopover() {
      if (!dom.outlinePopover) return;
      // Always drop down directly under the ⭕ outline button in the static toolbar.
      const btnRect = dom.btnSelStroke?.getBoundingClientRect();
      if (!btnRect) return;

      const popW = 244;
      const vw = window.innerWidth;
      const MARGIN = 8;

      let left = btnRect.left;
      let top  = btnRect.bottom + 6;
      // Clamp horizontally so it stays on screen
      if (left + popW > vw - MARGIN) left = vw - popW - MARGIN;
      if (left < MARGIN)             left = MARGIN;

      dom.outlinePopover.style.left = `${Math.round(left)}px`;
      dom.outlinePopover.style.top  = `${Math.round(top)}px`;
    }

    function closeOutlinePopover() {
      if (dom.outlinePopover) dom.outlinePopover.style.display = 'none';
    }

    function updateOutlineModeUI(mode) {
      // Pill/Rect now mirror the Stroke menu: Width + Color + Remove only.
      // No opacity control and no text-color control for any mode.
      if (dom.outlineWidthRow)     dom.outlineWidthRow.style.display     = 'flex';
      if (dom.outlineOpacityRow)   dom.outlineOpacityRow.style.display   = 'none';
      if (dom.outlineTextColorRow) dom.outlineTextColorRow.style.display = 'none';
    }

    // If the selection already covers exactly one existing outline span,
    // return it so we can restyle it in place. Restyling in place (instead of
    // unwrap + re-wrap) is what keeps the text selection alive across repeated
    // slider drags — extracting/re-inserting the nodes collapses the range.
    function getExactWrappingOutlineSpan(range) {
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 1 ? container : container.parentElement;
      const span = el?.closest('.fce-text-stroke, .fce-text-badge');
      if (!span) return null;
      const spanRange = document.createRange();
      spanRange.selectNodeContents(span);
      const selText = range.toString();
      if (selText.length > 0 && selText === spanRange.toString()) return span;
      return null;
    }

    function styleOutlineSpan(span, mode, w, color) {
      if (mode === 'stroke') {
        span.className = 'fce-text-stroke';
        span.style.webkitTextStroke = `${w}px ${color}`;
        span.style.paintOrder = 'stroke fill';
        span.style.border = '';
      } else {
        // Pill / Rect = a colored border (окантовка) around the text.
        // Same controls as stroke: width + color. No fill, no text-color change.
        span.className = `fce-text-badge fce-text-badge--${mode}`;
        span.style.webkitTextStroke = '';
        span.style.paintOrder = '';
        span.style.border = `${w}px solid ${color}`;
      }
    }

    function applyOutlineToSelection() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const mode  = state.outline_mode || 'stroke';
      const color = state.outline_color || '#ff0000';
      const w = state.outline_width || 2;

      // Fast path: the selection is already exactly one outline span — just
      // restyle it and keep the selection where it is.
      const existing = getExactWrappingOutlineSpan(range);
      if (existing) {
        styleOutlineSpan(existing, mode, w, color);
        const keep = document.createRange();
        keep.selectNodeContents(existing);
        sel.removeAllRanges();
        sel.addRange(keep);
        _savedRange = keep.cloneRange();
        afterRichEdit();
        return;
      }

      // Otherwise remove any partial outline spans and wrap the selection fresh.
      removeOutlineSpans(range);

      const sel2 = window.getSelection();
      if (!sel2 || sel2.rangeCount === 0) return;
      const range2 = sel2.getRangeAt(0);
      if (range2.collapsed) return;

      const selectedContent = range2.extractContents();
      const span = document.createElement('span');
      styleOutlineSpan(span, mode, w, color);

      span.appendChild(selectedContent);
      range2.insertNode(span);

      // Restore selection over the new span
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel2.removeAllRanges();
      sel2.addRange(newRange);
      // Keep the saved range in sync with the freshly-wrapped span so that
      // repeated slider drags (which blur the editable) don't lose the selection.
      _savedRange = newRange.cloneRange();

      afterRichEdit();
    }

    function removeOutlineSpans(range) {
      // Unwrap any outline span that contains or intersects with cursor
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 1 ? container : container.parentElement;

      // Check ancestors
      const ancestor = el?.closest('.fce-text-stroke, .fce-text-badge, span[style*="-webkit-text-stroke"]');
      if (ancestor) {
        const parent = ancestor.parentNode;
        while (ancestor.firstChild) parent.insertBefore(ancestor.firstChild, ancestor);
        ancestor.remove();
      }

      // Check descendants in selected range
      if (!window.getSelection()?.isCollapsed) {
        const frag = range.cloneContents();
        const spans = frag.querySelectorAll('.fce-text-stroke, .fce-text-badge, span[style*="-webkit-text-stroke"]');
        if (spans.length > 0) {
          const docFrag = range.extractContents();
          docFrag.querySelectorAll('.fce-text-stroke, .fce-text-badge, span[style*="-webkit-text-stroke"]').forEach((s) => {
            const p = s.parentNode;
            while (s.firstChild) p.insertBefore(s.firstChild, s);
            s.remove();
          });
          range.insertNode(docFrag);
        }
      }
      afterRichEdit();
    }

    // ── ⭕ open popover button ─────────────────────────────────────────
    dom.btnSelStroke?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dom.outlinePopover?.style.display !== 'none') {
        closeOutlinePopover();
        return;
      }
      // Save selection before popover opens (inputs steal focus)
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        _savedRange = sel.getRangeAt(0).cloneRange();
      }
      openOutlinePopover();
    });

    // ── ⭕✕ quick remove button in toolbar ───────────────────────────
    dom.btnSelStrokeRemove?.addEventListener('click', (e) => {
      e.stopPropagation();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        removeOutlineSpans(sel.getRangeAt(0));
      }
    });

    // ── Mode tabs ─────────────────────────────────────────────────────
    document.querySelectorAll('.fceb-outline-mode-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.outline_mode = btn.dataset.mode;
        document.querySelectorAll('.fceb-outline-mode-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        updateOutlineModeUI(btn.dataset.mode);
        // Restore selection and auto-apply
        restoreSavedRange();
        applyOutlineToSelection();
      });
    });

    // ── Width slider (stroke mode) ────────────────────────────────────
    dom.rangeOutlineWidth?.addEventListener('input', (e) => {
      state.outline_width = parseFloat(e.target.value);
      if (dom.valOutlineWidth) dom.valOutlineWidth.textContent = `${state.outline_width}px`;
      // Also sync sidebar if exists
      if (dom.rangeCopyStrokeWidth) dom.rangeCopyStrokeWidth.value = state.outline_width;
      if (dom.valCopyStrokeWidth)   dom.valCopyStrokeWidth.textContent = `${state.outline_width}px`;
      state.copy_stroke_width = state.outline_width;
      restoreSavedRange();
      applyOutlineToSelection();
    });

    // ── Color picker ─────────────────────────────────────────────────
    dom.pickerOutlineColor?.addEventListener('input', (e) => {
      state.outline_color = e.target.value;
      state.copy_stroke_color = e.target.value;
      if (dom.hexOutlineColor) dom.hexOutlineColor.value = e.target.value;
      // Sync sidebar
      if (dom.strokeNativeColorPicker) dom.strokeNativeColorPicker.value = e.target.value;
      if (dom.strokeHexColorInput)     dom.strokeHexColorInput.value = e.target.value;
      if (dom.strokeColorPreviewDot)   dom.strokeColorPreviewDot.style.background = e.target.value;
      restoreSavedRange();
      applyOutlineToSelection();
    });

    dom.hexOutlineColor?.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.outline_color = val;
        state.copy_stroke_color = val;
        if (dom.pickerOutlineColor) dom.pickerOutlineColor.value = val;
        restoreSavedRange();
        applyOutlineToSelection();
      }
    });

    // ── Opacity (pill/rect) ───────────────────────────────────────────
    dom.rangeOutlineOpacity?.addEventListener('input', (e) => {
      state.outline_opacity = parseInt(e.target.value, 10);
      if (dom.valOutlineOpacity) dom.valOutlineOpacity.textContent = `${state.outline_opacity}%`;
      restoreSavedRange();
      applyOutlineToSelection();
    });

    // ── Text color (pill/rect) ────────────────────────────────────────
    dom.pickerOutlineTextColor?.addEventListener('input', (e) => {
      state.outline_text = e.target.value;
      if (dom.hexOutlineTextColor) dom.hexOutlineTextColor.value = e.target.value;
      restoreSavedRange();
      applyOutlineToSelection();
    });

    dom.hexOutlineTextColor?.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.outline_text = val;
        if (dom.pickerOutlineTextColor) dom.pickerOutlineTextColor.value = val;
        restoreSavedRange();
        applyOutlineToSelection();
      }
    });

    // ── Remove button inside popover ──────────────────────────────────
    dom.btnOutlineRemove?.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreSavedRange();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) removeOutlineSpans(sel.getRangeAt(0));
      closeOutlinePopover();
    });

    // ── Sidebar stroke controls still work (sync to new state) ────────
    dom.btnApplyCopyStroke?.addEventListener('click', () => {
      state.outline_mode = 'stroke';
      applyStrokeToSelection();
    });
    dom.btnRemoveCopyStroke?.addEventListener('click', () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) removeOutlineSpans(sel.getRangeAt(0));
    });
    dom.rangeCopyStrokeWidth?.addEventListener('input', (e) => {
      state.outline_width = parseFloat(e.target.value);
      state.copy_stroke_width = state.outline_width;
      if (dom.valCopyStrokeWidth)  dom.valCopyStrokeWidth.textContent = `${state.outline_width}px`;
      if (dom.rangeOutlineWidth)   dom.rangeOutlineWidth.value = state.outline_width;
      if (dom.valOutlineWidth)     dom.valOutlineWidth.textContent = `${state.outline_width}px`;
    });
    dom.strokeNativeColorPicker?.addEventListener('input', (e) => {
      state.outline_color = e.target.value;
      state.copy_stroke_color = e.target.value;
      if (dom.strokeHexColorInput)   dom.strokeHexColorInput.value = e.target.value;
      if (dom.strokeColorPreviewDot) dom.strokeColorPreviewDot.style.background = e.target.value;
      if (dom.pickerOutlineColor)    dom.pickerOutlineColor.value = e.target.value;
      if (dom.hexOutlineColor)       dom.hexOutlineColor.value = e.target.value;
    });
    dom.strokeHexColorInput?.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.outline_color = val;
        state.copy_stroke_color = val;
        if (dom.strokeNativeColorPicker) dom.strokeNativeColorPicker.value = val;
        if (dom.strokeColorPreviewDot)   dom.strokeColorPreviewDot.style.background = val;
        if (dom.pickerOutlineColor)      dom.pickerOutlineColor.value = val;
        if (dom.hexOutlineColor)         dom.hexOutlineColor.value = val;
      }
    });

    // ── helper to restore saved selection range ────────────────────────
    function restoreSavedRange() {
      if (!_savedRange) return;
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(_savedRange.cloneRange());
      }
    }

    // ── Close popover on outside click ────────────────────────────────
    document.addEventListener('click', (e) => {
      if (dom.outlinePopover && dom.outlinePopover.style.display !== 'none') {
        if (!dom.outlinePopover.contains(e.target) && e.target !== dom.btnSelStroke) {
          closeOutlinePopover();
          // Keep the styled text highlighted after finishing, unless the user
          // clicked into an editor to make a new selection.
          const clickedEditor = dom.cardCopy?.contains(e.target) || dom.cardNameText?.contains(e.target);
          if (!clickedEditor) restoreSavedRange();
        }
      }
    });

    document.querySelectorAll('.fceb-sel-btn--color').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyColorSelection(btn.dataset.color || '#ff0000');
      });
    });

    dom.textCustomColorPicker?.addEventListener('input', (e) => {
      applyColorSelection(e.target.value);
    });

    dom.btnSelectionClear?.addEventListener('click', clearSelectionFormatting);
    dom.btnSelectionClose?.addEventListener('click', () => {
      if (dom.selectionToolbar) {
        dom.selectionToolbar.style.display = 'none';
      }
    });
    document.addEventListener('selectionchange', handleSelectionChange);


    dom.btnToggleFullscreen.addEventListener('click', toggleFullscreen);

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) {
            e.preventDefault();
            applyRichFormat('bold');
          }
        } else if (e.key === 'i' || e.key === 'I') {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) {
            e.preventDefault();
            applyRichFormat('italic');
          }
        } else if (e.key === 'u' || e.key === 'U') {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) {
            e.preventDefault();
            applyRichFormat('underline');
          }
        } else if (e.key === 'r' || e.key === 'R') {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) {
            e.preventDefault();
            applyColorSelection('#ff0000');
          }
        }
      }
    });

    // Dual export & ZIP buttons
    dom.btnQuickExportZip?.addEventListener('click', () => downloadZipPackage());
    dom.btnQuickCopyJson?.addEventListener('click', () => downloadZipPackage());
    dom.btnExportZipPackage?.addEventListener('click', () => downloadZipPackage());
    dom.btnExportDualJson?.addEventListener('click', () => downloadZipPackage());
    dom.btnExportCopyModal?.addEventListener('click', () => openExportModalWithTab('dual'));
    dom.btnDownloadPng?.addEventListener('click', () => downloadCardPng());
    dom.btnExportDownloadPng?.addEventListener('click', () => downloadCardPng());
    dom.btnExportCopyHtml?.addEventListener('click', () => copyCardHtml());

    // Modal tabs
    dom.modalTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        dom.modalTabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.modalActiveTab = tab.dataset.modaltab;
        renderModalContent();
      });
    });

    dom.btnModalClose.addEventListener('click', closeModal);
    dom.modalBackdrop.addEventListener('click', closeModal);
    dom.btnModalCopy.addEventListener('click', handleModalCopy);
    dom.btnModalDownload.addEventListener('click', handleModalDownload);
  }

  function renderAll() {
    renderMechanicsList();
    renderCardCopy();
    updateVisualStyles();
    updateArtTransform();
    updateColorPalette();
    updateArtStatusBadge();
    fitCardContent();
    updateSceneScale();
    updateJsonPreview();
  }

  function syncFormInputsFromState() {
    const active = getActiveTranslation();
    if (dom.inputBossNameRu) dom.inputBossNameRu.value = state.translations.ru.name || '';
    if (dom.inputBossNameEn) dom.inputBossNameEn.value = state.translations.en.name || '';
    if (dom.inputBossName) dom.inputBossName.value = active.name || '';
    dom.inputBossSlug.value = state.slug || '';
    dom.inputBossId.value = state.boss_id || '';
    dom.inputSourcePsd.value = state.source_psd || '';
    dom.inputArtUrl.value = state.art || '';

    dom.rangeArtScale.value = state.art_scale;
    dom.valArtScale.textContent = Number(state.art_scale).toFixed(2) + 'x';
    dom.rangeArtX.value = state.art_x;
    dom.valArtX.textContent = state.art_x + 'px';
    dom.rangeArtY.value = state.art_y;
    dom.valArtY.textContent = state.art_y + 'px';

    const isArtDefault = (Math.abs(Number(state.art_scale) - 1.08) < 0.001) && Number(state.art_x) === -96 && Number(state.art_y) === 0;
    state.autoFitArt = isArtDefault;
    if (dom.chkAutoFitArt) {
      dom.chkAutoFitArt.checked = isArtDefault;
    }

    if (dom.chkAutoFitName) {
      dom.chkAutoFitName.checked = state.autoFitName !== false;
    }
    dom.rangeNameY.value = state.name_y;
    dom.valNameY.textContent = state.name_y + 'px';
    dom.rangeNameRight.value = state.name_right;
    dom.valNameRight.textContent = state.name_right + 'px';
    dom.rangeNameWidth.value = state.name_width;
    dom.valNameWidth.textContent = state.name_width + 'px';

    if (dom.chkAutoFitCopy) {
      dom.chkAutoFitCopy.checked = state.autoFitCopy !== false;
    }
    dom.rangeCopyY.value = state.copy_y;
    dom.valCopyY.textContent = state.copy_y + 'px';
    dom.rangeCopyWidth.value = state.copy_width;
    dom.valCopyWidth.textContent = state.copy_width + 'px';
    dom.rangeCopyScale.value = state.copy_scale;
    dom.valCopyScale.textContent = Number(state.copy_scale).toFixed(2) + 'x';

    // Sync Boss Name typography inputs
    if (dom.selectNameFont) {
      dom.selectNameFont.value = state.name_font_family || 'var(--fce-font-title)';
    }
    if (dom.chkNameStroke) {
      dom.chkNameStroke.checked = state.name_stroke_enabled !== false;
    }
    if (dom.nameStrokeControls) {
      dom.nameStrokeControls.style.display = state.name_stroke_enabled !== false ? 'block' : 'none';
    }
    if (dom.rangeNameStrokeWidth) {
      dom.rangeNameStrokeWidth.value = state.name_stroke_width ?? 3;
    }
    if (dom.valNameStrokeWidth) {
      dom.valNameStrokeWidth.textContent = `${state.name_stroke_width ?? 3}px`;
    }
    if (dom.nameStrokeNativeColorPicker) {
      dom.nameStrokeNativeColorPicker.value = state.name_stroke_color || '#111111';
    }
    if (dom.nameStrokeHexColorInput) {
      dom.nameStrokeHexColorInput.value = state.name_stroke_color || '#111111';
    }
    if (dom.nameStrokeColorPreviewDot) {
      dom.nameStrokeColorPreviewDot.style.background = state.name_stroke_color || '#111111';
    }
    updateNameFontStatusBadge();

    // Sync mechanic text font and stroke inputs
    if (dom.selectCopyFont) {
      dom.selectCopyFont.value = state.copy_font_family || 'var(--fce-font-copy)';
    }
    if (dom.copyStrokeControls) {
      dom.copyStrokeControls.style.display = 'flex'; // Always shown — per-selection tool
    }
    if (dom.rangeCopyStrokeWidth) {
      dom.rangeCopyStrokeWidth.value = state.copy_stroke_width || 2;
    }
    if (dom.valCopyStrokeWidth) {
      dom.valCopyStrokeWidth.textContent = `${state.copy_stroke_width || 2}px`;
    }
    if (dom.strokeNativeColorPicker) {
      dom.strokeNativeColorPicker.value = state.copy_stroke_color || '#000000';
    }
    if (dom.strokeHexColorInput) {
      dom.strokeHexColorInput.value = state.copy_stroke_color || '#000000';
    }
    if (dom.strokeColorPreviewDot) {
      dom.strokeColorPreviewDot.style.background = state.copy_stroke_color || '#000000';
    }
    renderBossNameInto(active);
    setBossArtSource(state.art || '');
    renderExtraImages();
    renderArtLayersChips();
    selectImageTarget(state.activeImageTarget || 'boss');
    updateArtTransform();
  }

  function renderMechanicsList() {
    if (!dom.linesList) return;
    dom.linesList.innerHTML = '';
    
    const active = getActiveTranslation();
    const count = active.mechanics.length;
    dom.lineCountBadge.textContent = `${count} ${getPluralizedWord(count, t('lineSingular'), t('lineFew'), t('lineMany'))}`;

    active.mechanics.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'fceb-line-item';
      itemEl.dataset.lineIndex = index;

      itemEl.innerHTML = `
        <div class="fceb-line-item__index-wrap">
          <input type="text" class="fceb-line-item__index-input" value="${escapeHtml(item.index || String(index + 1))}" title="Номер строки (например: 0, 1, 2, A...)" />
          <span class="fceb-line-item__dot">.</span>
        </div>
        <div class="fceb-line-item__editor" contenteditable="true" spellcheck="false" placeholder="${t('linePlaceholder')}">${item.html || ''}</div>
        <div class="fceb-line-item__actions">
          <button class="fceb-item-btn" data-action="up" title="${t('btnMoveUp')}" ${index === 0 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>▲</button>
          <button class="fceb-item-btn" data-action="down" title="${t('btnMoveDown')}" ${index === active.mechanics.length - 1 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>▼</button>
          <button class="fceb-item-btn fceb-item-btn--del" data-action="delete" title="${t('btnDeleteLine')}">✕</button>
        </div>
      `;

      const indexInput = itemEl.querySelector('.fceb-line-item__index-input');
      const editor = itemEl.querySelector('.fceb-line-item__editor');
      const btnUp = itemEl.querySelector('[data-action="up"]');
      const btnDown = itemEl.querySelector('[data-action="down"]');
      const btnDelete = itemEl.querySelector('[data-action="delete"]');

      indexInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (state.translations.ru.mechanics[index]) {
          state.translations.ru.mechanics[index].index = val;
        }
        if (state.translations.en.mechanics[index]) {
          state.translations.en.mechanics[index].index = val;
        }
        syncLineToCard(index);
        saveDraft();
      });

      editor.addEventListener('focus', () => {
        itemEl.classList.add('is-focused');
      });

      editor.addEventListener('blur', () => {
        itemEl.classList.remove('is-focused');
      });

      editor.addEventListener('input', () => {
        active.mechanics[index].html = editor.innerHTML;
        syncLineToCard(index);
        fitCardContent();
        saveDraft();
      });

      if (btnUp) {
        btnUp.addEventListener('click', () => moveLine(index, -1));
      }
      if (btnDown) {
        btnDown.addEventListener('click', () => moveLine(index, 1));
      }
      if (btnDelete) {
        btnDelete.addEventListener('click', () => deleteLine(index));
      }

      dom.linesList.appendChild(itemEl);
    });
  }

  function renderCardCopy() {
    if (!dom.cardCopy) return;

    const active = getActiveTranslation();
    let html = active.mechanics
      .map((item, index) => {
        return `
          <article class="fce-card__line" data-line-index="${index}">
            <div class="fce-card__line-tools">
              <button class="fce-card__tool-btn" data-action="up" title="${t('btnMoveUp')}" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
              <button class="fce-card__tool-btn" data-action="down" title="${t('btnMoveDown')}" ${index === active.mechanics.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
              <button class="fce-card__tool-btn fce-card__tool-btn--del" data-action="delete" title="${t('btnDeleteLine')}">✕</button>
            </div>
            <p class="fce-card__text" contenteditable="true" spellcheck="false"><span class="fce-card__index" contenteditable="false">${escapeHtml(item.index || String(index + 1))}.</span>${item.html || ''}</p>
          </article>
        `;
      })
      .join('');

    html += `
      <button class="fce-card__add-btn" id="cardAddLineBtn" type="button" title="${t('btnAddLineOnCard')}">
        <span>+</span> <span>${t('btnAddLineOnCard')}</span>
      </button>
    `;

    dom.cardCopy.innerHTML = html;

    const cardAddBtn = document.getElementById('cardAddLineBtn');
    if (cardAddBtn) {
      cardAddBtn.addEventListener('click', addMechanicLine);
    }

    dom.cardCopy.querySelectorAll('.fce-card__line').forEach((lineArticle) => {
      const idx = parseInt(lineArticle.dataset.lineIndex, 10);
      const p = lineArticle.querySelector('.fce-card__text');
      const btnUp = lineArticle.querySelector('[data-action="up"]');
      const btnDown = lineArticle.querySelector('[data-action="down"]');
      const btnDel = lineArticle.querySelector('[data-action="delete"]');

      if (p) {
        p.addEventListener('input', () => {
          const indexSpan = p.querySelector('.fce-card__index');
          let inner = p.innerHTML;
          if (indexSpan) {
            inner = inner.replace(indexSpan.outerHTML, '');
          }
          active.mechanics[idx].html = inner.trim();
          
          const sidebarEditor = dom.linesList?.querySelector(`.fceb-line-item[data-line-index="${idx}"] .fceb-line-item__editor`);
          if (sidebarEditor) {
            sidebarEditor.innerHTML = active.mechanics[idx].html;
          }

          fitCardContent();
          saveDraft();
        });
      }

      if (btnUp) {
        btnUp.addEventListener('click', () => moveLine(idx, -1));
      }
      if (btnDown) {
        btnDown.addEventListener('click', () => moveLine(idx, 1));
      }
      if (btnDel) {
        btnDel.addEventListener('click', () => deleteLine(idx));
      }
    });

    updateCopyStyles();
  }

  function syncLineToCard(index) {
    const active = getActiveTranslation();
    const cardP = dom.cardCopy?.querySelector(`.fce-card__line[data-line-index="${index}"] .fce-card__text`);
    if (cardP && active.mechanics[index]) {
      const indexNum = active.mechanics[index].index || String(index + 1);
      cardP.innerHTML = `<span class="fce-card__index" contenteditable="false">${escapeHtml(indexNum)}.</span>${active.mechanics[index].html || ''}`;
    }
  }

  function updateVisualStyles() {
    dom.cardVisual.style.setProperty('--fce-name-color', state.name_color || '#f16937');
    dom.cardVisual.style.setProperty('--fce-art-scale', String(state.art_scale));
    dom.cardVisual.style.setProperty('--fce-art-x', `${state.art_x}px`);
    dom.cardVisual.style.setProperty('--fce-art-y', `${state.art_y}px`);
    dom.cardVisual.style.setProperty('--fce-name-right', `${state.name_right}px`);
    dom.cardVisual.style.setProperty('--fce-name-y', `${state.name_y}px`);
    dom.cardVisual.style.setProperty('--fce-name-width', `${state.name_width}px`);
    dom.cardVisual.style.setProperty('--fce-name-scale', String(state.name_scale));

    // Boss Name custom typography & outline
    dom.cardVisual.style.setProperty('--fce-custom-name-font', state.name_font_family || 'var(--fce-font-title)');
    const nameStrokeWidth = state.name_stroke_enabled ? (state.name_stroke_width ?? 3) : 0;
    const nameStrokeColor = state.name_stroke_color || 'rgba(17, 17, 17, 0.92)';
    dom.cardVisual.style.setProperty('--fce-name-stroke-width', `${nameStrokeWidth}px`);
    dom.cardVisual.style.setProperty('--fce-name-stroke-color', nameStrokeColor);
  }

  function setNameStrokeColor(color) {
    state.name_stroke_color = color;
    if (dom.nameStrokeNativeColorPicker) dom.nameStrokeNativeColorPicker.value = color.startsWith('#') && color.length === 7 ? color : '#111111';
    if (dom.nameStrokeHexColorInput) dom.nameStrokeHexColorInput.value = color;
    if (dom.nameStrokeColorPreviewDot) dom.nameStrokeColorPreviewDot.style.background = color;
    updateVisualStyles();
    saveDraft();
  }

  function updateNameFontStatusBadge() {
    if (!dom.nameFontStatusBadge) return;
    if (state.customFontFileName) {
      dom.nameFontStatusBadge.textContent = state.customFontFileName;
      dom.nameFontStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else if (state.name_font_family && state.name_font_family !== 'var(--fce-font-title)') {
      const cleanName = state.name_font_family.split(',')[0].replace(/['"]/g, '');
      dom.nameFontStatusBadge.textContent = cleanName;
      dom.nameFontStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else {
      dom.nameFontStatusBadge.textContent = 'Haettenschweiler';
      dom.nameFontStatusBadge.className = 'fceb-badge fceb-badge--gold';
    }
  }

  function updateCopyStyles() {
    if (!dom.cardCopy) return;
    dom.cardCopy.style.setProperty('--fce-copy-width', `${state.copy_width || 1300}px`);
    dom.cardCopy.style.setProperty('--fce-copy-y', `${state.copy_y || 220}px`);
    dom.cardCopy.style.setProperty('--fce-copy-scale', String(state.copy_scale || 1));
    dom.cardCopy.style.setProperty('--fce-custom-font', state.copy_font_family || 'var(--fce-font-copy)');

    const strokeWidth = state.copy_stroke_enabled ? (state.copy_stroke_width || 2) : 0;
    const strokeColor = state.copy_stroke_color || '#000000';
    dom.cardCopy.style.setProperty('--fce-copy-stroke-width', `${strokeWidth}px`);
    dom.cardCopy.style.setProperty('--fce-copy-stroke-color', strokeColor);
  }

  function setCopyStrokeColor(color) {
    state.copy_stroke_color = color;
    if (dom.strokeNativeColorPicker) dom.strokeNativeColorPicker.value = color.startsWith('#') && color.length === 7 ? color : '#000000';
    if (dom.strokeHexColorInput) dom.strokeHexColorInput.value = color;
    if (dom.strokeColorPreviewDot) dom.strokeColorPreviewDot.style.background = color;
    updateCopyStyles();
    saveDraft();
  }

  function updateFontStatusBadge() {
    if (!dom.fontStatusBadge) return;
    if (state.customFontFileName) {
      dom.fontStatusBadge.textContent = state.customFontFileName;
      dom.fontStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else if (state.copy_font_family && state.copy_font_family !== 'var(--fce-font-copy)') {
      const cleanName = state.copy_font_family.split(',')[0].replace(/['"]/g, '');
      dom.fontStatusBadge.textContent = cleanName;
      dom.fontStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else {
      dom.fontStatusBadge.textContent = t('badgeFontOfficial');
      dom.fontStatusBadge.className = 'fceb-badge';
    }
  }

  function addFontOptionToDropdown(fontName, label) {
    const copyFontValue = `"${fontName}", var(--fce-font-copy)`;
    const nameFontValue = `"${fontName}", var(--fce-font-title)`;

    if (dom.selectCopyFont) {
      let opt = Array.from(dom.selectCopyFont.options).find(o => o.value === copyFontValue);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = copyFontValue;
        opt.textContent = label;
        dom.selectCopyFont.appendChild(opt);
      }
    }

    if (dom.selectNameFont) {
      let opt = Array.from(dom.selectNameFont.options).find(o => o.value === nameFontValue);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = nameFontValue;
        opt.textContent = label;
        dom.selectNameFont.appendChild(opt);
      }
    }

    if (dom.selTextFontFamily) {
      let opt = Array.from(dom.selTextFontFamily.options).find(o => o.value === copyFontValue);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = copyFontValue;
        opt.textContent = fontName;
        dom.selTextFontFamily.appendChild(opt);
      }
    }
  }

  // Fonts bundled in the project, shown as one-line specimens in the Typography tab.
  const SPECIMEN_FONTS = [
    { label: 'Haettenschweiler', css: "'Haettenschweiler', 'Arial Narrow', Impact, sans-serif" },
    { label: 'Franklin Gothic Medium Cond', css: 'var(--fce-font-copy)' },
    { label: 'Manrope', css: "'Manrope', sans-serif" },
    { label: 'Spectral', css: "'Spectral', serif" },
    { label: 'Impact', css: "'Impact', sans-serif" },
    { label: 'Arial Narrow', css: "'Arial Narrow', sans-serif" },
    { label: 'JetBrains Mono', css: "'JetBrains Mono', monospace" },
  ];

  function renderFontSpecimens() {
    const list = document.getElementById('fontSpecimenList');
    if (!list) return;
    const fonts = [...SPECIMEN_FONTS];
    // Newly uploaded fonts are prepended to the top of the list.
    if (state.customFontName) {
      fonts.unshift({
        label: `${state.customFontFileName || state.customFontName} (загружен)`,
        css: `"${state.customFontName}", var(--fce-font-copy)`,
        uploaded: true,
      });
    }
    list.innerHTML = '';
    fonts.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'fceb-font-specimen' + (f.uploaded ? ' is-uploaded' : '');
      row.style.fontFamily = f.css;
      row.textContent = f.label;
      row.title = f.label;
      list.appendChild(row);
    });
    const count = document.getElementById('fontSpecimenCount');
    if (count) count.textContent = String(fonts.length);
  }

  async function handleFontFileUpload(file) {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fontFace = new FontFace(fontName, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        state.customFontName = fontName;
        state.customFontFileName = file.name;
        state.customFontFormat = file.name.split('.').pop().toLowerCase();
        state.customFontData = base64;
        state.customFontBuffer = arrayBuffer;
        state.copy_font_family = `"${fontName}", var(--fce-font-copy)`;

        addFontOptionToDropdown(fontName, `${file.name} (Загружен)`);
        if (dom.selectCopyFont) dom.selectCopyFont.value = state.copy_font_family;

        updateCopyStyles();
        updateFontStatusBadge();
        renderFontSpecimens();
        saveDraft();
        showToast(t('toastFontLoaded', { name: file.name }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[FCE Builder] Error loading font file:', err);
      showToast('Ошибка загрузки файла шрифта!');
    }
  }

  function updateArtStatusBadge() {
    if (!dom.artStatusBadge) return;
    if (state.art) {
      dom.artStatusBadge.textContent = t('badgeReady');
      dom.artStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else {
      dom.artStatusBadge.textContent = t('badgeNoArt');
      dom.artStatusBadge.className = 'fceb-badge';
    }
  }

  function updateArtTransform() {
    dom.cardVisual.style.setProperty('--fce-art-scale', String(state.art_scale));
    dom.cardVisual.style.setProperty('--fce-art-x', `${state.art_x}px`);
    dom.cardVisual.style.setProperty('--fce-art-y', `${state.art_y}px`);
  }

  function getCopyNaturalHeight() {
    if (!dom.cardCopy) return 0;
    const lines = dom.cardCopy.querySelectorAll('.fce-card__line');
    if (!lines.length) return dom.cardCopy.scrollHeight;
    let total = 0;
    lines.forEach((line, i) => {
      total += line.offsetHeight;
      if (i > 0) total += 12; // margin-top: 12px
    });
    return total;
  }

  function fitCardContent() {
    if (!dom.cardCopy) return;

    if (state.autoFitCopy) {
      const baseTop = Number.isFinite(Number(state.copy_y)) ? Number(state.copy_y) : 220;
      const copyWidth = Number.isFinite(Number(state.copy_width)) ? Number(state.copy_width) : 1300;
      let copyTop = baseTop;
      let copyScale = 1;

      dom.cardCopy.style.setProperty('--fce-copy-width', `${copyWidth}px`);
      dom.cardCopy.style.setProperty('--fce-copy-y', `${copyTop}px`);
      dom.cardCopy.style.setProperty('--fce-copy-scale', '1');

      const naturalHeight = getCopyNaturalHeight();
      const availableHeight = 1080 - baseTop;
      const centeredOffset = Math.max(0, (availableHeight - naturalHeight * copyScale) / 2);
      const centeredTop = baseTop + Math.min(42, centeredOffset);
      const overflowTop = Math.max(18, 916 - naturalHeight);
      copyTop = naturalHeight > 696 ? overflowTop : centeredTop;
      dom.cardCopy.style.setProperty('--fce-copy-y', `${copyTop}px`);

      const finalAvailableHeight = 1080 - copyTop;
      const scaledHeight = naturalHeight * copyScale;
      if (scaledHeight > finalAvailableHeight) {
        copyScale = Math.max(0.84, finalAvailableHeight / naturalHeight);
        dom.cardCopy.style.setProperty('--fce-copy-scale', copyScale.toFixed(4));
      }

      if (dom.rangeCopyY && dom.valCopyY) {
        dom.rangeCopyY.value = Math.round(copyTop);
        dom.valCopyY.textContent = `${Math.round(copyTop)}px`;
      }
      if (dom.rangeCopyScale && dom.valCopyScale) {
        dom.rangeCopyScale.value = Number(copyScale.toFixed(2));
        dom.valCopyScale.textContent = `${copyScale.toFixed(2)}x`;
      }
    }

    if (dom.cardNameText && dom.cardVisual) {
      const baseWidth = state.name_width || DEFAULT_NAME_WIDTH;
      dom.cardVisual.style.setProperty('--fce-name-width', `${baseWidth}px`);
      dom.cardVisual.style.setProperty('--fce-name-scale', '1');

      if (state.autoFitName) {
        const naturalWidth = dom.cardNameText.scrollWidth;
        if (naturalWidth > baseWidth) {
          const fittedScale = Math.max(0.72, baseWidth / naturalWidth);
          dom.cardVisual.style.setProperty('--fce-name-scale', fittedScale.toFixed(4));
          state.name_scale = parseFloat(fittedScale.toFixed(4));
        } else {
          state.name_scale = 1;
        }
      }
    }
  }

  function updateSceneScale() {
    if (!dom.canvasStage || !dom.cardViewport) return;

    let scale = 0.65;
    const stageWidth = dom.canvasStage.clientWidth - 48;
    const stageHeight = dom.canvasStage.clientHeight - 48;

    if (state.zoomMode === 'auto' || state.zoomMode === 'fit' || !state.zoomMode) {
      const scaleX = stageWidth / SCENE_WIDTH;
      const scaleY = stageHeight / SCENE_HEIGHT;
      scale = Math.min(scaleX, scaleY, 1);
      scale = Math.max(scale, 0.25);
    } else {
      scale = parseFloat(state.zoomMode) || 0.65;
    }

    state.scale = scale;
    dom.cardViewport.style.setProperty('--fce-scale', scale.toFixed(5));
    dom.cardViewport.style.width = `${Math.round(SCENE_WIDTH * scale)}px`;
    dom.cardViewport.style.height = `${Math.round(SCENE_HEIGHT * scale)}px`;
  }

  let colorPickerState = {
    h: 16,
    s: 77,
    v: 95,
    isDraggingSpectrum: false,
    isDraggingHue: false
  };

  function hexToHsv(hex) {
    if (!hex || !hex.startsWith('#')) return { h: 0, s: 100, v: 100, r: 255, g: 0, b: 0 };
    let cleanHex = hex.slice(1);
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return { h: 0, s: 100, v: 100, r: 255, g: 0, b: 0 };

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === rNorm) {
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
      } else if (max === gNorm) {
        h = ((bNorm - rNorm) / d + 2) / 6;
      } else {
        h = ((rNorm - gNorm) / d + 4) / 6;
      }
    }

    const s = max === 0 ? 0 : d / max;
    const v = max;

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
      r,
      g,
      b
    };
  }

  function hsvToRgb(h, s, v) {
    h = (h % 360 + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    v = Math.max(0, Math.min(100, v)) / 100;

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbToHexCode(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  }

  function initSpectrumColorPicker() {
    function setupPickerPair(spectrumEl, cursorEl, hueBarEl, hueThumbEl, eyeDropperBtn) {
      if (!spectrumEl || !hueBarEl) return;

      function handleSpectrumMove(e) {
        const rect = spectrumEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        const s = Math.round((x / rect.width) * 100);
        const v = Math.round((1 - y / rect.height) * 100);

        colorPickerState.s = s;
        colorPickerState.v = v;

        const rgb = hsvToRgb(colorPickerState.h, s, v);
        const hex = rgbToHexCode(rgb.r, rgb.g, rgb.b);

        setNameColor(hex);
      }

      function handleHueMove(e) {
        const rect = hueBarEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const h = Math.round((x / rect.width) * 360);

        colorPickerState.h = h;

        const rgb = hsvToRgb(h, colorPickerState.s, colorPickerState.v);
        const hex = rgbToHexCode(rgb.r, rgb.g, rgb.b);

        setNameColor(hex);
      }

      spectrumEl.addEventListener('pointerdown', (e) => {
        colorPickerState.isDraggingSpectrum = true;
        spectrumEl.setPointerCapture(e.pointerId);
        handleSpectrumMove(e);
      });

      spectrumEl.addEventListener('pointermove', (e) => {
        if (colorPickerState.isDraggingSpectrum) {
          handleSpectrumMove(e);
        }
      });

      spectrumEl.addEventListener('pointerup', (e) => {
        colorPickerState.isDraggingSpectrum = false;
        try { spectrumEl.releasePointerCapture(e.pointerId); } catch (err) {}
      });

      hueBarEl.addEventListener('pointerdown', (e) => {
        colorPickerState.isDraggingHue = true;
        hueBarEl.setPointerCapture(e.pointerId);
        handleHueMove(e);
      });

      hueBarEl.addEventListener('pointermove', (e) => {
        if (colorPickerState.isDraggingHue) {
          handleHueMove(e);
        }
      });

      hueBarEl.addEventListener('pointerup', (e) => {
        colorPickerState.isDraggingHue = false;
        try { hueBarEl.releasePointerCapture(e.pointerId); } catch (err) {}
      });

      eyeDropperBtn?.addEventListener('click', async () => {
        if (window.EyeDropper) {
          try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            if (result?.sRGBHex) {
              setNameColor(result.sRGBHex);
            }
          } catch (err) {}
        } else {
          showToast('Пипетка не поддерживается вашим браузером');
        }
      });
    }

    setupPickerPair(dom.pickerSpectrum, dom.pickerCursor, dom.pickerHueBar, dom.pickerHueThumb, dom.btnEyeDropper);
    setupPickerPair(dom.sidebarSpectrum, dom.sidebarCursor, dom.sidebarHueBar, dom.sidebarHueThumb, dom.sidebarBtnEyeDropper);

    // RGB input listeners
    function handleRgbInputs(inputR, inputG, inputB) {
      if (!inputR || !inputG || !inputB) return;
      const onChange = () => {
        const r = Math.max(0, Math.min(255, parseInt(inputR.value, 10) || 0));
        const g = Math.max(0, Math.min(255, parseInt(inputG.value, 10) || 0));
        const b = Math.max(0, Math.min(255, parseInt(inputB.value, 10) || 0));
        const hex = rgbToHexCode(r, g, b);
        setNameColor(hex);
      };
      inputR.addEventListener('input', onChange);
      inputG.addEventListener('input', onChange);
      inputB.addEventListener('input', onChange);
    }

    handleRgbInputs(dom.inputRgbR, dom.inputRgbG, dom.inputRgbB);
    handleRgbInputs(dom.sidebarInputRgbR, dom.sidebarInputRgbG, dom.sidebarInputRgbB);
  }

  function setNameColor(color) {
    if (!color) return;
    // Per-letter: if letters are highlighted inside the boss name, colour only
    // that selection. Otherwise recolour the whole name uniformly.
    const range = getBossNameSelectionRange();
    if (range) {
      applyColorToRange(range, color);
      persistBossName();
      updateColorPalette();
      return;
    }
    state.name_color = color;
    stripBossNameColorSpans();
    persistBossName();
    updateVisualStyles();
    updateColorPalette();
    saveDraft();
  }

  function updateColorPalette() {
    const color = state.name_color || '#F16937';
    const hsv = hexToHsv(color);
    colorPickerState.h = hsv.h;
    colorPickerState.s = hsv.s;
    colorPickerState.v = hsv.v;

    // 1. Floating top-right palette
    if (dom.colorPreviewDot) dom.colorPreviewDot.style.backgroundColor = color;
    if (dom.pickerPreviewBox) dom.pickerPreviewBox.style.backgroundColor = color;
    if (dom.hexColorInput && document.activeElement !== dom.hexColorInput) {
      dom.hexColorInput.value = color.toUpperCase();
    }

    if (dom.pickerSpectrum) {
      dom.pickerSpectrum.style.backgroundColor = `hsl(${hsv.h}, 100%, 50%)`;
    }
    if (dom.pickerCursor) {
      dom.pickerCursor.style.left = `${hsv.s}%`;
      dom.pickerCursor.style.top = `${100 - hsv.v}%`;
    }
    if (dom.pickerHueThumb) {
      dom.pickerHueThumb.style.left = `${(hsv.h / 360) * 100}%`;
    }
    if (dom.inputRgbR && document.activeElement !== dom.inputRgbR) dom.inputRgbR.value = hsv.r;
    if (dom.inputRgbG && document.activeElement !== dom.inputRgbG) dom.inputRgbG.value = hsv.g;
    if (dom.inputRgbB && document.activeElement !== dom.inputRgbB) dom.inputRgbB.value = hsv.b;

    dom.colorSwatches?.querySelectorAll('.fceb-swatch').forEach((swatch) => {
      if (swatch.dataset.color?.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('is-active');
      } else {
        swatch.classList.remove('is-active');
      }
    });

    // 2. Sidebar Tab 1 palette
    if (dom.sidebarColorPreviewDot) dom.sidebarColorPreviewDot.style.backgroundColor = color;
    if (dom.sidebarPickerPreviewBox) dom.sidebarPickerPreviewBox.style.backgroundColor = color;
    if (dom.sidebarHexColorInput && document.activeElement !== dom.sidebarHexColorInput) {
      dom.sidebarHexColorInput.value = color.toUpperCase();
    }

    if (dom.sidebarSpectrum) {
      dom.sidebarSpectrum.style.backgroundColor = `hsl(${hsv.h}, 100%, 50%)`;
    }
    if (dom.sidebarCursor) {
      dom.sidebarCursor.style.left = `${hsv.s}%`;
      dom.sidebarCursor.style.top = `${100 - hsv.v}%`;
    }
    if (dom.sidebarHueThumb) {
      dom.sidebarHueThumb.style.left = `${(hsv.h / 360) * 100}%`;
    }
    if (dom.sidebarInputRgbR && document.activeElement !== dom.sidebarInputRgbR) dom.sidebarInputRgbR.value = hsv.r;
    if (dom.sidebarInputRgbG && document.activeElement !== dom.sidebarInputRgbG) dom.sidebarInputRgbG.value = hsv.g;
    if (dom.sidebarInputRgbB && document.activeElement !== dom.sidebarInputRgbB) dom.sidebarInputRgbB.value = hsv.b;

    dom.sidebarColorSwatches?.querySelectorAll('.fceb-swatch').forEach((swatch) => {
      if (swatch.dataset.color?.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('is-active');
      } else {
        swatch.classList.remove('is-active');
      }
    });
  }

  function resolveArtUrlForPreview(url) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    if (url.startsWith('./assets/bosses/') || url.startsWith('assets/bosses/')) {
      return `../../datamine/fce/${url.replace(/^\.\//, '')}`;
    }
    return url;
  }

  function setBossArtSource(src) {
    state.art = src;
    if (dom.inputArtUrl && (!state.activeImageTarget || state.activeImageTarget === 'boss')) {
      dom.inputArtUrl.value = src || '';
    }
    const resolvedUrl = resolveArtUrlForPreview(src);

    if (resolvedUrl) {
      dom.cardArtImg.style.display = 'block';
      dom.cardArtImg.src = resolvedUrl;

      // Standalone PC Fallback: if local file is missing when folder is moved, fallback to live CDN!
      dom.cardArtImg.onerror = () => {
        const remoteFallback = `https://tof.smilekritik.beer/datamine/fce/assets/bosses/${state.slug || 'chaos-armor'}.png`;
        if (dom.cardArtImg.src !== remoteFallback) {
          dom.cardArtImg.src = remoteFallback;
        }
      };
    } else {
      dom.cardArtImg.style.display = 'none';
      dom.cardArtImg.src = '';
    }
    updateArtStatusBadge();
    updateTransformGizmo();
    saveDraft();
  }

  function setArtSource(src) {
    if (!state.activeImageTarget || state.activeImageTarget === 'boss') {
      setBossArtSource(src);
    } else {
      const img = state.extra_images && state.extra_images.find((x) => x.id === state.activeImageTarget);
      if (img) {
        img.src = src;
        if (dom.inputArtUrl) dom.inputArtUrl.value = src || '';
        renderExtraImages();
        updateTransformGizmo();
        syncArtworkSidebarFromActiveImage();
        saveDraft();
      }
    }
  }

  function updateArtStatusBadge() {
    if (!dom.artStatusBadge) return;
    if (state.art) {
      dom.artStatusBadge.textContent = t('badgeArtLoaded');
      dom.artStatusBadge.className = 'fceb-badge fceb-badge--gold';
    } else {
      dom.artStatusBadge.textContent = t('badgeNoArt');
      dom.artStatusBadge.className = 'fceb-badge';
    }
  }

  function fitCardContent() {
    if (!dom.cardCopy) return;

    if (state.autoFitCopy) {
      const baseTop = Number.isFinite(Number(state.copy_y)) ? Number(state.copy_y) : 220;
      let copyTop = baseTop;
      let copyScale = 1;

      dom.cardCopy.style.setProperty('--fce-copy-width', `${state.copy_width || 1300}px`);
      dom.cardCopy.style.setProperty('--fce-copy-y', `${copyTop}px`);
      dom.cardCopy.style.setProperty('--fce-copy-scale', '1');

      // Measure only the mechanic lines (exclude the on-card "Add line" button,
      // which sits below the block) so this matches datamine/fce's scrollHeight math.
      const naturalHeight = getCopyNaturalHeight();
      const availableHeight = 1080 - baseTop;
      const centeredOffset = Math.max(0, (availableHeight - naturalHeight * copyScale) / 2);
      const centeredTop = baseTop + Math.min(42, centeredOffset);
      const overflowTop = Math.max(18, 916 - naturalHeight);
      copyTop = naturalHeight > 696 ? overflowTop : centeredTop;
      dom.cardCopy.style.setProperty('--fce-copy-y', `${copyTop}px`);

      const finalAvailableHeight = 1080 - copyTop;
      const scaledHeight = naturalHeight * copyScale;
      if (scaledHeight > finalAvailableHeight) {
        copyScale = Math.max(0.84, finalAvailableHeight / naturalHeight);
        dom.cardCopy.style.setProperty('--fce-copy-scale', copyScale.toFixed(4));
      }

      if (dom.rangeCopyY && dom.valCopyY) {
        dom.rangeCopyY.value = Math.round(copyTop);
        dom.valCopyY.textContent = `${Math.round(copyTop)}px`;
      }
      if (dom.rangeCopyScale && dom.valCopyScale) {
        dom.rangeCopyScale.value = Number(copyScale.toFixed(2));
        dom.valCopyScale.textContent = `${copyScale.toFixed(2)}x`;
      }
    }

    if (dom.cardNameText && dom.cardVisual) {
      const baseWidth = state.name_width || DEFAULT_NAME_WIDTH;
      dom.cardVisual.style.setProperty('--fce-name-width', `${baseWidth}px`);
      dom.cardVisual.style.setProperty('--fce-name-scale', '1');

      if (state.autoFitName) {
        const naturalWidth = dom.cardNameText.scrollWidth;
        if (naturalWidth > baseWidth) {
          const fittedScale = Math.max(0.7, baseWidth / naturalWidth);
          dom.cardVisual.style.setProperty('--fce-name-scale', fittedScale.toFixed(4));
          state.name_scale = parseFloat(fittedScale.toFixed(4));
        } else {
          state.name_scale = 1;
        }
      }
    }
  }

  function updateSceneScale() {
    if (!dom.canvasStage || !dom.cardViewport) return;

    let scale = 0.65;
    const stageWidth = dom.canvasStage.clientWidth - 48;
    const stageHeight = dom.canvasStage.clientHeight - 48;

    if (state.zoomMode === 'auto' || state.zoomMode === 'fit') {
      const scaleX = stageWidth / SCENE_WIDTH;
      const scaleY = stageHeight / SCENE_HEIGHT;
      scale = Math.min(scaleX, scaleY, 1);
      scale = Math.max(scale, 0.25);
    } else {
      scale = parseFloat(state.zoomMode) || 0.65;
    }

    state.scale = scale;
    dom.cardViewport.style.setProperty('--fce-scale', scale.toFixed(5));
    dom.cardViewport.style.width = `${Math.round(SCENE_WIDTH * scale)}px`;
    dom.cardViewport.style.height = `${Math.round(SCENE_HEIGHT * scale)}px`;
  }

  function handleWindowResize() {
    updateSceneScale();
    fitCardContent();
  }

  // =========================================================================
  // DUAL-SYNC MECHANICS ACTIONS
  // =========================================================================

  function addMechanicLine() {
    const newIndex = String(state.translations.ru.mechanics.length + 1);
    
    state.translations.ru.mechanics.push({
      index: newIndex,
      html: 'Новая механика босса. <span class="fce-card__text-accent">Важный акцент</span>.'
    });

    state.translations.en.mechanics.push({
      index: newIndex,
      html: 'New boss mechanic line. <span class="fce-card__text-accent">Important alert</span>.'
    });

    renderAll();
    saveDraft();

    setTimeout(() => {
      const lastItem = dom.linesList?.querySelector('.fceb-line-item:last-child .fceb-line-item__editor');
      if (lastItem) {
        lastItem.focus();
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    showToast(t('toastLineAdded'));
  }

  function deleteLine(index) {
    if (state.translations.ru.mechanics.length <= 1) {
      showToast(t('toastMinLines'));
      return;
    }
    state.translations.ru.mechanics.splice(index, 1);
    state.translations.en.mechanics.splice(index, 1);
    renderAll();
    saveDraft();
    showToast(t('toastLineDeleted'));
  }

  function moveLine(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.translations.ru.mechanics.length) return;
    
    ['ru', 'en'].forEach((lang) => {
      const temp = state.translations[lang].mechanics[index];
      state.translations[lang].mechanics[index] = state.translations[lang].mechanics[target];
      state.translations[lang].mechanics[target] = temp;
    });

    renderAll();
    saveDraft();
  }

  function autoRenumberLines() {
    ['ru', 'en'].forEach((lang) => {
      state.translations[lang].mechanics.forEach((item, idx) => {
        item.index = String(idx + 1);
      });
    });
    renderAll();
    saveDraft();
    showToast(t('toastNumbered'));
  }

  function toggleRedInElement(element, index) {
    const active = getActiveTranslation();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && element.contains(selection.anchorNode)) {
      applyColorSelection('#ff0000');
      return;
    }

    if (element.innerHTML.includes('fce-card__text-accent')) {
      element.innerHTML = element.innerHTML.replace(/<span class="fce-card__text-accent">(.*?)<\/span>/gi, '$1');
    } else {
      element.innerHTML = `<span class="fce-card__text-accent">${element.innerHTML}</span>`;
    }

    const indexSpan = element.querySelector('.fce-card__index');
    let cleanHtml = element.innerHTML;
    if (indexSpan) {
      cleanHtml = cleanHtml.replace(indexSpan.outerHTML, '');
    }

    active.mechanics[index].html = cleanHtml.trim();
    renderAll();
    saveDraft();
  }

  // Last non-collapsed selection made inside the boss-name element. Used so the
  // Boss Name Color palette can recolor individual letters even after a swatch
  // click / input focus steals the live selection.
  let _bossNameSelRange = null;

  function selectionInBossName() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const a = sel.anchorNode;
    const el = a?.nodeType === 1 ? a : a?.parentElement;
    return !!(el && dom.cardNameText && dom.cardNameText.contains(el));
  }

  function getBossNameSelectionRange() {
    // Prefer a live, non-collapsed selection inside the boss name.
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const el = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
      if (el && dom.cardNameText?.contains(el)) return sel.getRangeAt(0);
    }
    // Fall back to the last saved name selection (inputs can steal focus).
    if (_bossNameSelRange && !_bossNameSelRange.collapsed) {
      const node = _bossNameSelRange.commonAncestorContainer;
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      if (el && dom.cardNameText?.contains(el)) return _bossNameSelRange;
    }
    return null;
  }

  // Render a translation's boss name, preferring rich HTML (per-letter colour /
  // size) when present, else plain text.
  function renderBossNameInto(translation) {
    if (!dom.cardNameText || !translation) return;
    if (translation.name_html && translation.name_html.includes('<')) {
      dom.cardNameText.innerHTML = translation.name_html;
    } else {
      dom.cardNameText.textContent = translation.name || '';
    }
  }

  // Persist boss-name edits (plain text for identifiers + rich HTML for display).
  function persistBossName() {
    if (!dom.cardNameText) return;
    const active = getActiveTranslation();
    active.name = dom.cardNameText.textContent;
    const html = dom.cardNameText.innerHTML;
    active.name_html = html.includes('<') ? html : '';
    if (state.currentLangPreset === 'ru' && dom.inputBossNameRu) {
      dom.inputBossNameRu.value = active.name;
    } else if (state.currentLangPreset === 'en' && dom.inputBossNameEn) {
      dom.inputBossNameEn.value = active.name;
    }
    if (dom.inputBossName) dom.inputBossName.value = active.name;
    fitCardContent();
    saveDraft();
  }

  // Last non-collapsed selection anywhere in the card editors (name OR mechanics).
  // Lets toolbar controls that steal focus (size box, colour picker, outline
  // sliders…) still apply to the text the user had highlighted.
  let _editorSelRange = null;

  function rangeInEditors(range) {
    if (!range) return false;
    const n = range.commonAncestorContainer;
    const el = n?.nodeType === 1 ? n : n?.parentElement;
    return !!(el && (dom.cardCopy?.contains(el) || dom.cardNameText?.contains(el)));
  }

  function restoreEditorSelection() {
    if (!_editorSelRange || _editorSelRange.collapsed) return false;
    const n = _editorSelRange.commonAncestorContainer;
    const el = n?.nodeType === 1 ? n : n?.parentElement;
    if (!el || !el.isConnected) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(_editorSelRange.cloneRange());
    return true;
  }

  // Ensure a live editor selection before a rich edit; restores the remembered
  // one if a toolbar control stole focus and collapsed it.
  function ensureEditorSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed && rangeInEditors(sel.getRangeAt(0))) return true;
    return restoreEditorSelection();
  }

  // Called after any rich-text edit; routes persistence to the right target.
  function afterRichEdit() {
    if (selectionInBossName()) {
      persistBossName();
    } else {
      syncAllLinesToState();
    }
    // Remember the post-edit selection so consecutive edits keep working.
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed && rangeInEditors(sel.getRangeAt(0))) {
      _editorSelRange = sel.getRangeAt(0).cloneRange();
    }
    updateSelectionToolbarState();
  }

  function handleSelectionChange() {
    // The toolbar is now statically docked at the top of the canvas — it stays
    // put and always visible. We only refresh the active-state of its buttons
    // to reflect the current text selection.
    const selection = window.getSelection();
    if (!selection) return;
    // Track boss-name selection: save when letters are highlighted, clear when
    // the cursor simply collapses inside the name (meaning "apply to all").
    if (selection.rangeCount) {
      const a = selection.anchorNode;
      const el = a?.nodeType === 1 ? a : a?.parentElement;
      if (el && dom.cardNameText?.contains(el)) {
        _bossNameSelRange = selection.isCollapsed ? null : selection.getRangeAt(0).cloneRange();
      }
    }
    // Remember any non-collapsed selection inside the editors.
    if (selection.rangeCount && !selection.isCollapsed) {
      const r = selection.getRangeAt(0);
      if (rangeInEditors(r)) _editorSelRange = r.cloneRange();
    }
    if (selection.isCollapsed) return;
    updateSelectionToolbarState();
  }

  function updateSelectionToolbarState() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    let hasBold = false;
    let hasItalic = false;
    let hasUnderline = false;
    let hasStrike = false;
    let hasStroke = false;
    let currentColor = null;

    try {
      hasBold = document.queryCommandState('bold');
      hasItalic = document.queryCommandState('italic');
      hasUnderline = document.queryCommandState('underline');
      hasStrike = document.queryCommandState('strikeThrough');
    } catch (e) {}

    let node = selection.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;

    // Reflect the current selection's font size into the size combobox
    // (skip while the user is typing into it).
    if (dom.selTextFontSize && document.activeElement !== dom.selTextFontSize && node) {
      const fs = parseInt(getComputedStyle(node).fontSize, 10);
      if (!isNaN(fs)) dom.selTextFontSize.value = String(fs);
    }

    let curr = node;
    while (curr && !curr.classList?.contains('fce-card__copy') && !curr.classList?.contains('fceb-lines-list')) {
      const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
      const style = curr.style || {};

      if (tag === 'b' || tag === 'strong' || style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700) {
        hasBold = true;
      }
      if (tag === 'i' || tag === 'em' || style.fontStyle === 'italic') {
        hasItalic = true;
      }
      if (tag === 'u' || (style.textDecoration && style.textDecoration.includes('underline'))) {
        hasUnderline = true;
      }
      if (tag === 's' || tag === 'strike' || (style.textDecoration && style.textDecoration.includes('line-through'))) {
        hasStrike = true;
      }
      if (curr.classList?.contains('fce-text-stroke') || style.webkitTextStroke || style.textStroke) {
        hasStroke = true;
      }
      if (curr.classList?.contains('fce-card__text-accent')) {
        currentColor = '#ff0000';
      } else if (style.color) {
        currentColor = style.color;
      }
      curr = curr.parentElement;
    }

    if (dom.btnSelBold) dom.btnSelBold.classList.toggle('is-active', Boolean(hasBold));
    if (dom.btnSelItalic) dom.btnSelItalic.classList.toggle('is-active', Boolean(hasItalic));
    if (dom.btnSelUnderline) dom.btnSelUnderline.classList.toggle('is-active', Boolean(hasUnderline));
    if (dom.btnSelStrike) dom.btnSelStrike.classList.toggle('is-active', Boolean(hasStrike));
    if (dom.btnSelStroke) dom.btnSelStroke.classList.toggle('is-active', Boolean(hasStroke));

    document.querySelectorAll('.fceb-sel-btn--color').forEach((btn) => {
      const btnColor = (btn.dataset.color || '').toLowerCase();
      if (currentColor && (currentColor.toLowerCase() === btnColor || rgbToHex(currentColor).toLowerCase() === btnColor)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  }

  function rgbToHex(color) {
    if (!color) return '';
    if (color.startsWith('#')) return color;
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return color;
    return '#' + ((1 << 24) + (parseInt(rgb[0], 10) << 16) + (parseInt(rgb[1], 10) << 8) + parseInt(rgb[2], 10)).toString(16).slice(1);
  }

  function applyRichFormat(command) {
    document.execCommand(command, false, null);
    afterRichEdit();
  }

  function applyFontSelection(fontFamily) {
    if (!fontFamily) return;
    ensureEditorSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();

    const span = document.createElement('span');
    span.style.fontFamily = fontFamily;
    span.appendChild(selectedContent);
    range.insertNode(span);

    afterRichEdit();
  }

  // Font size dropdown (Google-Docs style). Works on any editable selection —
  // boss name or mechanic text. Empty size clears the per-selection font size.
  function applyFontSizeSelection(sizePx) {
    ensureEditorSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);

    // Always unwrap any font-size spans already inside the selection.
    const frag = range.extractContents();
    frag.querySelectorAll?.('span[style*="font-size"]').forEach((s) => {
      const p = s.parentNode;
      while (s.firstChild) p.insertBefore(s.firstChild, s);
      s.remove();
    });

    let target = frag;
    let span = null;
    if (sizePx) {
      span = document.createElement('span');
      span.style.fontSize = `${sizePx}px`;
      span.appendChild(frag);
      target = span;
    }
    range.insertNode(target);

    // Reselect the affected content.
    const nr = document.createRange();
    if (span) nr.selectNodeContents(span);
    else nr.selectNodeContents(range.commonAncestorContainer);
    selection.removeAllRanges();
    selection.addRange(nr);
    if (selectionInBossName()) _bossNameSelRange = nr.cloneRange();

    afterRichEdit();
  }

  // Wrap the given range in a boss-name colour span (unwrapping nested colours).
  function applyColorToRange(range, color) {
    const frag = range.extractContents();
    frag.querySelectorAll?.('span[style*="color"], .fce-card__text-accent').forEach((s) => {
      const p = s.parentNode;
      while (s.firstChild) p.insertBefore(s.firstChild, s);
      s.remove();
    });
    const span = document.createElement('span');
    span.style.color = color;
    span.appendChild(frag);
    range.insertNode(span);

    const sel = window.getSelection();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(nr);
    _bossNameSelRange = nr.cloneRange();
  }

  // Remove any per-letter colour spans so the whole name uses the base colour.
  function stripBossNameColorSpans() {
    if (!dom.cardNameText) return;
    dom.cardNameText.querySelectorAll('span[style*="color"], .fce-card__text-accent').forEach((s) => {
      const p = s.parentNode;
      while (s.firstChild) p.insertBefore(s.firstChild, s);
      s.remove();
    });
    dom.cardNameText.normalize();
  }

  function applyStrokeToSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const width = state.copy_stroke_width || 2;
    const color = state.copy_stroke_color || '#000000';
    const range = selection.getRangeAt(0);

    // If already inside stroke span, update its style instead of toggling
    const container = range.commonAncestorContainer;
    const el = container.nodeType === 1 ? container : container.parentElement;
    const existingStroke = el?.closest('.fce-text-stroke, span[style*="-webkit-text-stroke"]');
    if (existingStroke) {
      existingStroke.style.webkitTextStroke = `${width}px ${color}`;
      existingStroke.style.paintOrder = 'stroke fill';
      afterRichEdit();
      return;
    }

    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.className = 'fce-text-stroke';
    span.style.webkitTextStroke = `${width}px ${color}`;
    span.style.paintOrder = 'stroke fill';
    span.appendChild(selectedContent);
    range.insertNode(span);

    afterRichEdit();
  }

  function removeStrokeFromSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const container = range.commonAncestorContainer;
    const el = container.nodeType === 1 ? container : container.parentElement;
    const existingStroke = el?.closest('.fce-text-stroke, span[style*="-webkit-text-stroke"]');
    if (existingStroke) {
      const parent = existingStroke.parentNode;
      while (existingStroke.firstChild) parent.insertBefore(existingStroke.firstChild, existingStroke);
      existingStroke.remove();
      afterRichEdit();
      return;
    }

    // Also check for strokes inside the selection range
    if (!selection.isCollapsed) {
      const frag = range.cloneContents();
      const strokeSpans = frag.querySelectorAll('.fce-text-stroke, span[style*="-webkit-text-stroke"]');
      if (strokeSpans.length > 0) {
        // Unwrap all stroke spans within the selected content
        const docFragment = range.extractContents();
        docFragment.querySelectorAll('.fce-text-stroke, span[style*="-webkit-text-stroke"]').forEach((s) => {
          const p = s.parentNode;
          while (s.firstChild) p.insertBefore(s.firstChild, s);
          s.remove();
        });
        range.insertNode(docFragment);
        afterRichEdit();
      }
    }
  }

  // Legacy: kept for any external calls
  function applyStrokeSelection(strokeWidth = '2px', strokeColor = '#000000') {
    applyStrokeToSelection();
  }


  function applyColorSelection(color) {
    ensureEditorSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();

    const span = document.createElement('span');
    if (color === '#ff0000') {
      span.className = 'fce-card__text-accent';
    } else {
      span.style.color = color;
      span.style.fontWeight = '700';
    }
    span.appendChild(selectedContent);
    range.insertNode(span);

    afterRichEdit();
  }

  function clearSelectionFormatting() {
    document.execCommand('removeFormat', false, null);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 1 ? container : container.parentElement;
      const styledSpans = el?.querySelectorAll('span[style*="color"], span[style*="font-family"], span[style*="-webkit-text-stroke"], .fce-card__text-accent, .fce-text-stroke, b, i, u, s, strong, em, strike');
      styledSpans?.forEach((s) => {
        const parent = s.parentNode;
        while (s.firstChild) parent.insertBefore(s.firstChild, s);
        s.remove();
      });
      const closestStyled = el?.closest('span[style*="color"], span[style*="font-family"], span[style*="-webkit-text-stroke"], .fce-card__text-accent, .fce-text-stroke, b, i, u, s, strong, em, strike');
      if (closestStyled) {
        const parent = closestStyled.parentNode;
        while (closestStyled.firstChild) parent.insertBefore(closestStyled.firstChild, closestStyled);
        closestStyled.remove();
      }
    }
    afterRichEdit();
  }

  function syncAllLinesToState() {
    const active = getActiveTranslation();
    dom.cardCopy.querySelectorAll('.fce-card__line').forEach((lineArticle) => {
      const idx = parseInt(lineArticle.dataset.lineIndex, 10);
      const p = lineArticle.querySelector('.fce-card__text');
      if (p && active.mechanics[idx]) {
        const indexSpan = p.querySelector('.fce-card__index');
        let htmlContent = p.innerHTML;
        if (indexSpan) {
          htmlContent = htmlContent.replace(indexSpan.outerHTML, '');
        }
        active.mechanics[idx].html = htmlContent.trim();
      }
    });

    renderMechanicsList();
    fitCardContent();
    saveDraft();
  }

  // =========================================================================
  // IMAGE LAYERS & INTERACTIVE TRANSFORM GIZMO ENGINE
  // =========================================================================

  let gizmoDragState = {
    isDragging: false,
    dragType: null, // 'move' | 'gizmo_resize'
    targetId: 'boss',
    handle: null, // 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
    startX: 0,
    startY: 0,
    initialScaleX: 1,
    initialScaleY: 1,
    initialX: 0,
    initialY: 0,
    centerX: 0,
    centerY: 0,
    initialDistance: 0,
    initialDistX: 0,
    initialDistY: 0
  };

  let isGizmoExplicitlyVisible = false;

  function showTransformGizmo() {
    isGizmoExplicitlyVisible = true;
    updateTransformGizmo();
  }

  function hideTransformGizmo() {
    isGizmoExplicitlyVisible = false;
    if (dom.imageTransformGizmo) {
      dom.imageTransformGizmo.style.display = 'none';
    }
  }

  function isArtTabActive() {
    const activeTab = document.querySelector('.fceb-tab.is-active');
    return activeTab?.dataset.tab === 'art';
  }

  function selectImageTarget(targetId) {
    if (!targetId || targetId === 'boss') {
      state.activeImageTarget = 'boss';
    } else {
      const exists = state.extra_images && state.extra_images.find((img) => img.id === targetId);
      state.activeImageTarget = exists ? targetId : 'boss';
    }

    renderArtLayersChips();
    syncArtworkSidebarFromActiveImage();
    updateTransformGizmo();
  }

  function getActiveImageObject() {
    if (!state.activeImageTarget || state.activeImageTarget === 'boss') {
      const sX = state.art_scale_x ?? state.art_scale ?? 1.08;
      const sY = state.art_scale_y ?? state.art_scale ?? 1.08;
      return {
        id: 'boss',
        isBoss: true,
        name: t('layerBossArt'),
        src: state.art,
        scale: sX,
        scaleX: sX,
        scaleY: sY,
        x: state.art_x ?? -96,
        y: state.art_y ?? 0,
        opacity: state.art_opacity ?? 1.0,
        baseLeft: 1121,
        baseTop: 71,
        baseWidth: 1272,
        baseHeight: 993
      };
    }
    const img = (state.extra_images && state.extra_images.find((img) => img.id === state.activeImageTarget)) || null;
    if (img) {
      img.scaleX = img.scaleX ?? img.scale ?? 1.0;
      img.scaleY = img.scaleY ?? img.scale ?? 1.0;
      img.scale = img.scaleX;
    }
    return img;
  }

  function renderArtLayersChips() {
    if (!dom.artLayersChips) return;
    dom.artLayersChips.innerHTML = '';

    // 1. Boss Art Chip
    const bossChip = document.createElement('div');
    bossChip.className = `fceb-layer-chip ${(!state.activeImageTarget || state.activeImageTarget === 'boss') ? 'is-active' : ''}`;
    bossChip.innerHTML = `<span>👑</span><span>${t('layerBossArt')}</span>`;
    bossChip.addEventListener('click', (e) => {
      e.stopPropagation();
      selectImageTarget('boss');
      showTransformGizmo();
    });
    dom.artLayersChips.appendChild(bossChip);

    // 2. Extra Images Chips
    if (state.extra_images && state.extra_images.length) {
      state.extra_images.forEach((img, idx) => {
        const chip = document.createElement('div');
        chip.className = `fceb-layer-chip ${state.activeImageTarget === img.id ? 'is-active' : ''}`;
        chip.innerHTML = `<span>🖼️</span><span>${img.name || t('layerExtraImage', { n: idx + 1 })}</span>`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          selectImageTarget(img.id);
          showTransformGizmo();
        });
        dom.artLayersChips.appendChild(chip);
      });
    }
  }

  function renderExtraImages() {
    if (!dom.cardExtraImages) return;
    dom.cardExtraImages.innerHTML = '';

    if (!state.extra_images || !state.extra_images.length) return;

    state.extra_images.forEach((img) => {
      if (!img.src) return;
      const imgEl = document.createElement('img');
      imgEl.className = 'fce-card__extra-img';
      imgEl.dataset.imgId = img.id;
      imgEl.src = resolveArtUrlForPreview(img.src);
      imgEl.alt = img.name || 'Extra Layer';
      imgEl.style.left = `${img.baseLeft || 1121}px`;
      imgEl.style.top = `${img.baseTop || 71}px`;
      imgEl.style.width = `${img.baseWidth || 600}px`;
      imgEl.style.height = `${img.baseHeight || 600}px`;
      imgEl.style.zIndex = String(img.zIndex || 2);
      imgEl.style.opacity = String(img.opacity ?? 1.0);
      const sX = img.scaleX ?? img.scale ?? 1.0;
      const sY = img.scaleY ?? img.scale ?? 1.0;
      imgEl.style.transform = `translate3d(${img.x || 0}px, ${img.y || 0}px, 0) scale(${sX}, ${sY})`;

      imgEl.addEventListener('mousedown', (e) => {
        showTransformGizmo();
        handleImageMouseDown(e, img.id);
      });

      dom.cardExtraImages.appendChild(imgEl);
    });
  }

  function syncArtworkSidebarFromActiveImage() {
    const isBoss = !state.activeImageTarget || state.activeImageTarget === 'boss';
    const target = getActiveImageObject();

    if (!target) return;

    if (isBoss) {
      if (dom.activeImageTitle) dom.activeImageTitle.textContent = t('panelBossArtTitle');
      if (dom.inputArtUrl) dom.inputArtUrl.value = state.art || '';
      if (dom.wrapAutoFitArt) dom.wrapAutoFitArt.style.display = 'block';
      if (dom.extraImageActions) dom.extraImageActions.style.display = 'none';

      if (dom.rangeArtOpacity && dom.valArtOpacity) {
        const opVal = Math.round((state.art_opacity ?? 1.0) * 100);
        dom.rangeArtOpacity.value = opVal;
        dom.valArtOpacity.textContent = `${opVal}%`;
      }
      if (dom.rangeArtScale && dom.valArtScale) {
        const scaleVal = state.art_scale_x ?? state.art_scale ?? 1.08;
        dom.rangeArtScale.value = scaleVal;
        dom.valArtScale.textContent = `${Number(scaleVal).toFixed(2)}x`;
      }
      if (dom.rangeArtX && dom.valArtX) {
        dom.rangeArtX.value = state.art_x ?? -96;
        dom.valArtX.textContent = `${state.art_x ?? -96}px`;
      }
      if (dom.rangeArtY && dom.valArtY) {
        dom.rangeArtY.value = state.art_y ?? 0;
        dom.valArtY.textContent = `${state.art_y ?? 0}px`;
      }
      updateArtStatusBadge();
    } else {
      if (dom.activeImageTitle) dom.activeImageTitle.textContent = target.name;
      if (dom.inputArtUrl) dom.inputArtUrl.value = target.src || '';
      if (dom.wrapAutoFitArt) dom.wrapAutoFitArt.style.display = 'none';
      if (dom.extraImageActions) dom.extraImageActions.style.display = 'flex';

      if (dom.rangeArtOpacity && dom.valArtOpacity) {
        const opVal = Math.round((target.opacity ?? 1.0) * 100);
        dom.rangeArtOpacity.value = opVal;
        dom.valArtOpacity.textContent = `${opVal}%`;
      }
      if (dom.rangeArtScale && dom.valArtScale) {
        const scaleVal = target.scaleX ?? target.scale ?? 1.0;
        dom.rangeArtScale.value = scaleVal;
        dom.valArtScale.textContent = `${Number(scaleVal).toFixed(2)}x`;
      }
      if (dom.rangeArtX && dom.valArtX) {
        dom.rangeArtX.value = target.x ?? 0;
        dom.valArtX.textContent = `${target.x ?? 0}px`;
      }
      if (dom.rangeArtY && dom.valArtY) {
        dom.rangeArtY.value = target.y ?? 0;
        dom.valArtY.textContent = `${target.y ?? 0}px`;
      }
      if (dom.artStatusBadge) {
        dom.artStatusBadge.textContent = target.src ? t('badgeReady') : t('badgeNoArt');
        dom.artStatusBadge.className = target.src ? 'fceb-badge fceb-badge--gold' : 'fceb-badge';
      }
    }
  }

  function updateTransformGizmo() {
    if (!dom.imageTransformGizmo) return;

    if (!isGizmoExplicitlyVisible && !isArtTabActive()) {
      dom.imageTransformGizmo.style.display = 'none';
      return;
    }

    const target = getActiveImageObject();
    if (!target || !target.src) {
      dom.imageTransformGizmo.style.display = 'none';
      return;
    }

    dom.imageTransformGizmo.style.display = 'block';
    dom.imageTransformGizmo.style.left = `${target.baseLeft || 1121}px`;
    dom.imageTransformGizmo.style.top = `${target.baseTop || 71}px`;
    dom.imageTransformGizmo.style.width = `${target.baseWidth || 1272}px`;
    dom.imageTransformGizmo.style.height = `${target.baseHeight || 993}px`;
    dom.imageTransformGizmo.style.transformOrigin = 'center center';

    const sX = target.scaleX ?? target.scale ?? 1.0;
    const sY = target.scaleY ?? target.scale ?? 1.0;
    dom.imageTransformGizmo.style.transform = `translate3d(${target.x || 0}px, ${target.y || 0}px, 0) scale(${sX}, ${sY})`;

    if (dom.gizmoScaleBadge) {
      if (Math.abs(sX - sY) < 0.001) {
        dom.gizmoScaleBadge.textContent = `${Number(sX).toFixed(2)}x`;
      } else {
        dom.gizmoScaleBadge.textContent = `${Number(sX).toFixed(2)}x × ${Number(sY).toFixed(2)}x`;
      }
    }
  }

  function updateArtTransform() {
    const bossScaleX = state.art_scale_x ?? state.art_scale ?? 1.08;
    const bossScaleY = state.art_scale_y ?? state.art_scale ?? 1.08;
    dom.cardVisual.style.setProperty('--fce-art-scale', String(bossScaleX));
    dom.cardVisual.style.setProperty('--fce-art-scale-x', String(bossScaleX));
    dom.cardVisual.style.setProperty('--fce-art-scale-y', String(bossScaleY));
    dom.cardVisual.style.setProperty('--fce-art-x', `${state.art_x ?? -96}px`);
    dom.cardVisual.style.setProperty('--fce-art-y', `${state.art_y ?? 0}px`);
    dom.cardVisual.style.setProperty('--fce-art-opacity', String(state.art_opacity ?? 1.0));

    if (state.extra_images && state.extra_images.length) {
      state.extra_images.forEach((img) => {
        const el = dom.cardExtraImages?.querySelector(`[data-img-id="${img.id}"]`);
        if (el) {
          const sX = img.scaleX ?? img.scale ?? 1.0;
          const sY = img.scaleY ?? img.scale ?? 1.0;
          el.style.transform = `translate3d(${img.x || 0}px, ${img.y || 0}px, 0) scale(${sX}, ${sY})`;
          el.style.opacity = String(img.opacity ?? 1.0);
        }
      });
    }

    updateTransformGizmo();
  }

  function handleImageMouseDown(e, targetId) {
    if (e.button !== 0) return;
    e.stopPropagation();

    selectImageTarget(targetId);
    showTransformGizmo();

    const target = getActiveImageObject();
    if (!target) return;

    gizmoDragState.isDragging = true;
    gizmoDragState.dragType = 'move';
    gizmoDragState.targetId = targetId;
    gizmoDragState.startX = e.clientX;
    gizmoDragState.startY = e.clientY;
    gizmoDragState.initialX = target.x || 0;
    gizmoDragState.initialY = target.y || 0;
    gizmoDragState.initialScaleX = target.scaleX ?? target.scale ?? 1.0;
    gizmoDragState.initialScaleY = target.scaleY ?? target.scale ?? 1.0;
  }

  function handleGizmoHandleMouseDown(e, handle) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const target = getActiveImageObject();
    if (!target) return;

    const gizmoRect = dom.imageTransformGizmo.getBoundingClientRect();
    const centerX = gizmoRect.left + gizmoRect.width / 2;
    const centerY = gizmoRect.top + gizmoRect.height / 2;

    const initialDistance = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1;
    const initialDistX = Math.abs(e.clientX - centerX) || (gizmoRect.width / 2) || 1;
    const initialDistY = Math.abs(e.clientY - centerY) || (gizmoRect.height / 2) || 1;

    gizmoDragState.isDragging = true;
    gizmoDragState.dragType = 'gizmo_resize';
    gizmoDragState.targetId = state.activeImageTarget || 'boss';
    gizmoDragState.handle = handle;
    gizmoDragState.startX = e.clientX;
    gizmoDragState.startY = e.clientY;
    gizmoDragState.centerX = centerX;
    gizmoDragState.centerY = centerY;
    gizmoDragState.initialDistance = initialDistance;
    gizmoDragState.initialDistX = initialDistX;
    gizmoDragState.initialDistY = initialDistY;
    gizmoDragState.initialScaleX = target.scaleX ?? target.scale ?? 1.0;
    gizmoDragState.initialScaleY = target.scaleY ?? target.scale ?? 1.0;
    gizmoDragState.initialX = target.x || 0;
    gizmoDragState.initialY = target.y || 0;
  }

  function handleGlobalPointerMove(e) {
    if (!gizmoDragState.isDragging) return;

    const isBoss = !gizmoDragState.targetId || gizmoDragState.targetId === 'boss';
    const target = isBoss ? state : (state.extra_images && state.extra_images.find((x) => x.id === gizmoDragState.targetId));
    if (!target) return;

    const sceneScale = state.scale || 0.65;

    if (gizmoDragState.dragType === 'move') {
      const deltaX = (e.clientX - gizmoDragState.startX) / sceneScale;
      const deltaY = (e.clientY - gizmoDragState.startY) / sceneScale;

      if (isBoss) {
        state.autoFitArt = false;
        if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
        state.art_x = Math.round(gizmoDragState.initialX + deltaX);
        state.art_y = Math.round(gizmoDragState.initialY + deltaY);
        if (dom.rangeArtX && dom.valArtX) {
          dom.rangeArtX.value = state.art_x;
          dom.valArtX.textContent = `${state.art_x}px`;
        }
        if (dom.rangeArtY && dom.valArtY) {
          dom.rangeArtY.value = state.art_y;
          dom.valArtY.textContent = `${state.art_y}px`;
        }
      } else {
        target.x = Math.round(gizmoDragState.initialX + deltaX);
        target.y = Math.round(gizmoDragState.initialY + deltaY);
        if (dom.rangeArtX && dom.valArtX) {
          dom.rangeArtX.value = target.x;
          dom.valArtX.textContent = `${target.x}px`;
        }
        if (dom.rangeArtY && dom.valArtY) {
          dom.rangeArtY.value = target.y;
          dom.valArtY.textContent = `${target.y}px`;
        }
      }
      updateArtTransform();
    } else if (gizmoDragState.dragType === 'gizmo_resize') {
      const handle = gizmoDragState.handle;

      if (handle === 'n' || handle === 's') {
        // Vertical stretching / squishing
        const currentDistY = Math.abs(e.clientY - gizmoDragState.centerY);
        const factorY = currentDistY / (gizmoDragState.initialDistY || 1);
        const newScaleY = Math.max(0.05, Math.min(6.0, parseFloat((gizmoDragState.initialScaleY * factorY).toFixed(3))));

        if (isBoss) {
          state.autoFitArt = false;
          if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
          state.art_scale_y = newScaleY;
        } else {
          target.scaleY = newScaleY;
        }
      } else if (handle === 'w' || handle === 'e') {
        // Horizontal stretching / squishing
        const currentDistX = Math.abs(e.clientX - gizmoDragState.centerX);
        const factorX = currentDistX / (gizmoDragState.initialDistX || 1);
        const newScaleX = Math.max(0.05, Math.min(6.0, parseFloat((gizmoDragState.initialScaleX * factorX).toFixed(3))));

        if (isBoss) {
          state.autoFitArt = false;
          if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
          state.art_scale_x = newScaleX;
        } else {
          target.scaleX = newScaleX;
        }
      } else {
        // Corner proportional 2D scaling
        const currentDistance = Math.hypot(e.clientX - gizmoDragState.centerX, e.clientY - gizmoDragState.centerY);
        const factor = currentDistance / (gizmoDragState.initialDistance || 1);
        const newScaleX = Math.max(0.05, Math.min(6.0, parseFloat((gizmoDragState.initialScaleX * factor).toFixed(3))));
        const newScaleY = Math.max(0.05, Math.min(6.0, parseFloat((gizmoDragState.initialScaleY * factor).toFixed(3))));

        if (isBoss) {
          state.autoFitArt = false;
          if (dom.chkAutoFitArt) dom.chkAutoFitArt.checked = false;
          state.art_scale_x = newScaleX;
          state.art_scale_y = newScaleY;
          state.art_scale = newScaleX;
          if (dom.rangeArtScale && dom.valArtScale) {
            dom.rangeArtScale.value = newScaleX;
            dom.valArtScale.textContent = `${newScaleX.toFixed(2)}x`;
          }
        } else {
          target.scaleX = newScaleX;
          target.scaleY = newScaleY;
          target.scale = newScaleX;
          if (dom.rangeArtScale && dom.valArtScale) {
            dom.rangeArtScale.value = newScaleX;
            dom.valArtScale.textContent = `${newScaleX.toFixed(2)}x`;
          }
        }
      }
      updateArtTransform();
    }
  }

  function handleGlobalPointerUp() {
    if (gizmoDragState.isDragging) {
      gizmoDragState.isDragging = false;
      saveDraft();
    }
  }

  function addExtraImage(src, name) {
    if (!src) return;
    if (!state.extra_images) state.extra_images = [];

    const newId = 'img_' + Date.now();
    const newImg = {
      id: newId,
      name: name || `${t('layerExtraImage', { n: state.extra_images.length + 1 })}`,
      src: src,
      scale: 1.0,
      scaleX: 1.0,
      scaleY: 1.0,
      opacity: 1.0,
      x: state.extra_images.length * 35,
      y: state.extra_images.length * 35,
      zIndex: state.extra_images.length + 2,
      baseLeft: 1121,
      baseTop: 71,
      baseWidth: 600,
      baseHeight: 600
    };

    state.extra_images.push(newImg);
    renderExtraImages();
    selectImageTarget(newId);
    showTransformGizmo();
    saveDraft();
    showToast(t('toastImageAdded'));
  }

  function deleteActiveImage() {
    if (!state.activeImageTarget || state.activeImageTarget === 'boss') {
      setArtSource('');
      return;
    }

    const idx = state.extra_images.findIndex((x) => x.id === state.activeImageTarget);
    if (idx !== -1) {
      state.extra_images.splice(idx, 1);
      renderExtraImages();
      selectImageTarget('boss');
      saveDraft();
      showToast(t('toastImageDeleted'));
    }
  }

  function moveActiveImageLayer(direction) {
    if (!state.activeImageTarget || state.activeImageTarget === 'boss') return;
    const idx = state.extra_images.findIndex((x) => x.id === state.activeImageTarget);
    if (idx === -1) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.extra_images.length) return;

    const temp = state.extra_images[idx];
    state.extra_images[idx] = state.extra_images[newIdx];
    state.extra_images[newIdx] = temp;

    state.extra_images.forEach((img, i) => {
      img.zIndex = i + 2;
    });

    renderExtraImages();
    renderArtLayersChips();
    updateTransformGizmo();
    saveDraft();
  }

  function handleArtFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      loadArtFromFile(file);
    }
  }

  function handleDropFile(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadArtFromFile(file);
    }
  }

  function handleGlobalPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          loadArtFromFile(file);
          showToast(t('toastArtPasted'));
          break;
        }
      }
    }
  }

  function loadArtFromFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setArtSource(dataUrl);
        showToast(t('toastArtLoaded', { name: file.name }));
      }
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // PRESETS & NEW BOSS
  // =========================================================================

  function handlePresetSelect(e) {
    const slug = e.target.value;
    if (!slug) return;
    loadBossPreset(slug, true);
  }

  function loadBossPreset(slug, notify = true, forceOriginal = false) {
    const catalogRu = window.FCE_PRESETS?.ru || [];
    const catalogEn = window.FCE_PRESETS?.en || [];

    const bossRu = catalogRu.find((b) => b.slug === slug);
    const bossEn = catalogEn.find((b) => b.slug === slug);

    if (!bossRu && !bossEn) {
      // Locally-created temp boss that isn't on the live site — load its draft.
      const editsMap = getStoredEditsMap();
      if (editsMap[slug]) {
        const saved = JSON.parse(JSON.stringify(editsMap[slug]));
        Object.assign(state, saved);
        state.extra_images = Array.isArray(saved.extra_images) ? saved.extra_images : [];
        state.activeImageTarget = 'boss';
        state.art_scale_x = Number.isFinite(Number(state.art_scale_x)) ? Number(state.art_scale_x) : state.art_scale;
        state.art_scale_y = Number.isFinite(Number(state.art_scale_y)) ? Number(state.art_scale_y) : state.art_scale;
        if (dom.presetSelect) dom.presetSelect.value = slug;
        syncFormInputsFromState();
        renderAll();
        saveDraft();
        if (notify) showToast(t('toastPresetLoaded', { name: getActiveTranslation().name }));
      }
      return;
    }
    // Prefer the EN entry as the base: it carries the shared layout/art/color/
    // source fields; the RU entry has only name + mechanics. Using RU here left
    // those fields empty, so a pristine card always looked "edited".
    const baseBoss = bossEn || bossRu;

    // Always reset layers and targets before loading preset
    state.extra_images = [];
    state.activeImageTarget = 'boss';
    state.art_opacity = 1.0;

    const editsMap = getStoredEditsMap();
    if (!forceOriginal && editsMap[slug]) {
      // Load user's saved local custom edits for this boss
      const saved = JSON.parse(JSON.stringify(editsMap[slug]));
      Object.assign(state, saved);
      state.extra_images = Array.isArray(saved.extra_images) ? saved.extra_images : [];
      state.activeImageTarget = 'boss';
      state.art_scale_x = Number.isFinite(Number(state.art_scale_x)) ? Number(state.art_scale_x) : state.art_scale;
      state.art_scale_y = Number.isFinite(Number(state.art_scale_y)) ? Number(state.art_scale_y) : state.art_scale;
    } else {
      // Load pristine preset from catalog
      state.slug = baseBoss.slug || 'boss';
      state.order = Number.isFinite(Number(baseBoss.order)) ? Number(baseBoss.order) : undefined;
      state.boss_id = baseBoss.boss_id || '';
      state.source_psd = baseBoss.source_psd || '';
      state.name_color = baseBoss.name_color || '#f16937';
      state.art = baseBoss.art || `./assets/bosses/${baseBoss.slug}.png`;
      state.art_scale = Number.isFinite(Number(baseBoss.art_scale)) ? Number(baseBoss.art_scale) : 1.08;
      state.art_scale_x = state.art_scale;
      state.art_scale_y = state.art_scale;
      state.art_x = Number.isFinite(Number(baseBoss.art_x)) ? Number(baseBoss.art_x) : -96;
      state.art_y = Number.isFinite(Number(baseBoss.art_y)) ? Number(baseBoss.art_y) : 0;
      state.art_opacity = 1.0;
      state.extra_images = [];
      state.activeImageTarget = 'boss';
      state.name_right = Number.isFinite(Number(baseBoss.name_right)) ? Number(baseBoss.name_right) : DEFAULT_NAME_RIGHT;
      state.name_y = Number.isFinite(Number(baseBoss.name_y)) ? Number(baseBoss.name_y) : DEFAULT_NAME_Y;
      state.name_width = Number.isFinite(Number(baseBoss.name_width)) ? Number(baseBoss.name_width) : DEFAULT_NAME_WIDTH;

      // Load Russian translation
      state.translations.ru = {
        name: bossRu?.name || bossEn?.name || 'Босс',
        mechanics: Array.isArray(bossRu?.mechanics)
          ? bossRu.mechanics.map((m, idx) => ({ index: m.index || String(idx + 1), html: m.html || m.text || '' }))
          : []
      };

      // Load English translation
      state.translations.en = {
        name: bossEn?.name || bossRu?.name || 'Boss',
        mechanics: Array.isArray(bossEn?.mechanics)
          ? bossEn.mechanics.map((m, idx) => ({ index: m.index || String(idx + 1), html: m.html || m.text || '' }))
          : []
      };
    }

    if (dom.presetSelect) {
      dom.presetSelect.value = slug;
    }

    syncFormInputsFromState();
    renderAll();
    saveDraft();

    if (notify) {
      showToast(t('toastPresetLoaded', { name: getActiveTranslation().name }));
    }
  }

  function handleNewBoss() {
    if (confirm(t('confirmNewBoss'))) {
      state.slug = 'new-boss';
      state.order = nextCreationOrder();
      state.boss_id = 'boss_hum_new';
      state.source_psd = '';
      state.name_color = '#f16937';
      state.art = '';
      state.art_scale = 1.08;
      state.art_scale_x = 1.08;
      state.art_scale_y = 1.08;
      state.art_x = -96;
      state.art_y = 0;
      state.art_opacity = 1.0;
      state.extra_images = [];
      state.activeImageTarget = 'boss';
      state.name_y = 38;
      state.name_right = 0;
      state.name_width = 620;

      state.translations = {
        ru: {
          name: 'Новый босс',
          mechanics: [
            { index: '1', html: 'Первая механика нового босса. <span class="fce-card__text-accent">Красное предупреждение</span>.' },
            { index: '2', html: 'Вторая механика нового босса.' }
          ]
        },
        en: {
          name: 'New Boss',
          mechanics: [
            { index: '1', html: 'First mechanic line. <span class="fce-card__text-accent">Red alert warning</span>.' },
            { index: '2', html: 'Second mechanic line.' }
          ]
        }
      };

      if (dom.presetSelect) dom.presetSelect.value = '';
      syncFormInputsFromState();
      renderAll();
      saveDraft();
      showToast(t('toastNewBoss'));
    }
  }

  // =========================================================================
  // DUAL EXPORT ENGINE (EN + RU + DUAL JSON)
  // =========================================================================

  // The site now consumes ONE combined bilingual file per boss:
  // datamine/fce/data/bosses/{slug}.json — shared layout/art fields at the top
  // level, localized name + mechanics under `en` / `ru`. Layout fields are only
  // written when non-default (the site applies the same defaults), and `order`
  // is intentionally omitted — build-fce-index.js assigns it (new boss -> end).
  function generateBossJsonObject() {
    let cleanArtPath = state.art || '';
    if (cleanArtPath.startsWith('data:')) {
      cleanArtPath = `./assets/bosses/${state.slug}.png`;
    } else if (cleanArtPath.startsWith('../../datamine/fce/')) {
      cleanArtPath = cleanArtPath.replace('../../datamine/fce/', './');
    } else if (!cleanArtPath) {
      cleanArtPath = `./assets/bosses/${state.slug}.png`;
    }

    const mapMechanics = (arr) => (Array.isArray(arr) ? arr : []).map((m) => ({
      index: m.index || '1',
      html: m.html || ''
    }));
    const enTr = state.translations.en || { name: '', mechanics: [] };
    const ruTr = state.translations.ru || { name: '', mechanics: [] };

    const bossObj = {
      slug: state.slug || 'new-boss',
      // Creation-order hint. build-fce-index keeps existing bosses at their
      // manifest position and appends NEW ones sorted by this value, so making
      // several new bosses in a row preserves the order you made them in.
      order: Number.isFinite(Number(state.order)) ? Number(state.order) : undefined,
      boss_id: state.boss_id || undefined,
      name_color: state.name_color || '#f16937',
      art: cleanArtPath,
      art_object_position: 'center center',
      source_psd: state.source_psd || undefined,
      art_scale: state.art_scale !== 1.08 ? state.art_scale : undefined,
      art_x: state.art_x !== -96 ? state.art_x : undefined,
      art_y: state.art_y !== 0 ? state.art_y : undefined,
      name_y: state.name_y !== 38 ? state.name_y : undefined,
      name_right: state.name_right !== 0 ? state.name_right : undefined,
      name_width: state.name_width !== 620 ? state.name_width : undefined,
      en: { name: enTr.name || 'Boss', mechanics: mapMechanics(enTr.mechanics) },
      ru: { name: ruTr.name || enTr.name || 'Boss', mechanics: mapMechanics(ruTr.mechanics) }
    };

    Object.keys(bossObj).forEach((key) => {
      if (bossObj[key] === undefined) {
        delete bossObj[key];
      }
    });

    return bossObj;
  }

  // "Dual" tab == the combined file the site actually loads.
  function generateDualJsonObject() {
    return generateBossJsonObject();
  }

  // Single-language extract, shown for reference in the EN/RU modal tabs.
  function generateLangView(lang) {
    const tr = state.translations[lang] || state.translations.en || { name: '', mechanics: [] };
    return {
      slug: state.slug || 'new-boss',
      boss_id: state.boss_id || undefined,
      name: tr.name || 'Boss',
      mechanics: (Array.isArray(tr.mechanics) ? tr.mechanics : []).map((m) => ({
        index: m.index || '1',
        html: m.html || ''
      }))
    };
  }

  async function downloadZipPackage() {
    if (typeof JSZip === 'undefined') {
      showToast('Библиотека JSZip загружается...');
      return;
    }

    showToast(t('toastZipCreating') || 'Сборка ZIP архива (JSON + Арт)... 📦');

    try {
      const zip = new JSZip();
      const slug = state.slug || 'boss';

      // 1. Combined per-boss file, ready to drop into datamine/fce/data/bosses/.
      //    After copying, run `node pipeline/processors/build-fce-index.js` to refresh the
      //    manifest (new bosses are appended to the end of the order).
      const bossObj = generateBossJsonObject();
      const bossesFolder = zip.folder('data').folder('bosses');
      bossesFolder.file(`${slug}.json`, JSON.stringify(bossObj, null, 2) + '\n');

      // 2. Prepare Boss Artwork into /assets/bosses/ mirroring datamine/fce/assets/bosses/
      const assetsFolder = zip.folder('assets').folder('bosses');
      let artFileName = `${slug}.png`;
      let imageBlob = null;

      if (state.art) {
        if (state.art.startsWith('data:image/')) {
          // Convert DataURL to Blob
          const parts = state.art.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          imageBlob = new Blob([u8arr], { type: mime });
          if (mime.includes('webp')) artFileName = `${slug}.webp`;
          else if (mime.includes('jpeg') || mime.includes('jpg')) artFileName = `${slug}.jpg`;
        } else {
          // Fetch from local path or remote CDN
          try {
            const localUrl = resolveArtUrlForPreview(state.art, slug);
            const resp = await fetch(localUrl);
            if (resp.ok) {
              imageBlob = await resp.blob();
            } else {
              throw new Error('Local fetch failed');
            }
          } catch (e) {
            try {
              const remoteUrl = `https://tof.smilekritik.beer/datamine/fce/assets/bosses/${slug}.png`;
              const resp2 = await fetch(remoteUrl);
              if (resp2.ok) {
                imageBlob = await resp2.blob();
              }
            } catch (e2) {}
          }
        }
      }

      if (imageBlob) {
        assetsFolder.file(artFileName, imageBlob);
      }

      // 3. Extra images into /assets/images/
      if (state.extra_images && state.extra_images.length) {
        const extraFolder = zip.folder('assets').folder('images');
        for (let i = 0; i < state.extra_images.length; i++) {
          const extra = state.extra_images[i];
          if (extra.src && extra.src.startsWith('data:image/')) {
            const parts = extra.src.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const ext = mime.includes('webp') ? 'webp' : (mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png');
            extraFolder.file(`layer_${i + 1}.${ext}`, new Blob([u8arr], { type: mime }));
          }
        }
      }

      // 4. Include custom official font file into /assets/fonts/ if uploaded
      if (state.customFontBuffer && state.customFontFileName) {
        const fontsFolder = zip.folder('assets').folder('fonts');
        fontsFolder.file(state.customFontFileName, state.customFontBuffer);
      }

      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `fce-${slug}-package.zip`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(link.href), 10000);
      showToast(t('toastZipDownloaded') || 'ZIP архив успешно скачан! 📦✨');
    } catch (err) {
      console.error('[FCE Builder] Error creating ZIP package:', err);
      showToast('Ошибка при создании ZIP: ' + err.message);
    }
  }

  function downloadDualBossJson() {
    downloadZipPackage();
  }

  function updateJsonPreview() {
    if (!dom.jsonPreviewBlock) return;
    let data;
    if (state.previewMode === 'en') {
      data = generateLangView('en');
    } else if (state.previewMode === 'ru') {
      data = generateLangView('ru');
    } else {
      data = generateBossJsonObject();
    }
    dom.jsonPreviewBlock.textContent = JSON.stringify(data, null, 2);
  }

  function openExportModalWithTab(tabName = 'dual') {
    state.modalActiveTab = tabName;
    dom.modalTabs.forEach((tab) => {
      if (tab.dataset.modaltab === tabName) {
        tab.classList.add('is-active');
      } else {
        tab.classList.remove('is-active');
      }
    });
    renderModalContent();
    dom.exportModal.classList.add('is-open');
  }

  function renderModalContent() {
    const tab = state.modalActiveTab || 'dual';
    if (tab === 'dual') {
      dom.modalInstructions.innerHTML = t('modalInstructionsDual');
      dom.modalCodeArea.value = JSON.stringify(generateBossJsonObject(), null, 2);
    } else if (tab === 'en') {
      dom.modalInstructions.innerHTML = t('modalInstructionsEn');
      dom.modalCodeArea.value = JSON.stringify(generateLangView('en'), null, 2);
    } else if (tab === 'ru') {
      dom.modalInstructions.innerHTML = t('modalInstructionsRu');
      dom.modalCodeArea.value = JSON.stringify(generateLangView('ru'), null, 2);
    } else if (tab === 'html') {
      dom.modalInstructions.innerHTML = t('modalInstructionsHtml');
      const cardClone = dom.fceCard.cloneNode(true);
      cardClone.querySelectorAll('.fce-card__line-tools, .fce-card__add-btn').forEach((el) => el.remove());
      dom.modalCodeArea.value = cardClone.outerHTML;
    }
  }

  function handleModalCopy() {
    navigator.clipboard.writeText(dom.modalCodeArea.value).then(() => {
      showToast(t('toastJsonCopied'));
    });
  }

  function handleModalDownload() {
    const tab = state.modalActiveTab || 'dual';
    let filename = `fce-${state.slug || 'boss'}-dual.json`;
    let type = 'application/json';

    if (tab === 'en') {
      filename = `fce-${state.slug || 'boss'}-en.json`;
    } else if (tab === 'ru') {
      filename = `fce-${state.slug || 'boss'}-ru.json`;
    } else if (tab === 'html') {
      filename = `fce-${state.slug || 'boss'}.html`;
      type = 'text/html';
    }

    const blob = new Blob([dom.modalCodeArea.value], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast(t('toastJsonDownloaded'));
  }

  async function downloadCardPng() {
    const html2canvasFn = window.html2canvas;
    if (typeof html2canvasFn !== 'function') {
      alert('Библиотека html2canvas еще не загружена. Пожалуйста, подождите.');
      return;
    }

    showToast(t('toastRendering'));

    const prevLabel = dom.btnDownloadPng.innerHTML;
    dom.btnDownloadPng.disabled = true;
    dom.btnDownloadPng.innerHTML = '<span class="fceb-btn__icon">⏳</span><span>...</span>';

    try {
      const exportRoot = document.createElement('div');
      exportRoot.className = 'fce-export-root';
      const exportCard = dom.fceCard.cloneNode(true);
      exportCard.classList.add('fce-card--export');
      exportCard.style.transform = 'none';
      exportCard.querySelectorAll('.fceb-gizmo, .fce-card__line-tools, .fce-card__add-btn').forEach((el) => el.remove());

      exportRoot.appendChild(exportCard);
      document.body.appendChild(exportRoot);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvasFn(exportCard, {
        backgroundColor: null,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
        scale: 1,
        useCORS: true,
        logging: false,
        removeContainer: true
      });

      exportRoot.remove();

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `fce-${state.slug || 'boss'}-${state.currentLangPreset}.png`;
      link.click();

      showToast(t('toastPngDownloaded'));
    } catch (err) {
      console.error('[FCE Builder] Error export PNG:', err);
      // A "tainted canvas" SecurityError means the boss art was loaded from a
      // local file:// path, which browsers refuse to export for security. The
      // fix a normal user can apply without a server is to upload their own art
      // (that becomes a data: URL and exports fine).
      const tainted = err && (err.name === 'SecurityError' || /taint|insecure|cross-origin/i.test(String(err.message || err)));
      if (tainted && location.protocol === 'file:') {
        const isRu = state.currentLangPreset === 'ru';
        alert(isRu
          ? 'Не удалось сохранить PNG.\n\nБраузер блокирует экспорт, потому что картинка встроенного босса — локальный файл (file://).\n\nРешения:\n1) Запустите файл start-fcebuilder.bat в корне проекта — он поднимет локальный сервер и откроет билдер, где скачивание работает.\n2) Либо загрузите своё изображение босса кнопкой загрузки — тогда PNG скачивается прямо из file://, без сервера.'
          : 'Could not save PNG.\n\nThe browser blocks the export because the built-in boss art is a local file (file://).\n\nFixes:\n1) Run start-fcebuilder.bat in the project root — it starts the local server and opens the builder, where download works.\n2) Or upload your own boss image with the upload button — then the PNG exports straight from file://, no server needed.');
      } else {
        showToast('Ошибка рендера PNG.');
      }
    } finally {
      dom.btnDownloadPng.disabled = false;
      dom.btnDownloadPng.innerHTML = prevLabel;
    }
  }

  function copyCardHtml() {
    const cardClone = dom.fceCard.cloneNode(true);
    cardClone.querySelectorAll('.fceb-gizmo, .fce-card__line-tools, .fce-card__add-btn').forEach((el) => el.remove());
    const cardHtml = cardClone.outerHTML;

    navigator.clipboard.writeText(cardHtml).then(() => {
      showToast(t('toastHtmlCopied'));
    }).catch(() => {
      openExportModalWithTab('html');
    });
  }

  function closeModal() {
    dom.exportModal.classList.remove('is-open');
  }

  function getStoredEditsMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EDITS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // Strictly-increasing, time-based sequence so several new bosses made in a row
  // keep their creation order when the index is rebuilt.
  function nextCreationOrder() {
    const key = 'fce_boss_order_seq';
    let prev = 0;
    try { prev = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) {}
    const next = Math.max(Date.now(), prev + 1);
    try { localStorage.setItem(key, String(next)); } catch (e) {}
    return next;
  }

  // True when this slug is not one of the bosses already on the live site.
  function isNewBossSlug(slug) {
    const en = window.FCE_PRESETS?.en || [];
    const ru = window.FCE_PRESETS?.ru || [];
    return !en.some((b) => b.slug === slug) && !ru.some((b) => b.slug === slug);
  }

  function setStoredEditsMap(map) {
    try {
      localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(map));
    } catch (e) {}
  }

  function isBossModified(slug) {
    if (!slug) return false;
    const catalogRu = window.FCE_PRESETS?.ru || [];
    const catalogEn = window.FCE_PRESETS?.en || [];
    const bossRu = catalogRu.find((b) => b.slug === slug);
    const bossEn = catalogEn.find((b) => b.slug === slug);

    if (!bossRu && !bossEn) return true; // Custom new boss

    // 1. Extra images added
    if (state.extra_images && state.extra_images.length > 0) return true;

    // 2. Opacity modified
    if (state.art_opacity !== undefined && Math.abs(state.art_opacity - 1.0) > 0.001) return true;

    // 3. Scale & position
    const origArtScale = Number.isFinite(Number(bossEn?.art_scale ?? bossRu?.art_scale)) ? Number(bossEn?.art_scale ?? bossRu?.art_scale) : 1.08;
    const origArtX = Number.isFinite(Number(bossEn?.art_x ?? bossRu?.art_x)) ? Number(bossEn?.art_x ?? bossRu?.art_x) : -96;
    const origArtY = Number.isFinite(Number(bossEn?.art_y ?? bossRu?.art_y)) ? Number(bossEn?.art_y ?? bossRu?.art_y) : 0;
    const origNameColor = (bossEn?.name_color || bossRu?.name_color || '#f16937').toLowerCase();
    const currNameColor = (state.name_color || '#f16937').toLowerCase();

    if (origNameColor !== currNameColor) return true;
    if (Math.abs((state.art_scale_x ?? state.art_scale) - origArtScale) > 0.001) return true;
    if (Math.abs((state.art_scale_y ?? state.art_scale) - origArtScale) > 0.001) return true;
    if (state.art_x !== origArtX || state.art_y !== origArtY) return true;
    if ((state.source_psd || '').trim() !== (bossEn?.source_psd || bossRu?.source_psd || '').trim()) return true;
    if ((state.boss_id || '').trim() !== (bossEn?.boss_id || bossRu?.boss_id || '').trim()) return true;

    // Compare names
    if ((state.translations.ru.name || '').trim() !== (bossRu?.name || bossEn?.name || '').trim()) return true;
    if ((state.translations.en.name || '').trim() !== (bossEn?.name || bossRu?.name || '').trim()) return true;

    // Compare mechanics
    const origRuMech = bossRu?.mechanics || [];
    const currRuMech = state.translations.ru.mechanics || [];
    if (origRuMech.length !== currRuMech.length) return true;
    for (let i = 0; i < origRuMech.length; i++) {
      if ((currRuMech[i].html || '').trim() !== (origRuMech[i].html || origRuMech[i].text || '').trim()) return true;
      if (String(currRuMech[i].index || (i + 1)) !== String(origRuMech[i].index || (i + 1))) return true;
    }

    const origEnMech = bossEn?.mechanics || [];
    const currEnMech = state.translations.en.mechanics || [];
    if (origEnMech.length !== currEnMech.length) return true;
    for (let i = 0; i < origEnMech.length; i++) {
      if ((currEnMech[i].html || '').trim() !== (origEnMech[i].html || origEnMech[i].text || '').trim()) return true;
      if (String(currEnMech[i].index || (i + 1)) !== String(origEnMech[i].index || (i + 1))) return true;
    }

    return false;
  }

  function updateBossEditStatus() {
    const modified = isBossModified(state.slug);
    const badge = dom.bossStatusBadge;
    const text = dom.bossStatusText;
    const btnRevert = dom.btnRevertToOriginal;

    if (badge && text) {
      if (modified) {
        badge.className = 'fceb-status-badge fceb-status-badge--edited';
        text.textContent = t('statusEdited') || 'Отредактировано';
        if (btnRevert) btnRevert.style.display = 'inline-flex';
      } else {
        badge.className = 'fceb-status-badge fceb-status-badge--clean';
        text.textContent = t('statusOriginal') || 'Оригинал с сайта';
        if (btnRevert) btnRevert.style.display = 'none';
      }
    }

    const editsMap = getStoredEditsMap();
    if (modified) {
      // Stamp a creation-order hint the first time a brand-new boss is saved, so
      // a batch of new bosses keeps the order they were made in.
      if (isNewBossSlug(state.slug) && !Number.isFinite(Number(state.order))) {
        state.order = nextCreationOrder();
      }
      editsMap[state.slug] = JSON.parse(JSON.stringify(state));
    } else {
      delete editsMap[state.slug];
    }
    setStoredEditsMap(editsMap);

    // Relabel is cheap; only do a full rebuild when a new temp boss needs to be
    // added to (or removed from) the dropdown.
    const hasOption = Array.from(dom.presetSelect.options).some((o) => o.value === state.slug);
    if (isNewBossSlug(state.slug) && (modified !== hasOption)) {
      populatePresetsDropdown();
    } else {
      updateDropdownOptionLabels(editsMap);
    }
  }

  function updateDropdownOptionLabels(editsMap = getStoredEditsMap()) {
    if (!dom.presetSelect) return;
    const lang = state.currentLangPreset === 'ru' ? 'ru' : 'en';
    Array.from(dom.presetSelect.options).forEach((opt) => {
      const slug = opt.value;
      if (!slug) return;
      if (isNewBossSlug(slug)) {
        // Locally-created temp boss — keep its name fresh from the draft, mark 🆕.
        const draft = editsMap[slug];
        if (!draft) return;
        const name = draft.translations?.[lang]?.name
          || draft.translations?.en?.name
          || draft.translations?.ru?.name
          || slug;
        opt.dataset.baseName = name;
        opt.textContent = `${name} (${slug}) 🆕`;
        return;
      }
      const isMod = !!editsMap[slug];
      const baseName = opt.dataset.baseName || opt.textContent.replace(/\s*\(.*?\)(\s*✏️)?$/, '').trim();
      opt.dataset.baseName = baseName;
      opt.textContent = isMod ? `${baseName} (${slug}) ✏️` : `${baseName} (${slug})`;
    });
  }

  function handleRevertToOriginal() {
    if (!confirm(t('confirmRevert'))) return;
    const editsMap = getStoredEditsMap();
    delete editsMap[state.slug];
    setStoredEditsMap(editsMap);

    state.extra_images = [];
    state.activeImageTarget = 'boss';

    loadBossPreset(state.slug, false, true);
    showToast(t('toastReverted'));
  }

  // Split a combined per-boss file into the historic { en, ru } preset entries
  // the builder's load code expects.
  function splitCombinedBoss(full) {
    const SHARED = ['boss_id', 'source_psd', 'art', 'art_object_position', 'name_color',
      'art_scale', 'art_x', 'art_y', 'name_y', 'name_right', 'name_width', 'name_scale',
      'copy_width', 'copy_y', 'copy_scale'];
    const mech = (arr) => (Array.isArray(arr) ? arr : []).map((m) => ({ index: m.index || '', html: m.html || '' }));
    const enEntry = { slug: full.slug, name: (full.en && full.en.name) || full.slug };
    SHARED.forEach((k) => { if (full[k] !== undefined && full[k] !== null) enEntry[k] = full[k]; });
    enEntry.mechanics = mech(full.en && full.en.mechanics);
    const ruEntry = {
      slug: full.slug,
      name: (full.ru && full.ru.name) || (full.en && full.en.name) || full.slug,
      boss_id: full.boss_id || undefined,
      mechanics: mech(full.ru && full.ru.mechanics)
    };
    return { en: enEntry, ru: ruEntry };
  }

  // Refresh the preset catalog from the live site's per-boss layout: read the
  // manifest for order + names, reuse the bundled offline data for known bosses,
  // and fetch only the per-boss files that are new on the site.
  async function syncRemoteCatalog() {
    // Auto-detect environment: a file:// page has no server to sync from, so use
    // the bundled presets.js offline catalog (no failed cross-origin fetch).
    if (location.protocol === 'file:') return;
    // Same origin as whatever served the builder: localhost syncs local data,
    // the prod server syncs prod data — no hardcoded domain.
    const BASE = '../../datamine/fce/data/';
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
      const fetchOpts = controller ? { signal: controller.signal } : {};

      const resIdx = await fetch(`${BASE}fce-index.json`, fetchOpts);
      if (!resIdx.ok) { if (timer) clearTimeout(timer); return; }
      const idx = await resIdx.json();
      const manifest = Array.isArray(idx.bosses) ? idx.bosses : [];

      const enBySlug = new Map((window.FCE_PRESETS?.en || []).map((b) => [b.slug, b]));
      const ruBySlug = new Map((window.FCE_PRESETS?.ru || []).map((b) => [b.slug, b]));

      const en = [];
      const ru = [];
      for (const m of manifest) {
        let enB = enBySlug.get(m.slug);
        let ruB = ruBySlug.get(m.slug);
        if (!enB || !ruB) {
          try {
            const r = await fetch(`${BASE}bosses/${encodeURIComponent(m.slug)}.json`, fetchOpts);
            if (r.ok) {
              const split = splitCombinedBoss(await r.json());
              enB = split.en;
              ruB = split.ru;
            }
          } catch (e) { /* skip this boss */ }
        }
        if (enB) en.push(enB);
        if (ruB) ru.push(ruB);
      }
      if (timer) clearTimeout(timer);

      if (en.length) {
        window.FCE_PRESETS = { en, ru };
        populatePresetsDropdown();
        updateBossEditStatus();
        showToast(t('toastLiveSynced'));
      }
    } catch (err) {
      console.log('Running in standalone/offline mode with bundled presets:', err?.message || err);
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(state));
      updateBossEditStatus();
      updateJsonPreview();
    } catch (e) {
      // LocalStorage error fallback
    }
  }

  function restoreSavedDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.translations) {
          Object.assign(state, parsed);
        }
      }
      // Migrate the legacy opaque name-stroke default to datamine/fce's exact
      // colour so older autosaved drafts render the boss name identically.
      if (state.name_stroke_color === '#111111') {
        state.name_stroke_color = 'rgba(17, 17, 17, 0.92)';
      }
    } catch (e) {
      console.warn('Could not restore draft:', e);
    }

    // Restore custom font if saved in state
    if (state.customFontData && state.customFontName) {
      try {
        const binaryStr = atob(state.customFontData.split(',')[1] || state.customFontData);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        state.customFontBuffer = bytes.buffer;
        const fontFace = new FontFace(state.customFontName, bytes.buffer);
        fontFace.load().then((loaded) => {
          document.fonts.add(loaded);
          addFontOptionToDropdown(state.customFontName, `${state.customFontFileName || state.customFontName} (Сохранен)`);
          if (dom.selectCopyFont) dom.selectCopyFont.value = state.copy_font_family;
          updateCopyStyles();
          updateFontStatusBadge();
        }).catch(() => {});
      } catch (e) {
        console.warn('Could not restore custom font:', e);
      }
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getPluralizedWord(n, one, few, many) {
    if (state.currentLangPreset === 'en') {
      return n === 1 ? one : many;
    }
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
    return many;
  }

  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'fceb-toast';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2800);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      dom.workspace.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Toggle focus/read-only mode whenever fullscreen state changes
  document.addEventListener('fullscreenchange', () => {
    const isFull = !!document.fullscreenElement;
    if (dom.fceCard) {
      dom.fceCard.classList.toggle('fce-card--focus', isFull);
    }
    // Hide the docked selection toolbar in focus/fullscreen mode; restore on exit.
    if (dom.selectionToolbar) {
      dom.selectionToolbar.style.display = isFull ? 'none' : 'flex';
    }
  });


})();
