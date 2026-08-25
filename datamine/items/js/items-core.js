(function (factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TofLeaksItemsCore = api;
  }
})(function () {
  const LANG_STORAGE_KEY = "tof-datamine-language";
  const VIRTUAL_WINDOW_SIZE = 300;
  const VIRTUAL_ROW_HEIGHT = 38;
  const VIRTUAL_BUFFER_ROWS = 80;
  const DEFAULT_UI = {
    en: {
      pageTitle: "TOF Item ID Database",
      brand: "Item Datamine",
      navItems: "Items",
      navSequential: "Sequential",
      navOow: "Origin of War",
      navAria: "Datamine sections",
      eyebrow: "ITEMS",
      title: "Item identifiers",
      hint: "Search developer IDs, original names and translations in a data table.",
      loading: "Loading...",
      rendering: "Rendering...",
      rowFilterAria: "Row filter",
      all: "All",
      renamed: "Renamed",
      searchPlaceholder: "Search num / id / name / original / rename",
      itemSourceAria: "Item source",
      num: "NUM",
      id: "ID",
      name: "NAME",
      original: "ORIGINAL",
      rename: "RENAME",
      noRows: "No rows for the current filter.",
      matches: "matches",
      rows: "rows",
      copied: "Copied",
      copyFailed: "Copy failed",
      copyIdTitle: "Click to copy ID",
      editTitle: "Double click to edit",
      exportJson: "Export JSON",
      exportJsonAria: "Export current Items dataset as JSON",
      exportedToast: "JSON exported",
      languageAria: "Language switcher"
    },
    ru: {
      pageTitle: "TOF — база идентификаторов предметов",
      brand: "Датамайн предметов",
      navItems: "Предметы",
      navSequential: "Последовательность",
      navOow: "Истоки войны",
      navAria: "Разделы Datamine",
      eyebrow: "ITEMS",
      title: "Идентификаторы предметов",
      hint: "Поиск ID предметов, исходных названий разработчиков и переводов в таблице данных.",
      loading: "Загрузка...",
      rendering: "Отрисовка...",
      rowFilterAria: "Фильтр строк",
      all: "Все",
      renamed: "Переименованные",
      searchPlaceholder: "Поиск по номеру, ID, имени, оригиналу или переводу",
      itemSourceAria: "Источник предметов",
      num: "NUM",
      id: "ID",
      name: "NAME",
      original: "ORIGINAL",
      rename: "RENAME",
      noRows: "Для текущего фильтра нет строк.",
      matches: "совпадений",
      rows: "строк",
      copied: "Скопировано",
      copyFailed: "Не удалось скопировать",
      copyIdTitle: "Нажмите, чтобы скопировать ID",
      editTitle: "Дважды нажмите для редактирования",
      exportJson: "Скачать JSON",
      exportJsonAria: "Скачать текущий набор предметов в JSON",
      exportedToast: "JSON скачан",
      languageAria: "Переключение языка"
    }
  };

  function resolveInitialLanguage() {
    if (typeof window === "undefined") {
      return "en";
    }
    const fromSearch = new URLSearchParams(window.location.search).get("lang");
    if (fromSearch === "ru" || fromSearch === "en") {
      return fromSearch;
    }
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "ru" || stored === "en" ? stored : "en";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeSearchNeedle(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
  }

  function buildHighlightedHtml(value, query) {
    const source = String(value ?? "");
    const needle = normalizeSearchNeedle(query);

    if (!needle) {
      return escapeHtml(source);
    }

    const loweredSource = source.toLocaleLowerCase();
    let cursor = 0;
    let markup = "";

    while (cursor < source.length) {
      const matchIndex = loweredSource.indexOf(needle, cursor);

      if (matchIndex === -1) {
        markup += escapeHtml(source.slice(cursor));
        break;
      }

      if (matchIndex > cursor) {
        markup += escapeHtml(source.slice(cursor, matchIndex));
      }

      markup += `<mark class="items-match">${escapeHtml(
        source.slice(matchIndex, matchIndex + needle.length)
      )}</mark>`;
      cursor = matchIndex + needle.length;
    }

    return markup;
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(async (response) => {
      if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
          const payload = await response.json();
          if (payload && typeof payload.error === "string" && payload.error.trim()) {
            message = payload.error.trim();
          }
        } catch (error) {
          // Ignore JSON parse errors and keep the HTTP message.
        }

        throw new Error(message);
      }

      return response.json();
    });
  }

  function uniqueUrls(urls) {
    return Array.from(
      new Set(
        (Array.isArray(urls) ? urls : [urls]).filter(
          (value) => typeof value === "string" && value.trim()
        )
      )
    );
  }

  async function fetchJsonWithFallback(urls, options) {
    const queue = uniqueUrls(urls);
    let lastError = new Error("No URL provided.");

    for (const url of queue) {
      try {
        return await fetchJson(url, options);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  function normalizeModeValue(value) {
    return value === "mmo" ? "mmo" : "gacha";
  }

  function buildDefaultDataUrls(mode) {
    const resolvedMode = normalizeModeValue(mode);
    const suffix = resolvedMode === "mmo" ? "?mode=mmo" : "";
    return [`/api/datamine/items${suffix}`];
  }

  function buildDefaultSaveUrls() {
    return ["/api/datamine/items/rename"];
  }

  function resolveDatasets(options) {
    const provided = options?.datasets;
    const modes = ["gacha", "mmo"];
    const datasets = {};

    if (provided && typeof provided === "object" && !Array.isArray(provided)) {
      modes.forEach((mode) => {
        const config = provided[mode];
        if (!config || typeof config !== "object") {
          return;
        }

        datasets[mode] = {
          label: typeof config.label === "string" && config.label.trim() ? config.label.trim() : mode,
          dataUrls: uniqueUrls(config.dataUrls || buildDefaultDataUrls(mode)),
          saveMode: normalizeModeValue(config.saveMode || mode)
        };
      });
    }

    if (!datasets.gacha) {
      datasets.gacha = {
        label: "Gacha",
        dataUrls: uniqueUrls(options?.dataUrls || buildDefaultDataUrls("gacha")),
        saveMode: "gacha"
      };
    }

    return datasets;
  }

  function escapeSelectorValue(value) {
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }

    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  async function copyTextToClipboard(value) {
    const text = String(value ?? "");

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.top = "-9999px";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.focus();
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  function normalizeRows(payload) {
    return Object.entries(payload || {})
      .map(([key, item]) => {
        const quality = typeof item?.quality === "string" ? item.quality : (item?.quality != null ? String(item.quality) : "");
        return {
          key: String(key),
          num: String(key),
          id: String(item?.id ?? ""),
          name: String(item?.name ?? ""),
          original: String(item?.original ?? ""),
          rename: String(item?.rename ?? ""),
          quality: quality,
          hasQuality: item?.quality !== undefined,
          searchText: [
            String(key),
            String(item?.id ?? ""),
            String(item?.name ?? ""),
            String(item?.original ?? ""),
            String(item?.rename ?? "")
          ]
            .join("\n")
            .toLocaleLowerCase()
        };
      })
      .sort((left, right) => {
        const leftNumber = Number(left.num);
        const rightNumber = Number(right.num);
        const leftIsFinite = Number.isFinite(leftNumber);
        const rightIsFinite = Number.isFinite(rightNumber);

        if (leftIsFinite && rightIsFinite) {
          return leftNumber - rightNumber;
        }

        return left.num.localeCompare(right.num, "en");
      });
  }

  function serializeDatasetForExport(rows, mode, snapshot) {
    const isGacha = mode === "gacha";
    const items = (rows || []).map((row) => {
      const numVal = Number(row.num);
      const itemObj = {
        num: Number.isFinite(numVal) ? numVal : row.num,
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        original: String(row.original ?? ""),
        rename: String(row.rename ?? "")
      };

      if (isGacha || row.hasQuality || (typeof row.quality === "string" && row.quality.length > 0)) {
        itemObj.quality = String(row.quality ?? "");
      }

      return itemObj;
    });

    const exportPayload = {
      dataset: mode || "gacha",
      ...(snapshot ? { snapshot: String(snapshot) } : {}),
      count: items.length,
      items
    };

    const filename = snapshot
      ? `tof-items-${mode || "gacha"}-${snapshot}.json`
      : `tof-items-${mode || "gacha"}.json`;

    return {
      payload: exportPayload,
      filename,
      json: JSON.stringify(exportPayload, null, 2)
    };
  }

  function createItemsApp(options) {
    return new ItemsApp(options);
  }

  class ItemsApp {
    constructor(options) {
      this.options = Object.assign(
        {
          rootSelector: "[data-items-app]",
          dataUrls: buildDefaultDataUrls("gacha"),
          saveUrls: buildDefaultSaveUrls(),
          editable: false,
          pageTitle: "",
          pageHint: "",
          emptyRenameLabel: "",
          ui: DEFAULT_UI
        },
        options || {}
      );
      this.datasets = resolveDatasets(this.options);
      this.modeOrder = ["gacha", "mmo"].filter((mode) => this.datasets[mode]);
      this.root = document.querySelector(this.options.rootSelector);
      this.state = {
        rowsByMode: Object.fromEntries(this.modeOrder.map((mode) => [mode, []])),
        loadErrors: {},
        mode: this.modeOrder.includes("gacha") ? "gacha" : this.modeOrder[0] || "gacha",
        filter: "all",
        search: "",
        renderToken: 0,
        editingKey: null,
        isSaving: false,
        language: resolveInitialLanguage()
      };
      this.virtualRows = [];
      this.virtualStart = -1;
      this.virtualScrollFrame = 0;
      this.loadedModes = new Set();
      this.modeLoadPromises = new Map();

      // Restore shareable filter/search state from the URL before the first
      // renderShell so the search box and buttons come up pre-set.
      this.applyUrlState();

      if (!this.root) {
        return;
      }

      this.handleDoubleClick = this.handleDoubleClick.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleInput = this.handleInput.bind(this);
      this.handleScroll = this.handleScroll.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleFocusOut = this.handleFocusOut.bind(this);

      this.renderShell();
      this.bindEvents();
      this.load();
    }

    getText(key) {
      const ui = this.options.ui || DEFAULT_UI;
      return ui[this.state.language]?.[key] || ui.en?.[key] || "";
    }

    getLanguage() {
      return this.state.language;
    }

    setLanguage(language) {
      const nextLanguage = language === "ru" ? "ru" : "en";
      if (nextLanguage === this.state.language) {
        return;
      }

      this.state.language = nextLanguage;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, nextLanguage);
      }
      this.renderShell();
      this.updateModeUi();
      this.updateFilterUi();
      this.renderRows();
      this.updateStatus();
    }

    // Seed mode/filter/search from the query string. Invalid values (or an
    // mmo mode with no mmo dataset) are ignored and fall back to defaults.
    applyUrlState() {
      const store = window.DatamineUrlState;
      if (!store) return;
      const params = store.read();

      if (params.mode) {
        const nextMode = normalizeModeValue(params.mode);
        if (this.modeOrder.includes(nextMode)) {
          this.state.mode = nextMode;
        }
      }
      if (params.filter === "renamed" || params.filter === "all") {
        this.state.filter = params.filter;
      }
      if (typeof params.q === "string") {
        this.state.search = params.q;
      }
    }

    // Mirror mode/filter/search into the address bar. Params equal to their
    // default (mode gacha, filter all, empty search) are omitted.
    syncUrl() {
      const store = window.DatamineUrlState;
      if (!store) return;

      const defaultMode = this.modeOrder.includes("gacha")
        ? "gacha"
        : this.modeOrder[0] || "gacha";
      store.write({
        mode: this.state.mode === defaultMode ? null : this.state.mode,
        filter: this.state.filter === "all" ? null : this.state.filter,
        q: this.state.search || null
      });
    }

    renderShell() {
      const toolbarTitle = this.options.pageTitle || "";
      const toolbarHint = this.options.pageHint || "";
      const titleMarkup = toolbarTitle
        ? `<h2 class="items-toolbar__title">${escapeHtml(toolbarTitle)}</h2>`
        : "";
      const hintMarkup = toolbarHint
        ? `<p class="items-hint">${escapeHtml(toolbarHint)}</p>`
        : "";
      const copyMarkup =
        titleMarkup || hintMarkup
          ? `
            <div class="items-toolbar__copy">
              ${titleMarkup}
              ${hintMarkup}
            </div>
          `
          : "";

      this.root.innerHTML = `
        <section class="items-hero" aria-labelledby="items-page-title">
          <p class="items-hero__eyebrow">${escapeHtml(this.getText("eyebrow"))}</p>
          <h1 class="items-title" id="items-page-title">${escapeHtml(this.getText("title"))}</h1>
          <p class="items-hero__hint">${escapeHtml(this.getText("hint"))}</p>
        </section>
        <section class="items-panel">
          <div class="items-toolbar">
            <div class="items-toolbar__main">
              ${copyMarkup}
              <div class="items-status" data-items-status>${escapeHtml(this.getText("loading"))}</div>
            </div>
            <div class="items-toolbar__controls">
              <div class="items-filter-group" role="group" aria-label="${escapeHtml(this.getText("rowFilterAria"))}">
                <button class="items-filter-button items-filter-button--active" type="button" data-filter="all">
                  ${escapeHtml(this.getText("all"))}
                </button>
                <button class="items-filter-button" type="button" data-filter="renamed">
                  ${escapeHtml(this.getText("renamed"))}
                </button>
              </div>
              <label class="items-search">
                <input
                  class="items-search__input"
                  type="search"
                  value="${escapeHtml(this.state.search)}"
                  placeholder="${escapeHtml(this.getText("searchPlaceholder"))}"
                  data-search-input
                />
              </label>
              <div class="items-mode-group" role="group" aria-label="${escapeHtml(this.getText("itemSourceAria"))}">
                ${this.modeOrder
                  .map(
                    (mode) => `
                      <button
                        class="items-mode-button${
                          mode === this.state.mode ? " items-mode-button--active" : ""
                        }"
                        type="button"
                        data-mode="${escapeHtml(mode)}"
                      >
                        ${escapeHtml(this.datasets[mode].label)}
                      </button>
                    `
                  )
                  .join("")}
              </div>
              <button
                class="items-export-button"
                type="button"
                data-export-json
                aria-label="${escapeHtml(this.getText("exportJsonAria"))}"
                title="${escapeHtml(this.getText("exportJsonAria"))}"
              >
                ${escapeHtml(this.getText("exportJson"))}
              </button>
            </div>
          </div>
          <div class="items-table-wrap dm-scrollbar">
            <table class="items-table">
              <colgroup>
                <col class="items-col items-col--num" />
                <col class="items-col items-col--id" />
                <col class="items-col items-col--name" />
                <col class="items-col items-col--original" />
                <col class="items-col items-col--rename" />
              </colgroup>
              <thead>
                <tr>
                  <th>${escapeHtml(this.getText("num"))}</th>
                  <th>${escapeHtml(this.getText("id"))}</th>
                  <th>${escapeHtml(this.getText("name"))}</th>
                  <th>${escapeHtml(this.getText("original"))}</th>
                  <th>${escapeHtml(this.getText("rename"))}</th>
                </tr>
              </thead>
              <tbody data-items-body>
                <tr>
                  <td colspan="5">${escapeHtml(this.getText("loading"))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div class="items-cursor-toast" data-items-cursor-toast hidden></div>
      `;

      this.statusNode = this.root.querySelector("[data-items-status]");
      this.bodyNode = this.root.querySelector("[data-items-body]");
      this.cursorToastNode = this.root.querySelector("[data-items-cursor-toast]");
    }

    bindEvents() {
      this.root.addEventListener("click", this.handleClick);
      this.root.addEventListener("input", this.handleInput);
      this.root.addEventListener("scroll", this.handleScroll, { passive: true, capture: true });

      if (!this.options.editable) {
        return;
      }

      this.root.addEventListener("dblclick", this.handleDoubleClick);
      this.root.addEventListener("keydown", this.handleKeyDown);
      this.root.addEventListener("focusout", this.handleFocusOut);
    }

    async load() {
      await this.loadMode(this.state.mode);
      this.updateModeUi();
      this.updateFilterUi();
      this.renderRows();
      this.updateStatus();
    }

    async loadMode(mode) {
      if (this.loadedModes.has(mode)) {
        return;
      }
      if (this.modeLoadPromises.has(mode)) {
        return this.modeLoadPromises.get(mode);
      }

      const request = (async () => {
        try {
          const payload = await fetchJsonWithFallback(this.datasets[mode].dataUrls);
          this.state.rowsByMode[mode] = normalizeRows(payload);
          delete this.state.loadErrors[mode];
        } catch (error) {
          this.state.rowsByMode[mode] = [];
          this.state.loadErrors[mode] = error?.message || "Load failed";
        } finally {
          this.loadedModes.add(mode);
          this.modeLoadPromises.delete(mode);
        }
      })();

      this.modeLoadPromises.set(mode, request);
      return request;
    }

    setStatus(message, tone) {
      if (!this.statusNode) {
        return;
      }

      this.statusNode.textContent = message;
      this.statusNode.dataset.tone = tone || "neutral";
    }

    getCurrentDataset() {
      return this.datasets[this.state.mode] || this.datasets.gacha || null;
    }

    getCurrentRows() {
      return this.state.rowsByMode[this.state.mode] || [];
    }

    getSnapshotVersion() {
      if (
        typeof window !== "undefined" &&
        window.DatamineMeta &&
        typeof window.DatamineMeta.getSnapshotVersion === "function"
      ) {
        return window.DatamineMeta.getSnapshotVersion() || "";
      }
      return "";
    }

    async exportCurrentDatasetAsJson() {
      const mode = this.state.mode;
      if (!this.loadedModes.has(mode)) {
        await this.loadMode(mode);
      }
      const rows = this.state.rowsByMode[mode] || [];
      const snapshot = this.getSnapshotVersion();
      return serializeDatasetForExport(rows, mode, snapshot);
    }

    getCurrentLoadError() {
      return this.state.loadErrors[this.state.mode] || "";
    }

    renderRows(options) {
      const resetScroll = options?.resetScroll !== false;
      this.state.renderToken += 1;
      const loadError = this.getCurrentLoadError();

      if (loadError) {
        this.virtualRows = [];
        this.virtualStart = -1;
        this.bodyNode.innerHTML = `<tr><td colspan="5">${escapeHtml(loadError)}</td></tr>`;
        return;
      }

      const visibleRows = this.getVisibleRows();
      this.virtualRows = visibleRows;
      this.virtualStart = -1;

      if (!visibleRows.length) {
        this.bodyNode.innerHTML = `<tr><td colspan="5">${escapeHtml(this.getText("noRows"))}</td></tr>`;
        return;
      }

      const wrap = this.getTableWrap();
      if (resetScroll && wrap) {
        wrap.scrollTop = 0;
      }
      this.renderVirtualWindow(true);
    }

    renderVirtualWindow(force) {
      const rows = this.virtualRows || [];
      const wrap = this.getTableWrap();
      if (!this.bodyNode || !wrap || !rows.length) {
        return;
      }

      const total = rows.length;
      const maxStart = Math.max(0, total - VIRTUAL_WINDOW_SIZE);
      const firstVisibleIndex = Math.max(0, Math.floor(wrap.scrollTop / VIRTUAL_ROW_HEIGHT));
      let start = this.virtualStart;

      const outsideBufferedWindow =
        start < 0 ||
        firstVisibleIndex < start + VIRTUAL_BUFFER_ROWS ||
        firstVisibleIndex >= start + VIRTUAL_WINDOW_SIZE - VIRTUAL_BUFFER_ROWS;

      if (force || outsideBufferedWindow) {
        start = Math.min(maxStart, Math.max(0, firstVisibleIndex - VIRTUAL_BUFFER_ROWS));
      }

      if (!force && start === this.virtualStart) {
        return;
      }

      const end = Math.min(total, start + VIRTUAL_WINDOW_SIZE);
      const topHeight = start * VIRTUAL_ROW_HEIGHT;
      const bottomHeight = Math.max(0, (total - end) * VIRTUAL_ROW_HEIGHT);
      const spacer = (height, position) => height > 0
        ? `<tr class="items-virtual-spacer items-virtual-spacer--${position}" aria-hidden="true"><td colspan="5" style="height:${height}px"></td></tr>`
        : "";

      this.virtualStart = start;
      this.bodyNode.innerHTML =
        spacer(topHeight, "top") +
        rows.slice(start, end).map((row) => this.renderRowMarkup(row)).join("") +
        spacer(bottomHeight, "bottom");
    }

    getVisibleRows() {
      const searchNeedle = this.state.search.trim().toLocaleLowerCase();

      return this.getCurrentRows().filter((row) => {
        if (this.state.filter === "renamed" && !row.rename.trim()) {
          return false;
        }

        if (searchNeedle && !row.searchText.includes(searchNeedle)) {
          return false;
        }

        return true;
      });
    }

    updateFilterUi() {
      this.root.querySelectorAll("[data-filter]").forEach((button) => {
        button.classList.toggle(
          "items-filter-button--active",
          button.dataset.filter === this.state.filter
        );
      });
    }

    updateModeUi() {
      this.root.querySelectorAll("[data-mode]").forEach((button) => {
        button.classList.toggle(
          "items-mode-button--active",
          button.dataset.mode === this.state.mode
        );
      });
    }

    updateStatus() {
      const loadError = this.getCurrentLoadError();
      if (loadError) {
        this.setStatus(loadError, "error");
        return;
      }

      const visibleCount = this.virtualRows.length;
      const totalCount = this.getCurrentRows().length;
      const hasSearch = Boolean(this.state.search.trim());
      const locale = this.state.language === "ru" ? "ru-RU" : "en-US";
      const visibleLabel = visibleCount.toLocaleString(locale);
      const totalLabel = totalCount.toLocaleString(locale);
      const renamedLabel = this.getText("renamed").toLocaleLowerCase(locale);

      if (this.state.filter === "renamed" && hasSearch) {
        this.setStatus(
          `${visibleLabel} ${this.getText("matches")} / ${totalLabel} ${this.getText("rows")}`
        );
        return;
      }

      if (this.state.filter === "renamed") {
        this.setStatus(
          `${visibleLabel} ${renamedLabel} / ${totalLabel} ${this.getText("rows")}`
        );
        return;
      }

      if (hasSearch) {
        this.setStatus(
          `${visibleLabel} ${this.getText("matches")} / ${totalLabel} ${this.getText("rows")}`
        );
        return;
      }

      this.setStatus(`${totalLabel} ${this.getText("rows")}`);
    }

    renderRowMarkup(row) {
      const rename = row.rename.trim();
      const renameText = rename || this.options.emptyRenameLabel;
      const renameClasses = ["items-table__rename"];
      const searchQuery = this.state.search;

      if (rename) {
        renameClasses.push("items-table__rename--filled");
      }

      if (this.options.editable) {
        renameClasses.push("items-table__rename--editable");
      }

      return `
        <tr data-row-key="${escapeHtml(row.key)}" ${
          rename ? 'class="items-table__row items-table__row--renamed"' : 'class="items-table__row"'
        }>
          <td title="${escapeHtml(row.num)}">${buildHighlightedHtml(row.num, searchQuery)}</td>
          <td>
            <button
              class="items-id-button"
              type="button"
              data-copy-id="${escapeHtml(row.id)}"
              title="${escapeHtml(this.getText("copyIdTitle"))}"
            >
              <code>${buildHighlightedHtml(row.id, searchQuery)}</code>
            </button>
          </td>
          <td title="${escapeHtml(row.name)}">${buildHighlightedHtml(row.name, searchQuery)}</td>
          <td title="${escapeHtml(row.original)}">${buildHighlightedHtml(row.original, searchQuery)}</td>
          <td
            class="${renameClasses.join(" ")}"
            data-rename-cell="${escapeHtml(row.key)}"
            title="${escapeHtml(this.options.editable ? this.getText("editTitle") : renameText)}"
          >
            ${renameText ? buildHighlightedHtml(renameText, searchQuery) : ""}
          </td>
        </tr>
      `;
    }

    findRow(key) {
      return this.getCurrentRows().find((row) => row.key === key) || null;
    }

    findRenameCell(key) {
      return this.root.querySelector(`[data-rename-cell="${escapeSelectorValue(key)}"]`);
    }

    findTableRow(key) {
      return this.root.querySelector(`[data-row-key="${escapeSelectorValue(key)}"]`);
    }

    getTableWrap() {
      return this.root.querySelector(".items-table-wrap");
    }

    preserveTableScroll(callback) {
      const wrap = this.getTableWrap();
      if (!wrap) {
        callback();
        return;
      }

      const scrollTop = wrap.scrollTop;
      const scrollLeft = wrap.scrollLeft;
      callback();
      wrap.scrollTop = scrollTop;
      wrap.scrollLeft = scrollLeft;
    }

    syncRowState(key) {
      const row = this.findRow(key);
      const rowNode = this.findTableRow(key);
      if (!row || !rowNode) {
        return;
      }

      rowNode.className = row.rename.trim()
        ? "items-table__row items-table__row--renamed"
        : "items-table__row";
      this.restoreRenameCell(key);
    }

    async handleClick(event) {
      const modeButton = event.target.closest("[data-mode]");
      if (modeButton && this.root.contains(modeButton)) {
        if (this.state.editingKey && !this.state.isSaving) {
          await this.commitEditing();
        }

        const nextMode = normalizeModeValue(modeButton.dataset.mode);
        if (nextMode === this.state.mode) {
          return;
        }

        this.state.mode = nextMode;
        this.updateModeUi();
        this.setStatus(this.getText("rendering"));
        this.virtualRows = [];
        this.virtualStart = -1;
        if (this.bodyNode) {
          this.bodyNode.innerHTML = "";
        }
        await this.loadMode(nextMode);
        if (this.state.mode !== nextMode) {
          return;
        }
        this.renderRows();
        this.updateStatus();
        this.syncUrl();
        return;
      }

      const filterButton = event.target.closest("[data-filter]");
      if (filterButton && this.root.contains(filterButton)) {
        if (this.state.editingKey && !this.state.isSaving) {
          await this.commitEditing();
        }

        this.state.filter = filterButton.dataset.filter === "renamed" ? "renamed" : "all";
        this.updateFilterUi();
        this.setStatus(this.getText("rendering"));
        this.renderRows();
        this.updateStatus();
        this.syncUrl();
        return;
      }

      const exportButton = event.target.closest("[data-export-json]");
      if (exportButton && this.root.contains(exportButton)) {
        if (exportButton.disabled) {
          return;
        }

        try {
          exportButton.disabled = true;
          const { json, filename } = await this.exportCurrentDatasetAsJson();

          if (typeof window !== "undefined" && typeof document !== "undefined") {
            const blob = new Blob([json], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }

          this.showCursorToast(event.clientX, event.clientY, this.getText("exportedToast"));
        } catch (error) {
          this.showCursorToast(event.clientX, event.clientY, error?.message || "Export failed", "error");
        } finally {
          exportButton.disabled = false;
        }
        return;
      }

      const copyButton = event.target.closest("[data-copy-id]");
      if (!copyButton || !this.root.contains(copyButton)) {
        return;
      }

      const id = copyButton.dataset.copyId || "";
      if (!id) {
        return;
      }

      try {
        await copyTextToClipboard(id);
        this.showCursorToast(event.clientX, event.clientY, `${this.getText("copied")}: ${id}`);
      } catch (error) {
        this.showCursorToast(event.clientX, event.clientY, this.getText("copyFailed"), "error");
      }
    }

    handleInput(event) {
      const searchInput = event.target.closest("[data-search-input]");
      if (searchInput && this.root.contains(searchInput)) {
        this.state.search = searchInput.value || "";
        this.setStatus(this.getText("rendering"));
        this.renderRows();
        this.updateStatus();
        this.syncUrl();
      }
    }

    handleScroll(event) {
      const wrap = event.target;
      if (!wrap?.classList?.contains("items-table-wrap") || this.virtualScrollFrame) {
        return;
      }

      this.virtualScrollFrame = window.requestAnimationFrame(() => {
        this.virtualScrollFrame = 0;
        this.renderVirtualWindow(false);
      });
    }

    showCursorToast(clientX, clientY, message, tone) {
      if (!this.cursorToastNode) {
        return;
      }

      window.clearTimeout(this.cursorToastTimer);

      const offsetX = 14;
      const offsetY = 18;
      this.cursorToastNode.hidden = false;
      this.cursorToastNode.textContent = message;
      this.cursorToastNode.dataset.tone = tone || "success";
      this.cursorToastNode.style.left = `${clientX + offsetX}px`;
      this.cursorToastNode.style.top = `${clientY + offsetY}px`;

      requestAnimationFrame(() => {
        this.cursorToastNode.dataset.visible = "true";
      });

      this.cursorToastTimer = window.setTimeout(() => {
        if (!this.cursorToastNode) {
          return;
        }

        delete this.cursorToastNode.dataset.visible;
        this.cursorToastTimer = window.setTimeout(() => {
          if (!this.cursorToastNode) {
            return;
          }

          this.cursorToastNode.hidden = true;
          this.cursorToastNode.textContent = "";
        }, 140);
      }, 900);
    }

    async handleDoubleClick(event) {
      const cell = event.target.closest("[data-rename-cell]");
      if (!cell || this.state.isSaving) {
        return;
      }

      const key = cell.dataset.renameCell;
      await this.startEditing(key);
    }

    async startEditing(key) {
      if (!this.options.editable) {
        return;
      }

      if (this.state.editingKey && this.state.editingKey !== key) {
        await this.commitEditing();
      }

      if (this.state.editingKey === key) {
        return;
      }

      const row = this.findRow(key);
      const cell = this.findRenameCell(key);
      if (!row || !cell) {
        return;
      }

      this.state.editingKey = key;
      cell.classList.add("items-table__rename--editing");
      cell.innerHTML = `
        <input
          class="items-rename-input"
          type="text"
          value="${escapeHtml(row.rename)}"
          data-rename-input="${escapeHtml(key)}"
          spellcheck="false"
        />
      `;

      const input = cell.querySelector("[data-rename-input]");
      if (input) {
        input.focus();
        input.select();
      }
    }

    handleKeyDown(event) {
      const input = event.target.closest("[data-rename-input]");
      if (!input) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void this.commitEditing();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.cancelEditing();
      }
    }

    handleFocusOut(event) {
      const input = event.target.closest("[data-rename-input]");
      if (!input) {
        return;
      }

      const cell = input.closest("[data-rename-cell]");

      window.setTimeout(() => {
        if (this.state.isSaving) {
          return;
        }

        if (document.activeElement === input) {
          return;
        }

        if (cell && cell.contains(document.activeElement)) {
          return;
        }

        void this.commitEditing();
      }, 0);
    }

    cancelEditing() {
      if (!this.state.editingKey) {
        return;
      }

      const key = this.state.editingKey;
      this.state.editingKey = null;
      this.restoreRenameCell(key);
      this.updateStatus();
    }

    async commitEditing() {
      const key = this.state.editingKey;
      if (!key || this.state.isSaving) {
        return;
      }

      const cell = this.findRenameCell(key);
      const input = cell ? cell.querySelector("[data-rename-input]") : null;
      if (!cell || !input) {
        this.state.editingKey = null;
        return;
      }

      const nextRename = input.value;
      const previousText = this.findRow(key)?.rename || "";

      if (nextRename === previousText) {
        this.state.editingKey = null;
        this.restoreRenameCell(key);
        this.updateStatus();
        return;
      }

      this.state.isSaving = true;
      input.disabled = true;
      this.setStatus(`Saving ${key}...`);

      try {
        const payload = await fetchJsonWithFallback(this.options.saveUrls, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            key,
            rename: nextRename,
            mode: this.getCurrentDataset()?.saveMode || this.state.mode
          })
        });

        const row = this.findRow(key);
        if (row) {
          row.rename = String(payload?.item?.rename || "");
          row.searchText = [row.num, row.id, row.name, row.original, row.rename]
            .join("\n")
            .toLocaleLowerCase();
        }

        this.state.editingKey = null;
        const shouldRerenderList = this.state.filter === "renamed" && !(row && row.rename.trim());

        if (shouldRerenderList) {
          this.state.renderToken += 1;
          this.preserveTableScroll(() => {
            this.renderRows({ resetScroll: false });
          });
        } else {
          this.syncRowState(key);
        }

        this.updateStatus();
        this.setStatus(`Saved ${key}`, "success");
      } catch (error) {
        input.disabled = false;
        input.focus();
        input.select();
        this.setStatus(error.message, "error");
      } finally {
        this.state.isSaving = false;
        if (!this.state.isSaving) {
          this.updateFilterUi();
        }
      }
    }

    restoreRenameCell(key) {
      const row = this.findRow(key);
      const cell = this.findRenameCell(key);
      if (!row || !cell) {
        return;
      }

      const rename = row.rename.trim();
      const renameText = rename || this.options.emptyRenameLabel;
      cell.className = "items-table__rename";

      if (rename) {
        cell.classList.add("items-table__rename--filled");
      }

      if (this.options.editable) {
        cell.classList.add("items-table__rename--editable");
        cell.title = this.getText("editTitle");
      } else {
        cell.removeAttribute("title");
      }

      cell.innerHTML = renameText ? buildHighlightedHtml(renameText, this.state.search) : "";
    }
  }

  return {
    createItemsApp,
    normalizeRows,
    serializeDatasetForExport
  };
});
