(function (factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TofLeaksItemsCore = api;
  }
})(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function buildDefaultDataUrls() {
    return uniqueUrls([
      "/api/datamine/items",
      "http://127.0.0.1:3001/api/datamine/items",
      "http://localhost:3001/api/datamine/items"
    ]);
  }

  function buildDefaultSaveUrls() {
    return uniqueUrls([
      "/api/datamine/items/rename",
      "http://127.0.0.1:3001/api/datamine/items/rename",
      "http://localhost:3001/api/datamine/items/rename"
    ]);
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
      .map(([key, item]) => ({
        key: String(key),
        num: String(key),
        id: String(item?.id || ""),
        name: String(item?.name || ""),
        original: String(item?.original || ""),
        rename: String(item?.rename || ""),
        searchText: [
          String(item?.name || ""),
          String(item?.original || ""),
          String(item?.rename || "")
        ]
          .join("\n")
          .toLocaleLowerCase()
      }))
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

  function createItemsApp(options) {
    return new ItemsApp(options);
  }

  class ItemsApp {
    constructor(options) {
      this.options = Object.assign(
        {
          rootSelector: "[data-items-app]",
          dataUrls: buildDefaultDataUrls(),
          saveUrls: buildDefaultSaveUrls(),
          editable: false,
          pageTitle: "",
          pageHint: "",
          emptyRenameLabel: ""
        },
        options || {}
      );
      this.root = document.querySelector(this.options.rootSelector);
      this.state = {
        rows: [],
        filter: "all",
        search: "",
        renderToken: 0,
        editingKey: null,
        isSaving: false
      };

      if (!this.root) {
        return;
      }

      this.handleDoubleClick = this.handleDoubleClick.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleInput = this.handleInput.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleFocusOut = this.handleFocusOut.bind(this);

      this.renderShell();
      this.bindEvents();
      this.load();
    }

    renderShell() {
      const titleMarkup = this.options.pageTitle
        ? `<h1 class="items-title">${escapeHtml(this.options.pageTitle)}</h1>`
        : "";
      const hintMarkup = this.options.pageHint
        ? `<p class="items-hint">${escapeHtml(this.options.pageHint)}</p>`
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
        <section class="items-panel">
          <div class="items-toolbar">
            <div class="items-toolbar__main">
              ${copyMarkup}
              <div class="items-status" data-items-status>Loading...</div>
            </div>
            <div class="items-toolbar__controls">
              <label class="items-search">
                <input
                  class="items-search__input"
                  type="search"
                  value="${escapeHtml(this.state.search)}"
                  placeholder="Search name / original / rename"
                  data-search-input
                />
              </label>
              <div class="items-filter-group" role="group" aria-label="Row filter">
                <button class="items-filter-button items-filter-button--active" type="button" data-filter="all">
                  All
                </button>
                <button class="items-filter-button" type="button" data-filter="renamed">
                  Renamed
                </button>
              </div>
            </div>
          </div>
          <div class="items-table-wrap">
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
                  <th>num</th>
                  <th>id</th>
                  <th>name</th>
                  <th>original</th>
                  <th>rename</th>
                </tr>
              </thead>
              <tbody data-items-body>
                <tr>
                  <td colspan="5">Loading...</td>
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

      if (!this.options.editable) {
        return;
      }

      this.root.addEventListener("dblclick", this.handleDoubleClick);
      this.root.addEventListener("keydown", this.handleKeyDown);
      this.root.addEventListener("focusout", this.handleFocusOut);
    }

    async load() {
      try {
        const payload = await fetchJsonWithFallback(this.options.dataUrls, {
          cache: "no-store"
        });
        this.state.rows = normalizeRows(payload);
        this.updateFilterUi();
        this.renderRows();
        this.updateStatus();
      } catch (error) {
        this.bodyNode.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
        this.setStatus("Load failed", "error");
      }
    }

    setStatus(message, tone) {
      if (!this.statusNode) {
        return;
      }

      this.statusNode.textContent = message;
      this.statusNode.dataset.tone = tone || "neutral";
    }

    renderRows() {
      const renderToken = this.state.renderToken + 1;
      this.state.renderToken = renderToken;
      const visibleRows = this.getVisibleRows();

      if (!visibleRows.length) {
        this.bodyNode.innerHTML = `<tr><td colspan="5">No rows for current filter.</td></tr>`;
        return;
      }

      if (visibleRows.length <= 800) {
        this.bodyNode.innerHTML = visibleRows.map((row) => this.renderRowMarkup(row)).join("");
        return;
      }

      this.bodyNode.innerHTML = "";
      const chunkSize = 320;
      let index = 0;

      const renderChunk = () => {
        if (this.state.renderToken !== renderToken) {
          return;
        }

        const chunk = visibleRows.slice(index, index + chunkSize);
        if (!chunk.length) {
          return;
        }

        this.bodyNode.insertAdjacentHTML(
          "beforeend",
          chunk.map((row) => this.renderRowMarkup(row)).join("")
        );
        index += chunkSize;

        if (index < visibleRows.length) {
          window.requestAnimationFrame(renderChunk);
        }
      };

      window.requestAnimationFrame(renderChunk);
    }

    getVisibleRows() {
      const searchNeedle = this.state.search.trim().toLocaleLowerCase();

      return this.state.rows.filter((row) => {
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

    updateStatus() {
      const visibleCount = this.getVisibleRows().length;
      const totalCount = this.state.rows.length;
      const hasSearch = Boolean(this.state.search.trim());

      if (this.state.filter === "renamed" && hasSearch) {
        this.setStatus(
          `${visibleCount.toLocaleString()} matches / ${totalCount.toLocaleString()} rows`
        );
        return;
      }

      if (this.state.filter === "renamed") {
        this.setStatus(
          `${visibleCount.toLocaleString()} renamed / ${totalCount.toLocaleString()} rows`
        );
        return;
      }

      if (hasSearch) {
        this.setStatus(
          `${visibleCount.toLocaleString()} matches / ${totalCount.toLocaleString()} rows`
        );
        return;
      }

      this.setStatus(`${totalCount.toLocaleString()} rows`);
    }

    renderRowMarkup(row) {
      const rename = row.rename.trim();
      const renameText = rename || this.options.emptyRenameLabel;
      const renameClasses = ["items-table__rename"];

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
          <td>${escapeHtml(row.num)}</td>
          <td>
            <button
              class="items-id-button"
              type="button"
              data-copy-id="${escapeHtml(row.id)}"
              title="Click to copy id"
            >
              <code>${escapeHtml(row.id)}</code>
            </button>
          </td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.original)}</td>
          <td
            class="${renameClasses.join(" ")}"
            data-rename-cell="${escapeHtml(row.key)}"
            ${this.options.editable ? 'title="Double click to edit"' : ""}
          >
            ${renameText ? escapeHtml(renameText) : ""}
          </td>
        </tr>
      `;
    }

    findRow(key) {
      return this.state.rows.find((row) => row.key === key) || null;
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
      const filterButton = event.target.closest("[data-filter]");
      if (filterButton && this.root.contains(filterButton)) {
        this.state.filter = filterButton.dataset.filter === "renamed" ? "renamed" : "all";
        this.updateFilterUi();
        this.setStatus("Rendering...");
        this.renderRows();
        this.updateStatus();
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
        this.showCursorToast(event.clientX, event.clientY, `Copied: ${id}`);
      } catch (error) {
        this.showCursorToast(event.clientX, event.clientY, "Copy failed", "error");
      }
    }

    handleInput(event) {
      const searchInput = event.target.closest("[data-search-input]");
      if (searchInput && this.root.contains(searchInput)) {
        this.state.search = searchInput.value || "";
        this.setStatus("Rendering...");
        this.renderRows();
        this.updateStatus();
      }
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
            rename: nextRename
          })
        });

        const row = this.findRow(key);
        if (row) {
          row.rename = String(payload?.item?.rename || "");
          row.searchText = [row.name, row.original, row.rename].join("\n").toLocaleLowerCase();
        }

        this.state.editingKey = null;
        const shouldRerenderList = this.state.filter === "renamed" && !(row && row.rename.trim());

        if (shouldRerenderList) {
          this.state.renderToken += 1;
          this.preserveTableScroll(() => {
            this.renderRows();
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
        cell.title = "Double click to edit";
      } else {
        cell.removeAttribute("title");
      }

      cell.innerHTML = renameText ? escapeHtml(renameText) : "";
    }
  }

  return {
    createItemsApp
  };
});
