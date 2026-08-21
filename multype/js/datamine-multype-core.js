(function (factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TofMultypeCore = api;
  }
})(function () {
  const DATASET_SOURCE_FILE = "module_extra_to_files_mapping3.json";
  const DEFAULT_RENAME_VERSION = 1;
  const TOOLTIP_OFFSET = 14;
  const ATTRIBUTE_COLORS = {
    Final: "D3D3D3",
    Phy: "FFA07A",
    Fire: "EC5353",
    Ice: "ADD8E6",
    Thunder: "DDA0DD",
    Superpower: "90EE90",
    Crit: "FFFF00",
    Common: "F5F5DC"
  };
  const DEFAULT_NON_ELEMENTAL_COLOR = ATTRIBUTE_COLORS.Final;

  function createEmptyRenameStore(sourceFile) {
    return {
      version: DEFAULT_RENAME_VERSION,
      sourceFile: sourceFile || DATASET_SOURCE_FILE,
      mainRenames: {},
      subRenames: {},
      valueRenames: {},
      groupRenames: {}
    };
  }

  function sanitizeRenameMap(value) {
    const next = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return next;
    }

    Object.entries(value).forEach(([key, rename]) => {
      if (typeof key !== "string" || typeof rename !== "string") {
        return;
      }

      const trimmedKey = key.trim();
      const trimmedValue = rename.trim();
      if (!trimmedKey || !trimmedValue) {
        return;
      }

      next[trimmedKey] = trimmedValue;
    });

    return next;
  }

  function sanitizeGroupRenameMap(value) {
    const next = {};
    const sanitized = sanitizeRenameMap(value);

    Object.entries(sanitized).forEach(([key, rename]) => {
      const parts = key.split("::");
      if (parts.length < 3) {
        next[key] = rename;
        return;
      }

      const mainKey = parts[0];
      const subKey = parts[1];
      const rawCanonicalKey = parts.slice(2).join("::");
      const normalizedCanonicalKey = canonicalizeValueBaseKey(rawCanonicalKey);
      next[composeGroupRenameKey(mainKey, subKey, normalizedCanonicalKey)] = rename;
    });

    return next;
  }

  function sanitizeValueRenameMap(value) {
    const next = {};
    const sanitized = sanitizeRenameMap(value);
    const byValueKey = new Map();

    Object.entries(sanitized).forEach(([key, rename]) => {
      const parts = key.split("::");
      const valueKey = parts[parts.length - 1];
      if (!byValueKey.has(valueKey)) {
        byValueKey.set(valueKey, []);
      }
      byValueKey.get(valueKey).push([key, rename]);
    });

    byValueKey.forEach((entries, valueKey) => {
      const uniqueRenames = Array.from(new Set(entries.map(([, rename]) => rename)));
      if (uniqueRenames.length === 1) {
        next[valueKey] = uniqueRenames[0];
        return;
      }

      entries.forEach(([key, rename]) => {
        next[key] = rename;
      });
    });

    return next;
  }

  function normalizeRenameStore(raw, fallbackMeta) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const fallbackSourceFile =
      fallbackMeta && typeof fallbackMeta.sourceFile === "string" && fallbackMeta.sourceFile.trim()
        ? fallbackMeta.sourceFile.trim()
        : DATASET_SOURCE_FILE;
    const version = Number.parseInt(source.version, 10);

    return {
      version: Number.isFinite(version) && version > 0 ? version : DEFAULT_RENAME_VERSION,
      sourceFile:
        typeof source.sourceFile === "string" && source.sourceFile.trim()
          ? source.sourceFile.trim()
          : fallbackSourceFile,
      mainRenames: sanitizeRenameMap(source.mainRenames),
      subRenames: sanitizeRenameMap(source.subRenames),
      valueRenames: sanitizeValueRenameMap(source.valueRenames),
      groupRenames: sanitizeGroupRenameMap(source.groupRenames)
    };
  }

  function mergeRenameStores() {
    const stores = Array.from(arguments).filter(Boolean);
    const merged = createEmptyRenameStore(DATASET_SOURCE_FILE);

    stores.forEach((store) => {
      const normalized = normalizeRenameStore(store, { sourceFile: merged.sourceFile });
      merged.version = normalized.version || merged.version;
      merged.sourceFile = normalized.sourceFile || merged.sourceFile;
      Object.assign(merged.mainRenames, normalized.mainRenames);
      Object.assign(merged.subRenames, normalized.subRenames);
      Object.assign(merged.valueRenames, normalized.valueRenames);
      Object.assign(merged.groupRenames, normalized.groupRenames);
    });

    return merged;
  }

  function diffRenameStores(baseStore, effectiveStore) {
    const base = normalizeRenameStore(baseStore, {
      sourceFile: effectiveStore && effectiveStore.sourceFile
    });
    const effective = normalizeRenameStore(effectiveStore, {
      sourceFile: base.sourceFile
    });
    const diff = createEmptyRenameStore(effective.sourceFile || base.sourceFile);

    ["mainRenames", "subRenames", "valueRenames", "groupRenames"].forEach((section) => {
      Object.entries(effective[section]).forEach(([key, value]) => {
        if ((base[section][key] || "") !== value) {
          diff[section][key] = value;
        }
      });
    });

    return diff;
  }

  function stripJsonExtension(valueKey) {
    return String(valueKey || "").replace(/\.json$/i, "");
  }

  function canonicalizeValueBaseKey(valueBaseKey) {
    return String(valueBaseKey || "")
      .replace(/_(Level|Lvl|Lv)0*\d+(?=_|$)/gi, "")
      .replace(/__+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getDisplayValueLabel(valueKey) {
    return stripJsonExtension(valueKey);
  }

  function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0;
    let g = 0;
    let b = 0;

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      default:
        r = v;
        g = p;
        b = q;
        break;
    }

    return [r, g, b].map((value) => Math.round(value * 255));
  }

  function rgbToHex(rgb) {
    return rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function hexToRgb(hexColor) {
    const clean = String(hexColor || "").replace(/^#/, "");
    return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) || 0);
  }

  function blendHex(hexColor, targetHex, ratio) {
    const source = hexToRgb(hexColor);
    const target = hexToRgb(targetHex);
    return rgbToHex(
      source.map((value, index) => Math.round(value * (1 - ratio) + target[index] * ratio))
    );
  }

  function generateRainbowColors(count) {
    const colors = [];
    for (let index = 0; index < count; index += 1) {
      const hue = count > 0 ? index / count : 0;
      colors.push(rgbToHex(hsvToRgb(hue, 1, 1)));
    }
    return colors;
  }

  function darkenHexColor(hexColor, factor) {
    const clean = String(hexColor || "").replace(/^#/, "");
    const rgb = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) || 0);
    return rgbToHex(rgb.map((value) => Math.max(Math.floor(value / factor), 0)));
  }

  function hexToRgba(hexColor, alpha) {
    const rgb = hexToRgb(hexColor);
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  function createMainSurfacePalette(hexColor) {
    const clean = String(hexColor || "").replace(/^#/, "") || "888888";

    return {
      accent: `#${clean}`,
      accentSoft: hexToRgba(clean, 0.12),
      accentLine: hexToRgba(clean, 0.28),
      accentWash: hexToRgba(clean, 0.06),
      accentPanel: hexToRgba(clean, 0.16),
      accentInk: "#f5f5f7"
    };
  }

  function createSubSurfacePalette(hexColor, isDarkened) {
    const clean = String(hexColor || "").replace(/^#/, "") || "B8B8B8";
    const bodyHex = blendHex(clean, "FFFFFF", isDarkened ? 0.44 : 0.62);
    const headerHex = blendHex(clean, "FFFFFF", isDarkened ? 0.32 : 0.5);
    const borderHex = blendHex(clean, "7A7A7A", isDarkened ? 0.08 : 0.04);

    return {
      accent: `#${clean}`,
      accentSoft: hexToRgba(bodyHex, 0.98),
      accentLine: hexToRgba(borderHex, 0.42),
      accentWash: hexToRgba(bodyHex, 0.92),
      accentPanel: hexToRgba(headerHex, 0.98),
      accentInk: "#1f1a1d"
    };
  }

  function getAttributeColorMeta(attributeName) {
    const name = String(attributeName || "");

    if (name.includes("Crit")) {
      return {
        hex: ATTRIBUTE_COLORS.Crit,
        isDarkened: false
      };
    }

    let baseColor = "";
    Object.keys(ATTRIBUTE_COLORS).some((key) => {
      if (name.startsWith(key)) {
        baseColor = ATTRIBUTE_COLORS[key];
        return true;
      }
      return false;
    });

    if (!baseColor) {
      return null;
    }

    return {
      hex: baseColor,
      isDarkened:
        (name.includes("Down") || name.includes("Def")) &&
        !name.includes("Ignore") &&
        !name.includes("Break")
    };
  }

  function composeSubRenameKey(mainKey, subKey) {
    return `${mainKey}::${subKey}`;
  }

  function composeValueRenameKey(mainKey, subKey, valueKey) {
    return `${mainKey}::${subKey}::${valueKey}`;
  }

  function composeGroupRenameKey(mainKey, subKey, canonicalValueBaseKey) {
    return `${mainKey}::${subKey}::${canonicalValueBaseKey}`;
  }

  function resolveExactRename(renames, valueEntry) {
    const contextualExactRename = renames.valueRenames[valueEntry.valueRenameKey] || "";
    const globalExactRename = renames.valueRenames[valueEntry.valueKey] || "";

    return {
      contextualExactRename,
      globalExactRename,
      exactRename: contextualExactRename || globalExactRename || "",
      exactRenameScope: contextualExactRename ? "contextual" : globalExactRename ? "global" : ""
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function encodeAttrList(items) {
    return encodeURIComponent((items || []).join("\n"));
  }

  function decodeAttrList(value) {
    if (!value) {
      return [];
    }

    try {
      return decodeURIComponent(value)
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function normalizeTextForSearch(value) {
    return String(value || "").toLocaleLowerCase("ru-RU");
  }

  function includesQuery(query, values) {
    if (!query) {
      return true;
    }

    return values.some((value) => normalizeTextForSearch(value).includes(query));
  }

  function getFileNameFromUrl(url) {
    const clean = String(url || "").split("?")[0].split("#")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || DATASET_SOURCE_FILE;
  }

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    });
  }

  function normalizeDataset(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const mainEntries = Object.entries(source).filter(([, subMap]) => subMap && typeof subMap === "object" && !Array.isArray(subMap));
    const rainbowColors = generateRainbowColors(mainEntries.length);
    const groups = [];
    const mainOptions = [];
    const subOptionsSet = new Set();
    let totalSubs = 0;
    let totalValues = 0;

    mainEntries.forEach(([mainKey, subMap], mainIndex) => {
      const palette = createMainSurfacePalette(rainbowColors[mainIndex] || "888888");
      const subEntries = [];

      Object.entries(subMap).forEach(([subKey, list]) => {
        const values = Array.isArray(list)
          ? list
              .filter((entry) => typeof entry === "string" && entry.trim())
              .map((valueKey) => {
                const cleanValueKey = valueKey.trim();
                const valueBaseKey = stripJsonExtension(cleanValueKey);
                const canonicalValueBaseKey = canonicalizeValueBaseKey(valueBaseKey);

                return {
                  valueKey: cleanValueKey,
                  valueBaseKey,
                  canonicalValueBaseKey,
                  valueRenameKey: composeValueRenameKey(mainKey, subKey, cleanValueKey),
                  groupRenameKey: composeGroupRenameKey(mainKey, subKey, canonicalValueBaseKey)
                };
              })
          : [];

        if (!values.length) {
          return;
        }

        totalSubs += 1;
        totalValues += values.length;
        subOptionsSet.add(subKey);
        const subColor = getAttributeColorMeta(subKey);
          subEntries.push({
            subKey,
            subRenameKey: composeSubRenameKey(mainKey, subKey),
            surface: subColor
              ? createSubSurfacePalette(subColor.hex, subColor.isDarkened)
              : createSubSurfacePalette(DEFAULT_NON_ELEMENTAL_COLOR, false),
            values
          });
        });

      if (!subEntries.length) {
        return;
      }

      mainOptions.push(mainKey);
      groups.push({
        mainKey,
        accent: palette.accent,
        accentSoft: palette.accentSoft,
        accentLine: palette.accentLine,
        accentWash: palette.accentWash,
        accentPanel: palette.accentPanel,
        accentInk: palette.accentInk,
        subEntries
      });
    });

    return {
      groups,
      totalGroups: groups.length,
      totalSubs,
      totalValues,
      mainOptions,
      subOptions: Array.from(subOptionsSet)
    };
  }

  function resolveValueRename(renames, mainKey, subKey, valueEntry) {
    const exactState = resolveExactRename(renames, valueEntry);
    const groupRename = renames.groupRenames[valueEntry.groupRenameKey] || "";

    return {
      exactRename: exactState.exactRename,
      groupRename,
      rename: exactState.exactRename || groupRename || "",
      renameSource: exactState.exactRename ? "exact" : groupRename ? "group" : ""
    };
  }

  function buildGlobalStats(dataset, renames) {
    let renamedMainCount = 0;
    let renamedSubCount = 0;
    let renamedValueCount = 0;

    dataset.groups.forEach((group) => {
      if (renames.mainRenames[group.mainKey]) {
        renamedMainCount += 1;
      }

      group.subEntries.forEach((subEntry) => {
        if (renames.subRenames[subEntry.subRenameKey]) {
          renamedSubCount += 1;
        }

        subEntry.values.forEach((valueEntry) => {
          if (resolveValueRename(renames, group.mainKey, subEntry.subKey, valueEntry).rename) {
            renamedValueCount += 1;
          }
        });
      });
    });

    return {
      renamedMainCount,
      renamedSubCount,
      renamedValueCount
    };
  }

  function buildViewModel(dataset, renames, uiState) {
    const query = normalizeTextForSearch(uiState.search || "");
    const groups = [];
    let visibleSubCount = 0;
    let visibleValueCount = 0;

    dataset.groups.forEach((group) => {
      if (uiState.mainFilter && group.mainKey !== uiState.mainFilter) {
        return;
      }

      const mainRename = renames.mainRenames[group.mainKey] || "";
      const mainDisplayLabel = uiState.mode === "datamined" ? group.mainKey : mainRename || group.mainKey;
      const mainMatches = includesQuery(query, [group.mainKey, mainDisplayLabel]);
      const visibleSubs = [];

      group.subEntries.forEach((subEntry) => {
        if (uiState.subFilter && subEntry.subKey !== uiState.subFilter) {
          return;
        }

        const subRename = renames.subRenames[subEntry.subRenameKey] || "";
        const subDisplayLabel = uiState.mode === "datamined" ? subEntry.subKey : subRename || subEntry.subKey;
        const subMatches = includesQuery(query, [
          group.mainKey,
          mainDisplayLabel,
          subEntry.subKey,
          subDisplayLabel
        ]);
        const candidateValues = [];

        subEntry.values.forEach((valueEntry) => {
          const renameState = resolveValueRename(renames, group.mainKey, subEntry.subKey, valueEntry);
          const hasRename = Boolean(renameState.rename);

          if (uiState.mode === "renamed" && !hasRename) {
            return;
          }

          if (uiState.renameFilter === "renamed" && !hasRename) {
            return;
          }

          if (uiState.renameFilter === "unrenamed" && hasRename) {
            return;
          }

          const dataminedLabel = getDisplayValueLabel(valueEntry.valueKey);
          const displayLabel =
            uiState.mode === "datamined" ? dataminedLabel : renameState.rename || dataminedLabel;
          const valueMatches =
            !query ||
            mainMatches ||
            subMatches ||
            includesQuery(query, [
              valueEntry.valueKey,
              dataminedLabel,
              valueEntry.valueBaseKey,
              valueEntry.canonicalValueBaseKey,
              renameState.rename,
              displayLabel
            ]);

          if (!valueMatches) {
            return;
          }

          candidateValues.push({
            primaryValueKey: valueEntry.valueKey,
            allValueKeys: [valueEntry.valueKey],
            valueBaseKey: valueEntry.valueBaseKey,
            canonicalValueBaseKey: valueEntry.canonicalValueBaseKey,
            hasRename,
            displayLabel,
            originalLabel: dataminedLabel,
            renameLabel: renameState.rename,
            renameSource: renameState.renameSource,
            tooltipTitle: displayLabel,
            tooltipLines: hasRename ? [dataminedLabel] : [],
            isDeduped: false
          });
        });

        if (!candidateValues.length) {
          return;
        }

        let valuesToRender = candidateValues;

        if (uiState.mode === "renamed") {
          const byDisplay = new Map();

          candidateValues.forEach((entry) => {
            const existing = byDisplay.get(entry.displayLabel);
            if (existing) {
              existing.allValueKeys.push(entry.primaryValueKey);
              existing.tooltipLines.push(entry.originalLabel);
              existing.isDeduped = true;
              return;
            }

            byDisplay.set(entry.displayLabel, {
              primaryValueKey: entry.primaryValueKey,
              allValueKeys: entry.allValueKeys.slice(),
              valueBaseKey: entry.valueBaseKey,
              canonicalValueBaseKey: entry.canonicalValueBaseKey,
              hasRename: entry.hasRename,
              displayLabel: entry.displayLabel,
              originalLabel: entry.originalLabel,
              renameLabel: entry.renameLabel,
              renameSource: entry.renameSource,
              tooltipTitle: entry.displayLabel,
              tooltipLines: entry.tooltipLines.slice(),
              isDeduped: false
            });
          });

          valuesToRender = Array.from(byDisplay.values()).map((entry) => {
            const uniqueOriginals = Array.from(new Set(entry.tooltipLines));

            return {
              primaryValueKey: entry.primaryValueKey,
              allValueKeys: Array.from(new Set(entry.allValueKeys)),
              valueBaseKey: entry.valueBaseKey,
              canonicalValueBaseKey: entry.canonicalValueBaseKey,
              hasRename: entry.hasRename,
              displayLabel: entry.displayLabel,
              originalLabel: uniqueOriginals[0] || entry.originalLabel,
              renameLabel: entry.renameLabel,
              renameSource: entry.renameSource,
              tooltipTitle: entry.displayLabel,
              tooltipLines: uniqueOriginals,
              isDeduped: uniqueOriginals.length > 1
            };
          });
        }

        visibleSubCount += 1;
        visibleValueCount += valuesToRender.length;
        visibleSubs.push({
          mainKey: group.mainKey,
          subKey: subEntry.subKey,
          subRenameKey: subEntry.subRenameKey,
          surface: subEntry.surface,
          mainDisplayLabel,
          mainOriginalLabel: group.mainKey,
          mainHasRename: Boolean(mainRename),
          subDisplayLabel,
          subOriginalLabel: subEntry.subKey,
          subHasRename: Boolean(subRename),
          values: valuesToRender
        });
      });

      if (!visibleSubs.length) {
        return;
      }

      groups.push({
        mainKey: group.mainKey,
        mainDisplayLabel,
        mainOriginalLabel: group.mainKey,
        mainHasRename: Boolean(mainRename),
        accent: group.accent,
        accentSoft: group.accentSoft,
        accentLine: group.accentLine,
        accentWash: group.accentWash,
        accentPanel: group.accentPanel,
        accentInk: group.accentInk,
        subEntries: visibleSubs
      });
    });

    return {
      groups,
      visibleSubCount,
      visibleValueCount
    };
  }

  function serializeRenameStore(store) {
    return JSON.stringify(normalizeRenameStore(store, { sourceFile: DATASET_SOURCE_FILE }), null, 2);
  }

  function createMultypeApp(options) {
    return new MultypeApp(options);
  }

  class MultypeApp {
    constructor(options) {
      this.options = Object.assign(
        {
          rootSelector: "[data-multype-app]",
          pageKind: "public",
          initialMode: "combined",
          storageKey: "tof-multype-local-renames-v1",
          dataUrl: "./data/module_extra_to_files_mapping3.json",
          renamesUrl: "./data/renames.base.json",
          pageTitle: "Multype datamine viewer",
          pageEyebrow: "Datamine / Multype",
          pageDescription: "",
          language: "en",
          translations: {}
        },
        options || {}
      );
      this.root = document.querySelector(this.options.rootSelector);
      this.tooltip = null;
      this.cursorNotice = null;
      this.tooltipTarget = null;
      this.pointerPosition = null;
      this.noticeTimer = 0;
      this.state = {
        loading: true,
        error: "",
        dataset: null,
        baseRenames: createEmptyRenameStore(getFileNameFromUrl(this.options.dataUrl)),
        draftRenames: createEmptyRenameStore(getFileNameFromUrl(this.options.dataUrl)),
        mode: this.options.initialMode || "combined",
        search: "",
        mainFilter: "",
        subFilter: "",
        renameFilter: "all",
        selectedEntity: null,
        selectedExactValueKey: ""
      };

      if (!this.root) {
        return;
      }

      this.handleRootClick = this.handleRootClick.bind(this);
      this.handleRootInput = this.handleRootInput.bind(this);
      this.handleRootChange = this.handleRootChange.bind(this);
      this.handlePointerOver = this.handlePointerOver.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerOut = this.handlePointerOut.bind(this);
      this.handleFocusIn = this.handleFocusIn.bind(this);
      this.handleFocusOut = this.handleFocusOut.bind(this);
      this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);

      this.root.addEventListener("click", this.handleRootClick);
      this.root.addEventListener("input", this.handleRootInput);
      this.root.addEventListener("change", this.handleRootChange);
      this.root.addEventListener("mouseover", this.handlePointerOver);
      this.root.addEventListener("mousemove", this.handlePointerMove);
      this.root.addEventListener("mouseout", this.handlePointerOut);
      this.root.addEventListener("focusin", this.handleFocusIn);
      this.root.addEventListener("focusout", this.handleFocusOut);
      document.addEventListener("keydown", this.handleDocumentKeyDown);

      this.init();
    }

    getText(key, fallback) {
      const language = this.options.language === "ru" ? "ru" : "en";
      return this.options.translations?.[language]?.[key] || fallback || key;
    }

    setLanguage(language) {
      this.options.language = language === "ru" ? "ru" : "en";
      document.documentElement.lang = this.options.language;
      this.render();
    }

    async init() {
      this.render();

      try {
        const [rawDataset, rawBaseRenames] = await Promise.all([
          fetchJson(this.options.dataUrl),
          fetchJson(this.options.renamesUrl).catch(() =>
            createEmptyRenameStore(getFileNameFromUrl(this.options.dataUrl))
          )
        ]);
        const sourceFile = getFileNameFromUrl(this.options.dataUrl);
        const draft = this.loadDraftRenames(sourceFile);

        this.state.dataset = normalizeDataset(rawDataset);
        this.state.baseRenames = normalizeRenameStore(rawBaseRenames, { sourceFile });
        this.state.draftRenames = normalizeRenameStore(draft, { sourceFile });
        this.state.loading = false;
        this.render();
      } catch (error) {
        this.state.loading = false;
        this.state.error = `Could not load data: ${error.message}`;
        this.render();
      }
    }

    loadDraftRenames(sourceFile) {
      try {
        const raw = localStorage.getItem(this.options.storageKey);
        if (!raw) {
          return createEmptyRenameStore(sourceFile);
        }

        return normalizeRenameStore(JSON.parse(raw), { sourceFile });
      } catch (error) {
        return createEmptyRenameStore(sourceFile);
      }
    }

    persistDraftRenames() {
      if (this.options.pageKind !== "local") {
        return;
      }

      const normalized = normalizeRenameStore(this.state.draftRenames, {
        sourceFile: getFileNameFromUrl(this.options.dataUrl)
      });

      if (
        !Object.keys(normalized.mainRenames).length &&
        !Object.keys(normalized.subRenames).length &&
        !Object.keys(normalized.valueRenames).length &&
        !Object.keys(normalized.groupRenames).length
      ) {
        localStorage.removeItem(this.options.storageKey);
        return;
      }

      localStorage.setItem(this.options.storageKey, serializeRenameStore(normalized));
    }

    getEffectiveRenames() {
      return mergeRenameStores(
        normalizeRenameStore(this.state.baseRenames, {
          sourceFile: getFileNameFromUrl(this.options.dataUrl)
        }),
        normalizeRenameStore(this.state.draftRenames, {
          sourceFile: getFileNameFromUrl(this.options.dataUrl)
        })
      );
    }

    setNotice(kind, text) {
      this.showCursorNotice(kind, text, this.pointerPosition);
    }

    setDraftRename(section, key, nextValue) {
      const trimmed = String(nextValue || "").trim();
      const baseValue = this.state.baseRenames[section][key] || "";
      const nextDraft = normalizeRenameStore(this.state.draftRenames, {
        sourceFile: this.state.baseRenames.sourceFile
      });

      if (!trimmed || trimmed === baseValue) {
        delete nextDraft[section][key];
      } else {
        nextDraft[section][key] = trimmed;
      }

      this.state.draftRenames = nextDraft;
      this.persistDraftRenames();
    }

    resetDraft() {
      this.state.draftRenames = createEmptyRenameStore(this.state.baseRenames.sourceFile);
      this.persistDraftRenames();
      this.setNotice("success", "Draft reset to the base dictionary.");
    }

    exportRenames() {
      const merged = this.getEffectiveRenames();
      const payload = serializeRenameStore(merged);
      const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
      const link = document.createElement("a");

      link.href = URL.createObjectURL(blob);
      link.download = "renames.base.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      this.setNotice("success", "Rename dictionary exported as JSON.");
    }

    async importRenames(file) {
      if (!file) {
        return;
      }

      try {
        const imported = normalizeRenameStore(JSON.parse(await file.text()), {
          sourceFile: this.state.baseRenames.sourceFile
        });
        const nextEffective = mergeRenameStores(this.getEffectiveRenames(), imported);

        this.state.draftRenames = diffRenameStores(this.state.baseRenames, nextEffective);
        this.persistDraftRenames();
        this.setNotice("success", `Imported ${file.name}.`);
      } catch (error) {
        this.setNotice("error", `Could not import JSON: ${error.message}`);
      }
    }

    openEntity(descriptor) {
      this.state.selectedEntity = descriptor;
      this.state.selectedExactValueKey = descriptor.kind === "value" ? descriptor.valueKeys[0] || "" : "";
      this.render();
    }

    getSelectedEditorModel() {
      const entity = this.state.selectedEntity;
      if (!entity || !this.state.dataset) {
        return null;
      }

      const effectiveRenames = this.getEffectiveRenames();

      if (entity.kind === "main") {
        const currentRename = effectiveRenames.mainRenames[entity.mainKey] || "";
        const baseRename = this.state.baseRenames.mainRenames[entity.mainKey] || "";

        return {
          kind: "main",
          title: entity.mainKey,
          meta: ["Main", entity.mainKey],
          currentRename,
          baseRename,
          fieldLabel: "Main rename",
          inputValue: currentRename
        };
      }

      if (entity.kind === "sub") {
        const subRenameKey = composeSubRenameKey(entity.mainKey, entity.subKey);
        const currentRename = effectiveRenames.subRenames[subRenameKey] || "";
        const baseRename = this.state.baseRenames.subRenames[subRenameKey] || "";

        return {
          kind: "sub",
          title: entity.subKey,
          meta: [`Main: ${entity.mainKey}`, `Sub: ${entity.subKey}`],
          currentRename,
          baseRename,
          fieldLabel: "Sub rename",
          inputValue: currentRename
        };
      }

      if (entity.kind === "value") {
        const allValueKeys = entity.valueKeys || [];
        const selectedExactValueKey =
          allValueKeys.includes(this.state.selectedExactValueKey) && this.state.selectedExactValueKey
            ? this.state.selectedExactValueKey
            : allValueKeys[0] || "";
        const exactRenameKey = selectedExactValueKey;
        const legacyExactRenameKey = composeValueRenameKey(entity.mainKey, entity.subKey, selectedExactValueKey);
        const groupRenameKey = composeGroupRenameKey(entity.mainKey, entity.subKey, entity.canonicalValueBaseKey);

        return {
          kind: "value",
          title: entity.displayLabel || getDisplayValueLabel(selectedExactValueKey),
          meta: [
            `Main: ${entity.mainKey}`,
            `Sub: ${entity.subKey}`,
            `Canonical: ${entity.canonicalValueBaseKey}`
          ],
          allValueKeys,
          selectedExactValueKey,
          exactRename: effectiveRenames.valueRenames[exactRenameKey] || effectiveRenames.valueRenames[legacyExactRenameKey] || "",
          groupRename: effectiveRenames.groupRenames[groupRenameKey] || "",
          baseExactRename: this.state.baseRenames.valueRenames[exactRenameKey] || this.state.baseRenames.valueRenames[legacyExactRenameKey] || "",
          baseGroupRename: this.state.baseRenames.groupRenames[groupRenameKey] || "",
          canonicalValueBaseKey: entity.canonicalValueBaseKey,
          isDeduped: entity.valueKeys.length > 1
        };
      }

      return null;
    }

    captureFocusState() {
      const activeElement = document.activeElement;
      if (!activeElement || !this.root.contains(activeElement)) {
        return null;
      }

      const selector = activeElement.hasAttribute("data-control")
        ? `[data-control='${activeElement.getAttribute("data-control")}']`
        : activeElement.hasAttribute("data-editor-text")
        ? "[data-editor-text]"
        : activeElement.hasAttribute("data-editor-exact")
        ? "[data-editor-exact]"
        : activeElement.hasAttribute("data-editor-group")
        ? "[data-editor-group]"
        : null;

      if (!selector) {
        return null;
      }

      return {
        selector,
        selectionStart:
          typeof activeElement.selectionStart === "number" ? activeElement.selectionStart : null,
        selectionEnd:
          typeof activeElement.selectionEnd === "number" ? activeElement.selectionEnd : null
      };
    }

    restoreFocusState(focusState) {
      if (!focusState) {
        return;
      }

      const target = this.root.querySelector(focusState.selector);
      if (!target) {
        return;
      }

      target.focus({ preventScroll: true });

      if (
        typeof focusState.selectionStart === "number" &&
        typeof focusState.selectionEnd === "number" &&
        typeof target.setSelectionRange === "function"
      ) {
        target.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
      }
    }

    getMainFilterOptions(renames) {
      if (!this.state.dataset) {
        return [];
      }

      return this.state.dataset.mainOptions.map((mainKey) => ({
        key: mainKey,
        label: renames.mainRenames[mainKey] || mainKey
      }));
    }

    getSubFilterOptions(renames) {
      if (!this.state.dataset) {
        return [];
      }

      if (this.state.mainFilter) {
        const group = this.state.dataset.groups.find((entry) => entry.mainKey === this.state.mainFilter);
        if (!group) {
          return [];
        }

        return group.subEntries.map((subEntry) => ({
          key: subEntry.subKey,
          label: renames.subRenames[subEntry.subRenameKey] || subEntry.subKey
        }));
      }

      return this.state.dataset.subOptions.map((subKey) => {
        let label = subKey;

        for (const group of this.state.dataset.groups) {
          const subEntry = group.subEntries.find((entry) => entry.subKey === subKey);
          if (!subEntry) {
            continue;
          }

          const renamedLabel = renames.subRenames[subEntry.subRenameKey] || "";
          if (renamedLabel) {
            label = renamedLabel;
            break;
          }
        }

        return { key: subKey, label };
      });
    }

    render() {
      if (!this.root) {
        return;
      }

      const focusState = this.captureFocusState();
      const viewport = this.root.querySelector("[data-multype-viewport]");
      const preservedScroll = viewport
        ? { left: viewport.scrollLeft, top: viewport.scrollTop }
        : { left: 0, top: 0 };
      const effectiveRenames = this.state.dataset
        ? this.getEffectiveRenames()
        : createEmptyRenameStore(getFileNameFromUrl(this.options.dataUrl));
      const globalStats = this.state.dataset ? buildGlobalStats(this.state.dataset, effectiveRenames) : null;
      const viewModel = this.state.dataset
        ? buildViewModel(this.state.dataset, effectiveRenames, {
            mode: this.state.mode,
            search: this.state.search,
            mainFilter: this.state.mainFilter,
            subFilter: this.state.subFilter,
            renameFilter: this.state.renameFilter
          })
        : null;
      const editorModel = this.options.pageKind === "local" ? this.getSelectedEditorModel() : null;

      this.root.innerHTML = this.renderShell(viewModel, globalStats, editorModel);
      this.restoreFocusState(focusState);

      const nextViewport = this.root.querySelector("[data-multype-viewport]");
      if (nextViewport) {
        nextViewport.scrollLeft = preservedScroll.left;
        nextViewport.scrollTop = preservedScroll.top;
      }

      this.syncTooltipState();
    }

    renderShell(viewModel, globalStats, editorModel) {
      if (this.state.loading) {
        return `
          <section class="hero multype-anchor" id="overview">
            <div class="hero__content">
              <p class="hero__eyebrow">${escapeHtml(this.getText("eyebrow", this.options.pageEyebrow))}</p>
              <h1 class="hero__title">${escapeHtml(this.getText("title", this.options.pageTitle))}</h1>
              <p class="hero__subtitle">${escapeHtml(this.getText("description", this.options.pageDescription))}</p>
            </div>
          </section>
          <section class="section">
            <div class="section__inner">
              <div class="multype-status-card">
                <p class="multype-status-card__title">${escapeHtml(this.getText("loadingTitle", "Loading datamine JSON..."))}</p>
                <p class="multype-status-card__body">${escapeHtml(this.getText("loadingBody", "Building the Main / Sub / Value model and rename dictionary."))}</p>
              </div>
            </div>
          </section>
        `;
      }

      if (this.state.error) {
        return `
          <section class="hero multype-anchor" id="overview">
            <div class="hero__content">
              <p class="hero__eyebrow">${escapeHtml(this.getText("eyebrow", this.options.pageEyebrow))}</p>
              <h1 class="hero__title">${escapeHtml(this.getText("title", this.options.pageTitle))}</h1>
              <p class="hero__subtitle">${escapeHtml(this.getText("description", this.options.pageDescription))}</p>
            </div>
          </section>
          <section class="section">
            <div class="section__inner">
              <div class="multype-status-card multype-status-card--error">
                <p class="multype-status-card__title">${escapeHtml(this.getText("loadError", "Load error"))}</p>
                <p class="multype-status-card__body">${escapeHtml(this.state.error)}</p>
              </div>
            </div>
          </section>
        `;
      }

      const dataset = this.state.dataset;
      const hasDraft =
        this.options.pageKind === "local" &&
        (Object.keys(this.state.draftRenames.mainRenames).length ||
          Object.keys(this.state.draftRenames.subRenames).length ||
          Object.keys(this.state.draftRenames.valueRenames).length ||
          Object.keys(this.state.draftRenames.groupRenames).length);
      const visibleGroups = viewModel.groups.length;
      const mainFilterOptions = this.getMainFilterOptions(this.getEffectiveRenames());
      const subFilterOptions = this.getSubFilterOptions(this.getEffectiveRenames());

      return `
        <section class="hero multype-anchor" id="overview">
          <div class="hero__content">
        <p class="hero__eyebrow">${escapeHtml(this.getText("eyebrow", this.options.pageEyebrow))}</p>
        <h1 class="hero__title">${escapeHtml(this.getText("title", this.options.pageTitle))}</h1>
        <p class="hero__subtitle">${escapeHtml(this.getText("description", this.options.pageDescription))}</p>
          </div>
        </section>

        <section class="section section--notes">
          <div class="section__inner">
            <div class="notes notes--single">
              <article class="note note--primary">
                <h3 class="note__title">${escapeHtml(this.getText("source", "Source"))}</h3>
                <p class="note__body">
                  ${escapeHtml(this.getText("sourceFile", "Source file"))}: <code>${escapeHtml(this.state.baseRenames.sourceFile)}</code>.
                  ${escapeHtml(this.getText("total", "Total"))}: ${dataset.totalGroups} ${escapeHtml(this.getText("categories", "Categories"))} / ${dataset.totalSubs} ${escapeHtml(this.getText("subcategories", "Subcategories"))} / ${dataset.totalValues} ${escapeHtml(this.getText("buffs", "buffs"))}.
                  <a class="multype-source-inline" href="${escapeHtml(this.options.dataUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(this.getText("openJson", "Open local JSON"))}</a>
                  <span class="multype-source-separator">/</span>
                  <a class="multype-source-inline" href="https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner/blob/master/Exported/module_extra_to_files_mapping3.json" target="_blank" rel="noopener noreferrer">${escapeHtml(this.getText("viewSource", "View exporter source"))}</a>.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section class="section section--multype-data multype-anchor" id="data">
          <div class="section__inner section__inner--multype-data">
        <div class="multype-toolbar">
          <div class="multype-toolbar__row multype-toolbar__row--modes">
            ${this.renderModeButton("renamed", this.getText("renamed", "Renamed"))}
            ${this.renderModeButton("combined", this.getText("combined", "Combined"))}
            ${this.renderModeButton("datamined", this.getText("datamined", "Datamined"))}
          </div>
          <div class="multype-toolbar__row multype-toolbar__row--filters">
            <label class="multype-field multype-field--search">
          <span class="multype-field__label">${escapeHtml(this.getText("search", "Search"))}</span>
          <input class="multype-field__input" type="search" value="${escapeHtml(
            this.state.search
          )}" placeholder="${escapeHtml(this.getText("searchPlaceholder", "Search original keys or renamed labels..."))}" data-control="search" />
            </label>
            <label class="multype-field">
          <span class="multype-field__label">${escapeHtml(this.getText("main", "Main"))}</span>
          <select class="multype-field__select" data-control="main-filter">
            <option value="">${escapeHtml(this.getText("allMain", "All Main"))}</option>
            ${mainFilterOptions
              .map(
            (entry) => `<option value="${escapeHtml(entry.key)}" ${
              this.state.mainFilter === entry.key ? "selected" : ""
            }>${escapeHtml(entry.label)}</option>`
              )
              .join("")}
          </select>
            </label>
            <label class="multype-field">
          <span class="multype-field__label">${escapeHtml(this.getText("sub", "Sub"))}</span>
          <select class="multype-field__select" data-control="sub-filter">
            <option value="">${escapeHtml(this.getText("allSub", "All Sub"))}</option>
            ${subFilterOptions
              .map(
            (entry) => `<option value="${escapeHtml(entry.key)}" ${
              this.state.subFilter === entry.key ? "selected" : ""
            }>${escapeHtml(entry.label)}</option>`
              )
              .join("")}
          </select>
            </label>
            <div class="multype-toolbar__toggles">
          ${this.renderRenameFilterButton("all", this.getText("all", "All"))}
          ${this.renderRenameFilterButton("renamed", this.getText("renamedOnly", "Renamed only"))}
          ${this.renderRenameFilterButton("unrenamed", this.getText("unrenamedOnly", "Unrenamed only"))}
            </div>
          </div>
          ${
            this.options.pageKind === "local"
          ? `
            <div class="multype-toolbar__row multype-toolbar__row--actions">
              <button class="multype-action" type="button" data-action="export-renames">Export JSON</button>
              <button class="multype-action multype-action--subtle" type="button" data-action="trigger-import">Import JSON</button>
              <button class="multype-action multype-action--subtle" type="button" data-action="reset-draft">Reset draft</button>
              <input type="file" accept="application/json,.json" hidden data-control="import-file" />
              <span class="multype-toolbar__meta">${hasDraft ? "Local draft is active" : "Draft matches the base dictionary"}</span>
            </div>
          `
          : ""
          }
        </div>
        ${
          this.options.pageKind === "local"
            ? `
          <div class="multype-kpis">
            ${this.renderStatCard("Visible Main", String(visibleGroups))}
            ${this.renderStatCard("Visible Sub", String(viewModel.visibleSubCount))}
            ${this.renderStatCard("Visible files", String(viewModel.visibleValueCount))}
            ${this.renderStatCard("Renamed Main", String(globalStats.renamedMainCount))}
            ${this.renderStatCard("Renamed Sub", String(globalStats.renamedSubCount))}
            ${this.renderStatCard("Renamed files", String(globalStats.renamedValueCount))}
          </div>
            `
            : ""
        }
        <div class="multype-shell ${this.options.pageKind === "local" ? "multype-shell--local" : ""}">
          <div class="multype-browser">
            <div class="multype-viewport" data-multype-viewport>
          ${
            viewModel.groups.length
              ? `<div class="multype-board">${viewModel.groups.map((group) => this.renderMainColumn(group)).join("")}</div>`
              : `
            <div class="multype-empty">
              <div>
                <h3 class="multype-empty__title">${escapeHtml(this.getText("emptyTitle", "Nothing matched"))}</h3>
                <p class="multype-empty__body">${escapeHtml(this.getText("emptyBody", "Try another mode, clear filters, or remove the search query."))}</p>
              </div>
            </div>
              `
          }
            </div>
          </div>
          ${
            this.options.pageKind === "local"
          ? `<aside class="multype-editor">${this.renderEditor(editorModel)}</aside>`
          : ""
          }
        </div>
          </div>
        </section>
      `;
    }

    renderModeButton(mode, label) {
      const active = this.state.mode === mode ? " is-active" : "";
      return `<button class="multype-chip${active}" type="button" data-control="mode" data-value="${mode}">${escapeHtml(
        label
      )}</button>`;
    }

    renderRenameFilterButton(value, label) {
      const active = this.state.renameFilter === value ? " is-active" : "";
      return `<button class="multype-toggle${active}" type="button" data-control="rename-filter" data-value="${value}">${escapeHtml(
        label
      )}</button>`;
    }

    renderStatCard(label, value) {
      return `
        <article class="multype-stat">
          <p class="multype-stat__label">${escapeHtml(label)}</p>
          <p class="multype-stat__value">${escapeHtml(value)}</p>
        </article>
      `;
    }

    renderMainColumn(group) {
      const tooltipLines = group.mainHasRename ? [group.mainOriginalLabel] : [];
      const style = `--multype-accent:${group.accent};--multype-accent-soft:${group.accentSoft};--multype-accent-line:${group.accentLine};--multype-accent-wash:${group.accentWash};--multype-accent-panel:${group.accentPanel};--multype-accent-ink:${group.accentInk};`;
      const isInteractive = this.options.pageKind === "local";

      return `
        <section class="multype-main" style="${style}">
          <div class="multype-main__header">
            <div
              class="multype-entity multype-entity--main ${isInteractive ? "multype-entity--interactive" : ""}"
              ${isInteractive ? 'tabindex="0"' : ""}
              data-entity-kind="main"
              data-main-key="${escapeHtml(group.mainKey)}"
              data-tooltip-title=""
              data-tooltip-lines="${escapeHtml(encodeAttrList(tooltipLines))}"
            >
              <span class="multype-entity__label">${escapeHtml(group.mainDisplayLabel)}</span>
              <span class="multype-entity__meta">${group.subEntries.length} ${escapeHtml(this.getText("subColumns", "sub columns"))}</span>
            </div>
          </div>
          <div class="multype-main__body multype-main__body--columns">
            ${group.subEntries.map((subEntry) => this.renderSubCard(subEntry)).join("")}
          </div>
        </section>
      `;
    }

    renderSubCard(subEntry) {
      const tooltipLines = subEntry.subHasRename ? [subEntry.subOriginalLabel] : [];
      const isInteractive = this.options.pageKind === "local";
      const style = `--multype-sub-accent:${subEntry.surface.accent};--multype-sub-soft:${subEntry.surface.accentSoft};--multype-sub-line:${subEntry.surface.accentLine};--multype-sub-wash:${subEntry.surface.accentWash};--multype-sub-panel:${subEntry.surface.accentPanel};--multype-sub-ink:${subEntry.surface.accentInk};`;

      return `
        <article class="multype-sub" style="${style}">
          <div
            class="multype-entity multype-entity--sub ${isInteractive ? "multype-entity--interactive" : ""}"
            ${isInteractive ? 'tabindex="0"' : ""}
            data-entity-kind="sub"
            data-main-key="${escapeHtml(subEntry.mainKey)}"
            data-sub-key="${escapeHtml(subEntry.subKey)}"
            data-tooltip-title=""
            data-tooltip-lines="${escapeHtml(encodeAttrList(tooltipLines))}"
          >
            <span class="multype-entity__label">${escapeHtml(subEntry.subDisplayLabel)}</span>
            <span class="multype-entity__meta">${subEntry.values.length} ${escapeHtml(this.getText("files", "files"))}</span>
          </div>
          <div class="multype-values">
            ${subEntry.values.map((valueEntry) => this.renderValueItem(subEntry, valueEntry)).join("")}
          </div>
        </article>
      `;
    }

    renderValueItem(subEntry, valueEntry) {
      const tooltipLines = valueEntry.hasRename ? valueEntry.tooltipLines : [];
      const sourceMeta = valueEntry.renameSource
        ? valueEntry.renameSource === "group"
          ? "Group rename"
          : "Exact rename"
        : valueEntry.isDeduped
        ? `${valueEntry.allValueKeys.length} originals`
        : "";
      const showSourceMeta = sourceMeta && !valueEntry.hasRename;
      const isInteractive = this.options.pageKind === "local";

      return `
        <div
          class="multype-value ${valueEntry.hasRename ? "multype-value--renamed" : ""} ${isInteractive ? "multype-value--interactive" : ""}"
          ${isInteractive ? 'tabindex="0"' : ""}
          data-entity-kind="value"
          data-main-key="${escapeHtml(subEntry.mainKey)}"
          data-sub-key="${escapeHtml(subEntry.subKey)}"
          data-primary-value-key="${escapeHtml(valueEntry.primaryValueKey)}"
          data-value-keys="${escapeHtml(encodeAttrList(valueEntry.allValueKeys))}"
          data-display-label="${escapeHtml(valueEntry.displayLabel)}"
          data-canonical-key="${escapeHtml(valueEntry.canonicalValueBaseKey)}"
          data-tooltip-title=""
          data-tooltip-lines="${escapeHtml(encodeAttrList(tooltipLines))}"
        >
          <span class="multype-value__primary">${escapeHtml(valueEntry.displayLabel)}</span>
          ${showSourceMeta ? `<span class="multype-value__meta">${escapeHtml(sourceMeta)}</span>` : ""}
        </div>
      `;
    }

    renderEditor(editorModel) {
      if (!editorModel) {
        return `
          <div class="multype-editor__inner">
            <p class="multype-editor__eyebrow">Local editor</p>
            <h3 class="multype-editor__title">Pick a Main, Sub, or file</h3>
            <p class="multype-editor__body">
              Click any entity to edit it here. Exact rename changes one file,
              while Group rename covers the canonical Level/Lv family.
            </p>
          </div>
        `;
      }

      if (editorModel.kind === "main" || editorModel.kind === "sub") {
        return `
          <div class="multype-editor__inner">
            <p class="multype-editor__eyebrow">${escapeHtml(editorModel.kind.toUpperCase())}</p>
            <h3 class="multype-editor__title">${escapeHtml(editorModel.title)}</h3>
            <div class="multype-editor__meta">
              ${editorModel.meta.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
            </div>
            <label class="multype-editor__field">
              <span class="multype-editor__label">${escapeHtml(editorModel.fieldLabel)}</span>
              <input class="multype-editor__input" type="text" value="${escapeHtml(
                editorModel.inputValue
              )}" data-editor-text />
            </label>
            ${
              editorModel.baseRename
                ? `<p class="multype-editor__hint">Base site dictionary: <code>${escapeHtml(editorModel.baseRename)}</code></p>`
                : `<p class="multype-editor__hint">No base rename exists for this entity yet.</p>`
            }
            <div class="multype-editor__actions">
              <button class="multype-action" type="button" data-action="save-current">Save</button>
              <button class="multype-action multype-action--subtle" type="button" data-action="clear-current">Reset to base</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="multype-editor__inner">
          <p class="multype-editor__eyebrow">VALUE</p>
          <h3 class="multype-editor__title">${escapeHtml(editorModel.title)}</h3>
          <div class="multype-editor__meta">
            ${editorModel.meta.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
          </div>
          ${
            editorModel.allValueKeys.length > 1
              ? `
                <label class="multype-editor__field">
                  <span class="multype-editor__label">Exact target</span>
                  <select class="multype-editor__select" data-control="exact-target">
                    ${editorModel.allValueKeys
                      .map(
                        (valueKey) => `<option value="${escapeHtml(valueKey)}" ${
                          editorModel.selectedExactValueKey === valueKey ? "selected" : ""
                        }>${escapeHtml(getDisplayValueLabel(valueKey))}</option>`
                      )
                      .join("")}
                  </select>
                </label>
              `
              : `<p class="multype-editor__hint">File: <code>${escapeHtml(getDisplayValueLabel(editorModel.selectedExactValueKey))}</code></p>`
          }
          <label class="multype-editor__field">
            <span class="multype-editor__label">Exact rename</span>
            <input class="multype-editor__input" type="text" value="${escapeHtml(
              editorModel.exactRename
            )}" data-editor-exact />
          </label>
          <label class="multype-editor__field">
            <span class="multype-editor__label">Group rename</span>
            <input class="multype-editor__input" type="text" value="${escapeHtml(
              editorModel.groupRename
            )}" data-editor-group />
          </label>
          <div class="multype-editor__hint-stack">
            <p class="multype-editor__hint">Canonical key: <code>${escapeHtml(editorModel.canonicalValueBaseKey)}</code></p>
            ${
              editorModel.baseExactRename
                ? `<p class="multype-editor__hint">Base exact rename: <code>${escapeHtml(editorModel.baseExactRename)}</code></p>`
                : ""
            }
            ${
              editorModel.baseGroupRename
                ? `<p class="multype-editor__hint">Base group rename: <code>${escapeHtml(editorModel.baseGroupRename)}</code></p>`
                : ""
            }
            ${
              editorModel.isDeduped
                ? `<p class="multype-editor__hint">${editorModel.allValueKeys.length} original files are currently deduped into one renamed card.</p>`
                : ""
            }
          </div>
          <div class="multype-editor__actions">
            <button class="multype-action" type="button" data-action="save-current">Save</button>
            <button class="multype-action multype-action--subtle" type="button" data-action="clear-exact">Reset exact</button>
            <button class="multype-action multype-action--subtle" type="button" data-action="clear-group">Reset group</button>
          </div>
        </div>
      `;
    }

    handleRootInput(event) {
      const search = event.target.closest("[data-control='search']");
      if (search) {
        this.state.search = search.value;
        this.render();
      }
    }

    handleRootChange(event) {
      const mainFilter = event.target.closest("[data-control='main-filter']");
      if (mainFilter) {
        this.state.mainFilter = mainFilter.value;
        const selectedGroup =
          this.state.mainFilter && this.state.dataset
            ? this.state.dataset.groups.find((group) => group.mainKey === this.state.mainFilter)
            : null;
        if (
          this.state.subFilter &&
          this.state.mainFilter &&
          (!selectedGroup ||
            !selectedGroup.subEntries.some((subEntry) => subEntry.subKey === this.state.subFilter))
        ) {
          this.state.subFilter = "";
        }
        this.render();
        return;
      }

      const subFilter = event.target.closest("[data-control='sub-filter']");
      if (subFilter) {
        this.state.subFilter = subFilter.value;
        this.render();
        return;
      }

      const exactTarget = event.target.closest("[data-control='exact-target']");
      if (exactTarget) {
        this.state.selectedExactValueKey = exactTarget.value;
        this.render();
        return;
      }

      const importFile = event.target.closest("[data-control='import-file']");
      if (importFile) {
        const file = importFile.files && importFile.files[0];
        this.importRenames(file);
        importFile.value = "";
      }
    }

    handleRootClick(event) {
      if (typeof event.clientX === "number" && typeof event.clientY === "number") {
        this.pointerPosition = { x: event.clientX, y: event.clientY };
      }

      const modeButton = event.target.closest("[data-control='mode']");
      if (modeButton) {
        this.state.mode = modeButton.getAttribute("data-value") || "combined";
        this.render();
        return;
      }

      const renameFilterButton = event.target.closest("[data-control='rename-filter']");
      if (renameFilterButton) {
        this.state.renameFilter = renameFilterButton.getAttribute("data-value") || "all";
        this.render();
        return;
      }

      const entityButton = event.target.closest("[data-entity-kind]");
      if (entityButton && this.options.pageKind !== "local") {
        const kind = entityButton.getAttribute("data-entity-kind");
        if (kind === "value") {
          const originalValueKey = entityButton.getAttribute("data-primary-value-key") || "";
          const originalLabel = getDisplayValueLabel(originalValueKey);
          this.copyText(originalLabel).then((copied) => {
            if (copied) {
              this.setNotice("success", `Copied original key: ${originalLabel}`);
              return;
            }

            this.setNotice("error", "Could not copy the original key.");
          });
          return;
        }
      }

      if (entityButton && this.options.pageKind === "local") {
        const kind = entityButton.getAttribute("data-entity-kind");
        const mainKey = entityButton.getAttribute("data-main-key") || "";
        const subKey = entityButton.getAttribute("data-sub-key") || "";

        if (kind === "main") {
          this.openEntity({ kind, mainKey });
          return;
        }

        if (kind === "sub") {
          this.openEntity({ kind, mainKey, subKey });
          return;
        }

        if (kind === "value") {
          this.openEntity({
            kind,
            mainKey,
            subKey,
            primaryValueKey: entityButton.getAttribute("data-primary-value-key") || "",
            valueKeys: decodeAttrList(entityButton.getAttribute("data-value-keys") || ""),
            canonicalValueBaseKey: entityButton.getAttribute("data-canonical-key") || "",
            displayLabel: entityButton.getAttribute("data-display-label") || ""
          });
          return;
        }
      }

      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) {
        return;
      }

      const action = actionButton.getAttribute("data-action");
      if (action === "export-renames") {
        this.exportRenames();
      } else if (action === "trigger-import") {
        this.root.querySelector("[data-control='import-file']")?.click();
      } else if (action === "reset-draft") {
        this.resetDraft();
      } else if (action === "save-current") {
        this.saveCurrentEditor();
      } else if (action === "clear-current") {
        this.clearCurrentEditor();
      } else if (action === "clear-exact") {
        this.clearValueEditorSection("exact");
      } else if (action === "clear-group") {
        this.clearValueEditorSection("group");
      }
    }

    saveCurrentEditor() {
      const entity = this.state.selectedEntity;
      if (!entity) {
        return;
      }

      if (entity.kind === "main") {
        const input = this.root.querySelector("[data-editor-text]");
        this.setDraftRename("mainRenames", entity.mainKey, input ? input.value : "");
        this.setNotice("success", "Main rename saved.");
        return;
      }

      if (entity.kind === "sub") {
        const input = this.root.querySelector("[data-editor-text]");
        this.setDraftRename("subRenames", composeSubRenameKey(entity.mainKey, entity.subKey), input ? input.value : "");
        this.setNotice("success", "Sub rename saved.");
        return;
      }

      if (entity.kind === "value") {
        const exactInput = this.root.querySelector("[data-editor-exact]");
        const groupInput = this.root.querySelector("[data-editor-group]");
        const exactKey = this.state.selectedExactValueKey || entity.valueKeys[0] || entity.primaryValueKey;
        const groupKey = composeGroupRenameKey(entity.mainKey, entity.subKey, entity.canonicalValueBaseKey);

        this.setDraftRename("valueRenames", exactKey, exactInput ? exactInput.value : "");
        this.setDraftRename("groupRenames", groupKey, groupInput ? groupInput.value : "");
        this.setNotice("success", "Value rename saved.");
      }
    }

    clearCurrentEditor() {
      const entity = this.state.selectedEntity;
      if (!entity) {
        return;
      }

      if (entity.kind === "main") {
        this.setDraftRename("mainRenames", entity.mainKey, "");
        this.setNotice("success", "Main rename reset to base.");
        return;
      }

      if (entity.kind === "sub") {
        this.setDraftRename("subRenames", composeSubRenameKey(entity.mainKey, entity.subKey), "");
        this.setNotice("success", "Sub rename reset to base.");
      }
    }

    clearValueEditorSection(section) {
      const entity = this.state.selectedEntity;
      if (!entity || entity.kind !== "value") {
        return;
      }

      if (section === "exact") {
        const exactKey = this.state.selectedExactValueKey || entity.valueKeys[0] || entity.primaryValueKey;
        this.setDraftRename("valueRenames", exactKey, "");
        this.setNotice("success", "Exact rename reset to base.");
        return;
      }

      if (section === "group") {
        const groupKey = composeGroupRenameKey(entity.mainKey, entity.subKey, entity.canonicalValueBaseKey);
        this.setDraftRename("groupRenames", groupKey, "");
        this.setNotice("success", "Group rename reset to base.");
      }
    }

    ensureTooltip() {
      if (this.tooltip) {
        return this.tooltip;
      }

      this.tooltip = document.createElement("div");
      this.tooltip.className = "multype-tooltip";
      this.tooltip.hidden = true;
      document.body.appendChild(this.tooltip);
      return this.tooltip;
    }

    ensureCursorNotice() {
      if (this.cursorNotice) {
        return this.cursorNotice;
      }

      this.cursorNotice = document.createElement("div");
      this.cursorNotice.className = "multype-cursor-notice";
      this.cursorNotice.hidden = true;
      document.body.appendChild(this.cursorNotice);
      return this.cursorNotice;
    }

    positionCursorNotice(notice, pointerPosition = null) {
      const noticeRect = notice.getBoundingClientRect();
      const fallbackPosition = {
        x: window.innerWidth - noticeRect.width - 24,
        y: 104
      };
      const position = pointerPosition || fallbackPosition;
      let left = position.x + TOOLTIP_OFFSET;
      let top = position.y - noticeRect.height - TOOLTIP_OFFSET;

      if (top < 12) {
        top = position.y + TOOLTIP_OFFSET;
      }

      if (left < 12) {
        left = 12;
      }

      const maxLeft = window.innerWidth - noticeRect.width - 12;
      if (left > maxLeft) {
        left = maxLeft;
      }

      const maxTop = window.innerHeight - noticeRect.height - 12;
      if (top > maxTop) {
        top = maxTop;
      }

      notice.style.left = `${Math.max(12, left)}px`;
      notice.style.top = `${Math.max(12, top)}px`;
    }

    showCursorNotice(kind, text, pointerPosition = null) {
      const notice = this.ensureCursorNotice();
      notice.className = `multype-cursor-notice multype-cursor-notice--${kind}`;
      notice.textContent = text;
      notice.hidden = false;
      this.positionCursorNotice(notice, pointerPosition);

      clearTimeout(this.noticeTimer);
      this.noticeTimer = window.setTimeout(() => {
        if (this.cursorNotice) {
          this.cursorNotice.hidden = true;
        }
      }, 1400);
    }

    buildTooltipMarkup(target) {
      const title = target.getAttribute("data-tooltip-title") || "";
      const lines = decodeAttrList(target.getAttribute("data-tooltip-lines") || "");
      if (!title && !lines.length) {
        return "";
      }

      return `
        ${title ? `<div class="multype-tooltip__title">${escapeHtml(title)}</div>` : ""}
        <div class="multype-tooltip__body">
          ${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
        </div>
      `;
    }

    async copyText(text) {
      const nextText = String(text || "").trim();
      if (!nextText) {
        return false;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(nextText);
          return true;
        }
      } catch (error) {
        // Fall back to execCommand below.
      }

      const helper = document.createElement("textarea");
      helper.value = nextText;
      helper.setAttribute("readonly", "readonly");
      helper.style.position = "fixed";
      helper.style.top = "-9999px";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      document.body.removeChild(helper);
      return copied;
    }

    showTooltip(target, pointerPosition = null) {
      const tooltipMarkup = this.buildTooltipMarkup(target);
      if (!tooltipMarkup) {
        this.hideTooltip();
        return;
      }

      const tooltip = this.ensureTooltip();
      tooltip.innerHTML = tooltipMarkup;
      tooltip.hidden = false;
      this.tooltipTarget = target;
      if (pointerPosition) {
        this.pointerPosition = pointerPosition;
      }
      this.positionTooltip(target, tooltip, this.pointerPosition);
    }

    positionTooltip(target, tooltip, pointerPosition = null) {
      const rect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let top = rect.top - tooltipRect.height - TOOLTIP_OFFSET;
      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

      if (pointerPosition) {
        left = pointerPosition.x + TOOLTIP_OFFSET;
        top = pointerPosition.y - tooltipRect.height - TOOLTIP_OFFSET;

        if (top < 12) {
          top = pointerPosition.y + TOOLTIP_OFFSET;
        }
      } else if (top < 12) {
        top = rect.bottom + TOOLTIP_OFFSET;
      }

      if (left < 12) {
        left = 12;
      }

      const maxLeft = window.innerWidth - tooltipRect.width - 12;
      if (left > maxLeft) {
        left = maxLeft;
      }

      const maxTop = window.innerHeight - tooltipRect.height - 12;
      if (top > maxTop) {
        top = maxTop;
      }

      tooltip.style.top = `${Math.max(12, top)}px`;
      tooltip.style.left = `${Math.max(12, left)}px`;
    }

    hideTooltip() {
      if (!this.tooltip) {
        return;
      }

      this.tooltip.hidden = true;
      this.tooltipTarget = null;
      this.pointerPosition = null;
    }

    syncTooltipState() {
      if (!this.tooltipTarget || !document.body.contains(this.tooltipTarget)) {
        this.hideTooltip();
        return;
      }

      this.showTooltip(this.tooltipTarget, this.pointerPosition);
    }

    handlePointerOver(event) {
      const target = event.target.closest("[data-tooltip-title]");
      if (!target || !this.root.contains(target)) {
        return;
      }
      this.showTooltip(target, { x: event.clientX, y: event.clientY });
    }

    handlePointerMove(event) {
      if (!this.tooltipTarget || !this.tooltip || this.tooltip.hidden) {
        return;
      }

      this.pointerPosition = { x: event.clientX, y: event.clientY };
      this.positionTooltip(this.tooltipTarget, this.tooltip, this.pointerPosition);
    }

    handlePointerOut(event) {
      if (!this.tooltipTarget) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget && this.tooltipTarget.contains(relatedTarget)) {
        return;
      }

      this.hideTooltip();
    }

    handleFocusIn(event) {
      const target = event.target.closest("[data-tooltip-title]");
      if (!target || !this.root.contains(target)) {
        return;
      }
      this.showTooltip(target);
    }

    handleFocusOut() {
      this.hideTooltip();
    }

    handleDocumentKeyDown(event) {
      if (event.key === "Escape") {
        this.hideTooltip();
      }
    }
  }

  return {
    createMultypeApp,
    createEmptyRenameStore,
    normalizeRenameStore,
    mergeRenameStores,
    diffRenameStores,
    stripJsonExtension,
    canonicalizeValueBaseKey,
    composeSubRenameKey,
    composeValueRenameKey,
    composeGroupRenameKey,
    normalizeDataset,
    buildViewModel,
    resolveValueRename,
    buildGlobalStats,
    serializeRenameStore
  };
});
