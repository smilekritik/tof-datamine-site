(function () {
  const BASE_RESIST_RATE = 0.3471;
  const DATA_FILE = "./DT_MonsterStaticData_Overseas.json";
  const CACHE_FILE = "./seq-boss-cache.json";
  const CACHE_REFRESH_API = "/api/seq-cache/refresh";
  const STAGE_LIMIT_FILE = "./seq-stage-limit.txt";
  const MECHANICS_FILE = "./seq-mechanics-overrides.json";

  const FALLBACK_ROWS = [
    { stage: 1, rowId: "endless_special_boss_1", maxHealth: 266444540 },
    { stage: 2, rowId: "endless_special_boss_2", maxHealth: 290648450 },
    { stage: 3, rowId: "endless_special_boss_3", maxHealth: 324210140 },
    { stage: 4, rowId: "endless_special_boss_4", maxHealth: 352632160 },
    { stage: 5, rowId: "endless_special_boss_5", maxHealth: 387894300 },
    { stage: 6, rowId: "endless_special_boss_6", maxHealth: 358007550 },
    { stage: 7, rowId: "endless_special_boss_7", maxHealth: 393806900 },
    { stage: 8, rowId: "endless_special_boss_8", maxHealth: 542198300 },
    { stage: 9, rowId: "endless_special_boss_9", maxHealth: 901488000 },
    { stage: 10, rowId: "endless_special_boss_10", maxHealth: 901488000 },
    { stage: 11, rowId: "endless_special_boss_11", maxHealth: 1042874600 },
    { stage: 12, rowId: "endless_special_boss_12", maxHealth: 1292645400 },
    { stage: 13, rowId: "endless_special_boss_13", maxHealth: 2001611000 },
    { stage: 14, rowId: "endless_special_boss_14", maxHealth: 1351518300 },
    { stage: 15, rowId: "endless_special_boss_15", maxHealth: 2413397000 },
    { stage: 16, rowId: "endless_special_boss_16", maxHealth: 3148018000 },
    { stage: 17, rowId: "endless_special_boss_17", maxHealth: 3839448800 },
    { stage: 18, rowId: "endless_special_boss_18", maxHealth: 4465471500 },
    { stage: 19, rowId: "endless_special_boss_19", maxHealth: 6091220500 },
    { stage: 20, rowId: "endless_special_boss_20", maxHealth: 7279999500 },
    { stage: 21, rowId: "endless_special_boss_21", maxHealth: 8710000000 },
    { stage: 22, rowId: "endless_special_boss_22", maxHealth: 10335001000 },
    { stage: 23, rowId: "endless_special_boss_23", maxHealth: 12456209000 },
    { stage: 24, rowId: "endless_special_boss_24", maxHealth: 15292030000 },
    { stage: 25, rowId: "endless_special_boss_25", maxHealth: 18773494000 },
    { stage: 26, rowId: "endless_special_boss_26", maxHealth: 21274620000 },
    { stage: 27, rowId: "endless_special_boss_27", maxHealth: 23572259000 },
    { stage: 28, rowId: "endless_special_boss_28", maxHealth: 25355002000 },
    { stage: 29, rowId: "endless_special_boss_29", maxHealth: 26720200000 },
    { stage: 30, rowId: "endless_special_boss_30", maxHealth: 27444734000 }
  ];

  const DEFAULT_MECHANICS_OVERRIDES = {
    6: {
      effectiveHp: 803800000,
      note: "Includes mechanics-adjusted HP formula."
    },
    8: {
      effectiveHp: 1095610000,
      note: "Includes mechanics-adjusted HP formula."
    },
    10: {
      effectiveHp: 2761910000,
      note: "Includes mechanics-adjusted HP formula."
    },
    11: {
      effectiveHp: 2085750000,
      note: "Includes mechanics-adjusted HP formula."
    },
    14: {
      effectiveHp: 4091380000,
      note: "Includes mechanics-adjusted HP formula."
    }
  };

  const state = {
    dataset: [],
    warnings: [],
    sourceLabel: "",
    stageLimit: 0,
    mechanicsOverrides: DEFAULT_MECHANICS_OVERRIDES,
    chartExports: {},
    zoom: {
      chartKey: "",
      title: "",
      scale: 1,
      minScale: 1,
      maxScale: 4,
      translateX: 0,
      translateY: 0,
      contentWidth: 0,
      contentHeight: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      startTranslateX: 0,
      startTranslateY: 0
    }
  };

  const numberFormatter = new Intl.NumberFormat("en-US");
  const CHART_DIMENSIONS = {
    width: 1800,
    height: 760
  };
  const CHART_TEXT = {
    title: 36,
    axisTick: 18,
    axisLabel: 19,
    valueLabel: 15.5
  };
  const CHART_POINT = {
    radius: 8.5,
    strokeWidth: 2.6,
    hitboxRadius: 18,
    edgeInset: 34
  };

  window.addEventListener("DOMContentLoaded", () => {
    bindActions();
    bindChartFrames();
    bindZoomInteractions();
    loadAndRender();
  });

  function bindActions() {
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.getAttribute("data-action");
        const chartKey = button.getAttribute("data-chart-key");

        if (action === "reload") {
          await loadAndRender();
          return;
        }

        if (action === "download-chart-csv" && chartKey) {
          downloadBlob(
            buildCsv(chartKey),
            "text/csv;charset=utf-8",
            `${chartKey}-sequential-stage-1-to-${state.stageLimit}.csv`
          );
          return;
        }

        if (action === "download-chart-png" && chartKey) {
          const chartExport = state.chartExports[chartKey];
          if (!chartExport) {
            return;
          }
          await downloadChartPng(chartKey, chartExport);
          return;
        }

        if (action === "close-zoom") {
          closeZoomModal();
          return;
        }

        if (action === "zoom-in") {
          zoomByFactor(1.2);
          return;
        }

        if (action === "zoom-out") {
          zoomByFactor(1 / 1.2);
          return;
        }

        if (action === "zoom-reset") {
          resetZoom();
        }
      });
    });
  }

  function bindChartFrames() {
    document.querySelectorAll("[data-chart]").forEach((frame) => {
      frame.addEventListener("click", () => {
        const chartKey = frame.getAttribute("data-chart");
        const chartExport = state.chartExports[chartKey];
        if (!chartExport) {
          return;
        }

        openZoomModal(chartKey, chartExport);
      });
    });
  }

  function bindZoomInteractions() {
    const viewport = document.querySelector("[data-zoom-viewport]");
    const canvas = document.querySelector("[data-zoom-canvas]");
    if (!viewport || !canvas) {
      return;
    }

    viewport.addEventListener(
      "wheel",
      (event) => {
        if (document.querySelector("[data-zoom-modal]")?.hidden) {
          return;
        }

        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomByFactor(factor, event.clientX, event.clientY);
      },
      { passive: false }
    );

    viewport.addEventListener("pointerdown", (event) => {
      if (document.querySelector("[data-zoom-modal]")?.hidden) {
        return;
      }

      if (event.target.closest(".seq-chart-point-hitbox")) {
        return;
      }

      state.zoom.isDragging = true;
      state.zoom.dragStartX = event.clientX;
      state.zoom.dragStartY = event.clientY;
      state.zoom.startTranslateX = state.zoom.translateX;
      state.zoom.startTranslateY = state.zoom.translateY;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!state.zoom.isDragging) {
        return;
      }

      state.zoom.translateX =
        state.zoom.startTranslateX + (event.clientX - state.zoom.dragStartX);
      state.zoom.translateY =
        state.zoom.startTranslateY + (event.clientY - state.zoom.dragStartY);
      clampZoomTranslation();
      applyZoomTransform();
    });

    const stopDragging = (event) => {
      if (event && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      state.zoom.isDragging = false;
      viewport.classList.remove("is-dragging");
    };

    viewport.addEventListener("pointerup", stopDragging);
    viewport.addEventListener("pointercancel", stopDragging);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeZoomModal();
      }
    });
  }

  async function loadAndRender() {
    const warnings = [];
    const stageLimit = await loadStageLimit(warnings);
    const datamineRows = await loadDatamineRows(stageLimit, warnings);
    const mechanicsOverrides = await loadMechanicsOverrides(warnings);
    const dataset = buildDataset(
      datamineRows,
      stageLimit,
      mechanicsOverrides,
      warnings
    );

    state.dataset = dataset;
    state.warnings = warnings;
    state.sourceLabel = datamineRows.sourceLabel;
    state.stageLimit = stageLimit;
    state.mechanicsOverrides = mechanicsOverrides;

    renderTable();
    renderCharts();
  }

  async function loadStageLimit(warnings) {
    try {
      const response = await fetch(`${STAGE_LIMIT_FILE}?t=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = (await response.text()).trim();
      const parsed = Number.parseInt(raw, 10);

      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("Stage limit must be a positive integer.");
      }

      return parsed;
    } catch (error) {
      warnings.push(
        `Could not read ${STAGE_LIMIT_FILE}. The page fell back to stage limit 30.`
      );
      return 30;
    }
  }

  async function loadDatamineRows(stageLimit, warnings) {
    const cachedRows = await loadCachedDatamineRows(stageLimit, warnings);
    if (cachedRows) {
      return cachedRows;
    }

    return loadLiveDatamineRows(warnings);
  }

  async function loadCachedDatamineRows(stageLimit, warnings) {
    try {
      const response = await fetch(`${CACHE_FILE}?t=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const rows = extractRows(json);
      const cachedStageLimit = resolveCachedStageLimit(json, rows);

      if (rows.size === 0) {
        throw new Error("No valid rows were found.");
      }

      if (cachedStageLimit >= stageLimit && hasRowsForStageLimit(rows, stageLimit)) {
        return {
          rows,
          sourceLabel: `${CACHE_FILE} (${cachedStageLimit} stages cached)`
        };
      }

      const refreshedRows = await refreshCachedDatamineRows(stageLimit, warnings);
      if (refreshedRows) {
        return refreshedRows;
      }
    } catch (error) {
      warnings.push(
        `Could not read ${CACHE_FILE}. Falling back to the live sequential file.`
      );
    }

    return null;
  }

  async function refreshCachedDatamineRows(stageLimit, warnings) {
    try {
      const response = await fetch(
        `${CACHE_REFRESH_API}?stageLimit=${encodeURIComponent(stageLimit)}&t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const rows = extractRows(json);
      const cachedStageLimit = resolveCachedStageLimit(json, rows);

      if (rows.size === 0) {
        throw new Error("No valid rows were returned after refresh.");
      }

      if (cachedStageLimit < stageLimit || !hasRowsForStageLimit(rows, stageLimit)) {
        throw new Error(`Cache refresh stopped at stage ${cachedStageLimit}.`);
      }

      return {
        rows,
        sourceLabel: `${CACHE_FILE} (refreshed to stage ${cachedStageLimit})`
      };
    } catch (error) {
      warnings.push(
        `Could not refresh ${CACHE_FILE} for stage ${stageLimit}. The page will read the full live file instead.`
      );
      return null;
    }
  }

  async function loadLiveDatamineRows(warnings) {
    try {
      const response = await fetch(`${DATA_FILE}?t=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const rows = extractRows(json);

      if (rows.size === 0) {
        throw new Error("No valid rows were found.");
      }

      return {
        rows,
        sourceLabel: `${DATA_FILE} (live file)`
      };
    } catch (error) {
      warnings.push(
        `Could not read ${DATA_FILE}. The page is using bundled sample values until a live file is placed next to this page.`
      );

      const fallbackMap = new Map();
      FALLBACK_ROWS.forEach((entry) => {
        fallbackMap.set(entry.rowId, entry.maxHealth);
      });

      return {
        rows: fallbackMap,
        sourceLabel: "Bundled fallback sample"
      };
    }
  }

  async function loadMechanicsOverrides(warnings) {
    try {
      const response = await fetch(`${MECHANICS_FILE}?t=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const stages = json?.stages || {};
      const normalized = {};

      Object.entries(stages).forEach(([stageKey, value]) => {
        const stage = Number.parseInt(stageKey, 10);
        if (
          Number.isFinite(stage) &&
          value &&
          Number.isFinite(value.effectiveHp) &&
          value.effectiveHp > 0
        ) {
          normalized[stage] = {
            effectiveHp: value.effectiveHp,
            note:
              typeof value.note === "string" && value.note.trim()
                ? value.note.trim()
                : "Includes mechanics-adjusted HP formula."
          };
        }
      });

      return { ...DEFAULT_MECHANICS_OVERRIDES, ...normalized };
    } catch (error) {
      warnings.push(
        `Could not read ${MECHANICS_FILE}. Default mechanics overrides are being used.`
      );
      return { ...DEFAULT_MECHANICS_OVERRIDES };
    }
  }

  function extractRows(payload) {
    const rowsContainer = payload?.rows || payload;
    const rows =
      (Array.isArray(rowsContainer) ? rowsContainer[0]?.Rows : rowsContainer?.Rows) ||
      rowsContainer?.Rows ||
      rowsContainer;
    const output = new Map();

    if (!rows || typeof rows !== "object") {
      return output;
    }

    Object.entries(rows).forEach(([rowId, rowValue]) => {
      if (Number.isFinite(rowValue)) {
        output.set(rowId, rowValue);
        return;
      }

      if (
        rowValue &&
        typeof rowValue === "object" &&
        Number.isFinite(rowValue.MaxHealth)
      ) {
        output.set(rowId, rowValue.MaxHealth);
      }
    });

    return output;
  }

  function resolveCachedStageLimit(payload, rows) {
    const metaStageLimit = payload?.meta?.cachedUpToStage;
    if (Number.isFinite(metaStageLimit) && metaStageLimit > 0) {
      return metaStageLimit;
    }

    let cachedStageLimit = 0;
    rows.forEach((_, rowId) => {
      const match = /^endless_special_boss_(\d+)$/.exec(rowId);
      if (!match) {
        return;
      }

      cachedStageLimit = Math.max(
        cachedStageLimit,
        Number.parseInt(match[1], 10)
      );
    });

    return cachedStageLimit;
  }

  function hasRowsForStageLimit(rows, stageLimit) {
    for (let stage = 1; stage <= stageLimit; stage += 1) {
      if (!rows.has(`endless_special_boss_${stage}`)) {
        return false;
      }
    }

    return true;
  }

  function buildDataset(datamineRows, stageLimit, mechanicsOverrides, warnings) {
    const dataset = [];
    let previousEffectiveHp = null;

    for (let stage = 1; stage <= stageLimit; stage += 1) {
      const rowId = `endless_special_boss_${stage}`;
      const maxHealth = datamineRows.rows.get(rowId);

      if (!Number.isFinite(maxHealth)) {
        warnings.push(`Row ${rowId} is missing and was skipped.`);
        continue;
      }

      if (maxHealth <= 0) {
        warnings.push(`Row ${rowId} has non-positive MaxHealth and was skipped.`);
        continue;
      }

      const mechanicsOverride = mechanicsOverrides[stage];
      const effectiveHp = mechanicsOverride
        ? mechanicsOverride.effectiveHp
        : maxHealth * (1 + BASE_RESIST_RATE);
      const powercreep =
        previousEffectiveHp === null
          ? 0
          : ((effectiveHp / previousEffectiveHp) - 1) * 100;

      dataset.push({
        stage,
        rowId,
        maxHealth,
        effectiveHp,
        powercreep,
        isMechanicsAdjusted: Boolean(mechanicsOverride),
        mechanicsNote: mechanicsOverride?.note || ""
      });

      previousEffectiveHp = effectiveHp;
    }

    return dataset;
  }

  function renderTable() {
    const tableBody = document.querySelector("[data-table-body]");
    if (!tableBody) {
      return;
    }

    if (state.dataset.length === 0) {
      tableBody.innerHTML = "<tr><td colspan=\"5\">No rows loaded.</td></tr>";
      return;
    }

    tableBody.innerHTML = state.dataset
      .map((entry) => {
        return `
          <tr>
            <td>${entry.stage}</td>
            <td><code>${escapeHtml(entry.rowId)}</code></td>
            <td>${formatInteger(entry.maxHealth)}</td>
            <td>${formatEffectiveCell(entry)}</td>
            <td>${formatPercent(entry.powercreep)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderCharts() {
    if (state.dataset.length === 0) {
      ["pure", "powercreep", "effective"].forEach((key) => {
        const root = document.querySelector(`[data-chart="${key}"]`);
        if (root) {
          root.innerHTML =
            '<p style="padding: 24px; margin: 0; color: #444444; font: 14px sans-serif;">No valid rows are available for this chart.</p>';
        }
        state.chartExports[key] = "";
      });
      return;
    }

    const chartConfigs = {
      pure: {
        title: "Amount of boss HP in sequential (pure HP, no resists)",
        width: CHART_DIMENSIONS.width,
        height: CHART_DIMENSIONS.height,
        color: "#6aa84f",
        mode: "linear",
        forceZero: true,
        tickFormatter: (value) => formatAxisCompact(value),
        values: state.dataset.map((entry) => ({
          stage: entry.stage,
          value: entry.maxHealth,
          tooltip: `Stage ${entry.stage}: ${formatInteger(entry.maxHealth)}`,
          isMechanicsAdjusted: false,
          label: formatCompact(entry.maxHealth)
        }))
      },
      powercreep: {
        title: "Approximated total powercreep from previous stage",
        width: CHART_DIMENSIONS.width,
        height: CHART_DIMENSIONS.height,
        color: "#e69138",
        mode: "linear",
        forceZero: false,
        tickFormatter: (value) => `${value.toFixed(0)}%`,
        values: state.dataset.map((entry) => ({
          stage: entry.stage,
          value: entry.powercreep,
          tooltip: `Stage ${entry.stage}${entry.isMechanicsAdjusted ? "*" : ""}: ${formatPercent(entry.powercreep)}${entry.isMechanicsAdjusted ? ` (${entry.mechanicsNote})` : ""}`,
          isMechanicsAdjusted: entry.isMechanicsAdjusted,
          label: `${formatPercent(entry.powercreep)}${entry.isMechanicsAdjusted ? "*" : ""}`
        }))
      },
      effective: {
        title: "Approximated total DMG was needed in 150s without ALL mechs in sequential",
        width: CHART_DIMENSIONS.width,
        height: CHART_DIMENSIONS.height,
        color: "#a64d79",
        mode: "linear",
        forceZero: true,
        tickFormatter: (value) => formatAxisCompact(value),
        values: state.dataset.map((entry) => ({
          stage: entry.stage,
          value: entry.effectiveHp,
          tooltip: `Stage ${entry.stage}${entry.isMechanicsAdjusted ? "*" : ""}: ${formatCompact(entry.effectiveHp)}${entry.isMechanicsAdjusted ? ` (${entry.mechanicsNote})` : ""}`,
          isMechanicsAdjusted: entry.isMechanicsAdjusted,
          label: `${formatCompact(entry.effectiveHp)}${entry.isMechanicsAdjusted ? "*" : ""}`
        }))
      }
    };

    Object.entries(chartConfigs).forEach(([key, chartConfig]) => {
      const root = document.querySelector(`[data-chart="${key}"]`);
      if (!root) {
        return;
      }

      const svgMarkup = buildLineChartSvg(chartConfig);
      root.innerHTML = svgMarkup;
      bindPointTooltips(root, false);
      state.chartExports[key] = {
        title: chartConfig.title,
        svgMarkup,
        width: chartConfig.width,
        height: chartConfig.height
      };
    });
  }

  function buildLineChartSvg(config) {
    const { width, height, color, values, mode, title, forceZero, tickFormatter } = config;
    const margin = {
      top: 76,
      right: 86,
      bottom: 92,
      left: 104
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const usableChartWidth = chartWidth - CHART_POINT.edgeInset * 2;
    const xStep = values.length > 1 ? usableChartWidth / (values.length - 1) : 0;
    const xAt = (index) => margin.left + CHART_POINT.edgeInset + xStep * index;
    const yScale =
      mode === "log"
        ? createLogScale(values.map((item) => item.value), chartHeight, margin.top)
        : createLinearScale(
            values.map((item) => item.value),
            chartHeight,
            margin.top,
            {
              forceZero,
              tickFormatter
            }
          );
    const axisBottom = margin.top + chartHeight;

    const pathData = values
      .map((item, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix}${xAt(index).toFixed(2)} ${yScale.toY(item.value).toFixed(2)}`;
      })
      .join("");

    const yGrid = yScale.ticks
      .map((tick) => {
        const y = yScale.toY(tick.value);
        return `
          <line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(width - margin.right).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${tick.major ? "#cccccc" : "#e6e6e6"}" stroke-width="1" />
          <text x="${margin.left - 18}" y="${(y + 5).toFixed(2)}" text-anchor="end" font-size="${CHART_TEXT.axisTick}" fill="#555555">${escapeHtml(tick.label)}</text>
        `;
      })
      .join("");

    const xAxisLabels = values
      .map((item, index) => {
        const x = xAt(index);
        const y = axisBottom + 26;
        return `
          <line x1="${x.toFixed(2)}" y1="${axisBottom}" x2="${x.toFixed(2)}" y2="${(axisBottom + 6).toFixed(2)}" stroke="#eeeeee" stroke-width="1" />
          <text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" font-size="${CHART_TEXT.axisTick - 2}" fill="#555555">
            ${item.stage}${item.isMechanicsAdjusted ? "*" : ""}
            <title>${escapeHtml(item.tooltip)}</title>
          </text>
        `;
      })
      .join("");

    const points = values
      .map((item, index) => {
        const x = xAt(index);
        const y = yScale.toY(item.value);
        return `
          <circle class="seq-chart-point-hitbox" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${CHART_POINT.hitboxRadius}" fill="transparent" pointer-events="all"
            data-stage="${item.stage}"
            data-value="${escapeHtml(item.label)}"
            data-tooltip="${escapeHtml(item.tooltip)}"
            data-note="${escapeHtml(item.isMechanicsAdjusted ? "Includes mechanics-adjusted HP formula." : "")}">
          </circle>
          <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${CHART_POINT.radius}" fill="${color}" stroke="#ffffff" stroke-width="${CHART_POINT.strokeWidth}" pointer-events="none">
          </circle>
        `;
      })
      .join("");

    const pointYs = values.map((item) => yScale.toY(item.value));
    const labelPlacements = buildAdaptiveLabelPlacements(
      values,
      pointYs,
      xAt,
      {
        axisTop: margin.top,
        axisBottom,
        axisLeft: margin.left,
        axisRight: width - margin.right,
        fontSize: CHART_TEXT.valueLabel
      }
    );

    const labels = values
      .map((item, index) => {
        const placement = labelPlacements[index];
        const labelColor = item.value < 0 ? "#a94442" : color;

        return `
          <text x="${placement.x.toFixed(2)}" y="${placement.y.toFixed(2)}" text-anchor="middle" font-size="${CHART_TEXT.valueLabel}" font-weight="700" fill="${labelColor}" pointer-events="none">
            ${escapeHtml(item.label)}
          </text>
        `;
      })
      .join("");

    return `
      <svg class="seq-chart-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(title)}">
        <rect width="${width}" height="${height}" fill="#ffffff" />
        <text x="${width / 2}" y="42" text-anchor="middle" font-size="${CHART_TEXT.title}" font-weight="700" fill="#1f2937">${escapeHtml(title)}</text>
        ${yGrid}
        <line x1="${margin.left}" y1="${axisBottom}" x2="${width - margin.right}" y2="${axisBottom}" stroke="#333333" stroke-width="1.2" />
        <path d="${pathData}" fill="none" stroke="${color}" stroke-width="3" />
        ${points}
        ${labels}
        ${xAxisLabels}
        <text x="${width / 2}" y="${height - 22}" text-anchor="middle" font-size="${CHART_TEXT.axisLabel}" fill="#555555">Sequential stage</text>
      </svg>
    `.trim();
  }

  function buildAdaptiveLabelPlacements(values, pointYs, xAt, options) {
    const placements = [];
    const occupiedRects = [];
    const {
      axisTop,
      axisBottom,
      axisLeft,
      axisRight,
      fontSize
    } = options;

    values.forEach((item, index) => {
      const pointX = xAt(index);
      const pointY = pointYs[index];
      const previousY = index > 0 ? pointYs[index - 1] : Number.NaN;
      const nextY = index < pointYs.length - 1 ? pointYs[index + 1] : Number.NaN;
      const isNegative = item.value < 0;
      const textWidth = estimateLabelWidth(item.label, fontSize);
      const minNeighborGap = [previousY, nextY]
        .filter((value) => Number.isFinite(value))
        .reduce((minGap, value) => Math.min(minGap, Math.abs(pointY - value)), Infinity);
      const densityBoost =
        Number.isFinite(minNeighborGap) && minNeighborGap < 42
          ? (42 - minNeighborGap) * 0.42
          : 0;
      const riseFromPrevious = Number.isFinite(previousY)
        ? Math.max(0, previousY - pointY)
        : 0;
      const riseIntoNext = Number.isFinite(nextY)
        ? Math.max(0, pointY - nextY)
        : 0;
      const slopeBoost = clamp(
        Math.max(riseFromPrevious, riseIntoNext) * 0.38,
        0,
        28
      );
      const nearOffset = isNegative
        ? 24 + densityBoost * 0.3
        : -16 - densityBoost - slopeBoost;
      const midOffset = isNegative
        ? 38 + densityBoost * 0.35
        : -28 - densityBoost - slopeBoost;
      const farOffset = isNegative
        ? 52 + densityBoost * 0.4
        : -42 - densityBoost - slopeBoost;
      const edgeBias = index === 0 ? 8 : index === values.length - 1 ? -8 : 0;
      const candidates = [
        { x: pointX + edgeBias, y: pointY + nearOffset },
        { x: pointX + edgeBias, y: pointY + midOffset },
        { x: pointX + edgeBias, y: pointY + farOffset },
        { x: pointX - 12 + edgeBias, y: pointY + midOffset },
        { x: pointX + 12 + edgeBias, y: pointY + midOffset },
        { x: pointX - 20 + edgeBias, y: pointY + farOffset },
        { x: pointX + 20 + edgeBias, y: pointY + farOffset },
        { x: pointX + edgeBias, y: pointY + farOffset - 16 }
      ];

      let bestPlacement = null;
      let bestRect = null;
      let bestScore = Number.POSITIVE_INFINITY;

      candidates.forEach((candidate, candidateIndex) => {
        const clampedX = clamp(
          candidate.x,
          axisLeft + textWidth / 2 + 4,
          axisRight - textWidth / 2 - 4
        );
        const clampedY = clamp(
          candidate.y,
          axisTop + fontSize + 4,
          axisBottom - 8
        );
        const rect = buildLabelRect(clampedX, clampedY, textWidth, fontSize);
        const overlapCount = occupiedRects.reduce((count, occupiedRect) => {
          return count + (rectsOverlap(rect, occupiedRect) ? 1 : 0);
        }, 0);
        const distancePenalty =
          Math.abs(clampedX - pointX) * 0.35 +
          Math.abs(clampedY - (pointY + nearOffset)) * 0.65 +
          candidateIndex * 0.25;
        const score = overlapCount * 1000 + distancePenalty;

        if (score < bestScore) {
          bestScore = score;
          bestPlacement = { x: clampedX, y: clampedY };
          bestRect = rect;
        }
      });

      placements[index] = bestPlacement || { x: pointX, y: pointY - 16 };
      occupiedRects.push(
        bestRect || buildLabelRect(pointX, pointY - 16, textWidth, fontSize)
      );
    });

    return placements;
  }

  function estimateLabelWidth(label, fontSize) {
    return label.length * fontSize * 0.64;
  }

  function buildLabelRect(centerX, baselineY, textWidth, fontSize) {
    return {
      left: centerX - textWidth / 2 - 4,
      right: centerX + textWidth / 2 + 4,
      top: baselineY - fontSize * 0.95,
      bottom: baselineY + fontSize * 0.3
    };
  }

  function rectsOverlap(first, second) {
    return (
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top
    );
  }

  function createLogScale(values, chartHeight, topOffset) {
    const positiveValues = values.filter((value) => value > 0);
    const minValue = Math.min(...positiveValues);
    const maxValue = Math.max(...positiveValues);
    const tickValues = [];
    const minExponent = Math.floor(Math.log10(minValue));
    const maxExponent = Math.ceil(Math.log10(maxValue));

    for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
      [1, 2, 5].forEach((multiplier) => {
        const tickValue = multiplier * 10 ** exponent;
        if (tickValue >= minValue * 0.8 && tickValue <= maxValue * 1.15) {
          tickValues.push(tickValue);
        }
      });
    }

    const minTick = tickValues[0];
    const maxTick = tickValues[tickValues.length - 1];
    const minLog = Math.log10(minTick);
    const maxLog = Math.log10(maxTick);
    const range = maxLog - minLog || 1;

    return {
      ticks: tickValues.map((tickValue) => ({
        value: tickValue,
        label: formatCompact(tickValue),
        major: String(tickValue)[0] === "1"
      })),
      toY(value) {
        const position = (Math.log10(value) - minLog) / range;
        return topOffset + chartHeight - position * chartHeight;
      }
    };
  }

  function createLinearScale(values, chartHeight, topOffset) {
    const options = arguments[3] || {};
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = maxValue - minValue || 1;
    const padding = span * 0.1;
    const minBound = options.forceZero
      ? 0
      : Math.min(0, minValue - padding);
    const maxBound = maxValue + padding;
    const ticks = buildLinearTicks(minBound, maxBound, 8);
    const range = maxBound - minBound || 1;

    return {
      ticks: ticks.map((tickValue) => ({
        value: tickValue,
        label: options.tickFormatter ? options.tickFormatter(tickValue) : String(tickValue),
        major: Math.abs(tickValue) < 0.0001 || tickValue === minBound
      })),
      toY(value) {
        const position = (value - minBound) / range;
        return topOffset + chartHeight - position * chartHeight;
      }
    };
  }

  function buildLinearTicks(minValue, maxValue, desiredTickCount) {
    const span = maxValue - minValue || 1;
    const roughStep = span / Math.max(1, desiredTickCount - 1);
    const step = getNiceStep(roughStep);
    const tickStart = Math.floor(minValue / step) * step;
    const tickEnd = Math.ceil(maxValue / step) * step;
    const ticks = [];

    for (let tick = tickStart; tick <= tickEnd + step * 0.5; tick += step) {
      ticks.push(Number(tick.toFixed(6)));
    }

    return ticks;
  }

  function openZoomModal(chartKey, chartExport) {
    const modal = document.querySelector("[data-zoom-modal]");
    const canvas = document.querySelector("[data-zoom-canvas]");
    const title = document.querySelector("[data-zoom-title]");
    const viewport = document.querySelector("[data-zoom-viewport]");
    if (!modal || !canvas || !title || !viewport) {
      return;
    }

    state.zoom.chartKey = chartKey;
    state.zoom.title = chartExport.title;
    state.zoom.contentWidth = chartExport.width;
    state.zoom.contentHeight = chartExport.height;

    title.textContent = chartExport.title;
    canvas.innerHTML = chartExport.svgMarkup;
    modal.hidden = false;
    bindPointTooltips(canvas, true);

    const viewportRect = viewport.getBoundingClientRect();
    const fitScale = Math.min(
      viewportRect.width / chartExport.width,
      viewportRect.height / chartExport.height
    );

    state.zoom.minScale = Math.max(0.45, fitScale);
    state.zoom.scale = fitScale;
    state.zoom.maxScale = Math.max(fitScale * 6, 3.5);
    state.zoom.translateX =
      (viewportRect.width - chartExport.width * fitScale) / 2;
    state.zoom.translateY =
      (viewportRect.height - chartExport.height * fitScale) / 2;
    applyZoomTransform();
  }

  function closeZoomModal() {
    const modal = document.querySelector("[data-zoom-modal]");
    const canvas = document.querySelector("[data-zoom-canvas]");
    if (!modal || modal.hidden) {
      return;
    }

    modal.hidden = true;
    if (canvas) {
      canvas.innerHTML = "";
    }
    state.zoom.isDragging = false;
    document
      .querySelector("[data-zoom-viewport]")
      ?.classList.remove("is-dragging");
  }

  function resetZoom() {
    const modal = document.querySelector("[data-zoom-modal]");
    if (!modal || modal.hidden) {
      return;
    }

    const chartExport = state.chartExports[state.zoom.chartKey];
    if (!chartExport) {
      return;
    }

    openZoomModal(state.zoom.chartKey, chartExport);
  }

  function zoomByFactor(factor, clientX, clientY) {
    const modal = document.querySelector("[data-zoom-modal]");
    const viewport = document.querySelector("[data-zoom-viewport]");
    if (!modal || modal.hidden || !viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const oldScale = state.zoom.scale;
    const newScale = clamp(
      oldScale * factor,
      state.zoom.minScale,
      state.zoom.maxScale
    );

    if (Math.abs(newScale - oldScale) < 0.0001) {
      return;
    }

    const focalX = clientX ? clientX - rect.left : rect.width / 2;
    const focalY = clientY ? clientY - rect.top : rect.height / 2;
    const contentX = (focalX - state.zoom.translateX) / oldScale;
    const contentY = (focalY - state.zoom.translateY) / oldScale;

    state.zoom.scale = newScale;
    state.zoom.translateX = focalX - contentX * newScale;
    state.zoom.translateY = focalY - contentY * newScale;
    clampZoomTranslation();
    applyZoomTransform();
  }

  function clampZoomTranslation() {
    const viewport = document.querySelector("[data-zoom-viewport]");
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const scaledWidth = state.zoom.contentWidth * state.zoom.scale;
    const scaledHeight = state.zoom.contentHeight * state.zoom.scale;

    if (scaledWidth <= rect.width) {
      state.zoom.translateX = (rect.width - scaledWidth) / 2;
    } else {
      const minX = rect.width - scaledWidth;
      state.zoom.translateX = clamp(state.zoom.translateX, minX, 0);
    }

    if (scaledHeight <= rect.height) {
      state.zoom.translateY = (rect.height - scaledHeight) / 2;
    } else {
      const minY = rect.height - scaledHeight;
      state.zoom.translateY = clamp(state.zoom.translateY, minY, 0);
    }
  }

  function applyZoomTransform() {
    const canvas = document.querySelector("[data-zoom-canvas]");
    if (!canvas) {
      return;
    }

    canvas.style.transform = `translate(${state.zoom.translateX}px, ${state.zoom.translateY}px) scale(${state.zoom.scale})`;
  }

  function getNiceStep(value) {
    const exponent = Math.floor(Math.log10(Math.abs(value || 1)));
    const fraction = value / 10 ** exponent;

    if (fraction <= 1) {
      return 1 * 10 ** exponent;
    }
    if (fraction <= 2) {
      return 2 * 10 ** exponent;
    }
    if (fraction <= 5) {
      return 5 * 10 ** exponent;
    }
    return 10 * 10 ** exponent;
  }

  function buildCsv(type) {
    const headers = {
      pure: ["Stage", "RowId", "MaxHealth"],
      effective: ["Stage", "RowId", "EffectiveHP"],
      powercreep: ["Stage", "RowId", "PowercreepPercent"]
    };

    const rows = state.dataset.map((entry) => {
      if (type === "pure") {
        return [entry.stage, entry.rowId, entry.maxHealth];
      }
      if (type === "effective") {
        return [entry.stage, entry.rowId, entry.effectiveHp.toFixed(2)];
      }
      if (type === "powercreep") {
        return [entry.stage, entry.rowId, entry.powercreep.toFixed(4)];
      }
    });

    return [headers[type].join(","), ...rows.map(csvRow)].join("\n");
  }

  function csvRow(values) {
    return values
      .map((value) => {
        const text = String(value);
        if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
          return `"${text.replaceAll("\"", "\"\"")}"`;
        }
        return text;
      })
      .join(",");
  }

  function downloadBlob(content, mimeType, fileName) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadChartPng(chartKey, chartExport) {
    const svgBlob = new Blob([chartExport.svgMarkup], {
      type: "image/svg+xml;charset=utf-8"
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = chartExport.width;
    canvas.height = chartExport.height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(svgUrl);

    const pngBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!pngBlob) {
      return;
    }

    const url = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chartKey}-sequential-stage-1-to-${state.stageLimit}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function formatInteger(value) {
    return numberFormatter.format(Math.round(value));
  }

  function formatCompact(value) {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}G`;
    }
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  function formatAxisCompact(value) {
    if (value >= 1_000_000_000) {
      return `${trimTrailingZeros((value / 1_000_000_000).toFixed(2))}G`;
    }
    return `${trimTrailingZeros((value / 1_000_000).toFixed(2))}M`;
  }

  function trimTrailingZeros(value) {
    return String(value).replace(/\.?0+$/, "");
  }

  function formatPercent(value) {
    return `${value.toFixed(2)}%`;
  }

  function formatEffectiveCell(entry) {
    const label = formatCompact(entry.effectiveHp);

    if (!entry.isMechanicsAdjusted) {
      return label;
    }

    return `${label}<span class="seq-footnote" title="${escapeHtml(entry.mechanicsNote)}">*</span>`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function bindPointTooltips(root, isZoom) {
    root.querySelectorAll(".seq-chart-point-hitbox").forEach((point) => {
      point.addEventListener("mouseenter", (event) => showPointTooltip(event, isZoom));
      point.addEventListener("mousemove", (event) => showPointTooltip(event, isZoom));
      point.addEventListener("mouseleave", () => hidePointTooltip(isZoom));
    });
  }

  function showPointTooltip(event, isZoom) {
    const target = event.currentTarget;
    const tooltip = isZoom
      ? document.querySelector("[data-chart-tooltip]")
      : document.querySelector("[data-page-chart-tooltip]");
    if (!tooltip) {
      return;
    }

    const stage = target.getAttribute("data-stage") || "";
    const value = target.getAttribute("data-value") || "";
    const note = target.getAttribute("data-note") || "";
    tooltip.innerHTML = `
      <span class="seq-chart-tooltip__stage">Stage ${escapeHtml(stage)}</span>
      <span class="seq-chart-tooltip__value">${escapeHtml(value)}</span>
      ${note ? `<span class="seq-chart-tooltip__note">${escapeHtml(note)}</span>` : ""}
    `;
    tooltip.hidden = false;

    if (isZoom) {
      const viewport = document.querySelector("[data-zoom-viewport]");
      if (!viewport) {
        return;
      }
      const rect = viewport.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left + 16, 12, rect.width - 220);
      const y = clamp(event.clientY - rect.top + 16, 12, rect.height - 96);
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      return;
    }

    tooltip.style.left = `${event.clientX + 18}px`;
    tooltip.style.top = `${event.clientY + 18}px`;
  }

  function hidePointTooltip(isZoom) {
    const tooltip = isZoom
      ? document.querySelector("[data-chart-tooltip]")
      : document.querySelector("[data-page-chart-tooltip]");
    if (tooltip) {
      tooltip.hidden = true;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
