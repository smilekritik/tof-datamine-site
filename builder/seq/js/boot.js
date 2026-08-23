/* Sequential Effective-HP editor (builder-only)
 * ------------------------------------------------------------------
 * Renders the "Loaded values" table from the Sequential page, reusing the same
 * datamined sources (boss cache, stage limit, mechanics overrides). Double-click
 * an Effective HP cell to override a stage's value (i.e. record a mechanics-
 * adjusted HP); clearing it or matching the base formula removes the override.
 * Export writes a drop-in copy of:
 *
 *   datamine/seq/data/seq-mechanics-overrides.json   ->  { "stages": { "<n>": { effectiveHp, note } } }
 *
 * The draft lives in localStorage until you Reset. Base (non-overridden) rows
 * use the page's formula: MaxHealth * (1 + 0.3471).
 */
(function () {
  "use strict";

  var BASE_RESIST_RATE = 0.3471;
  var DATA = "../../datamine/seq/data/";
  var CACHE_FILE = DATA + "seq-boss-cache.json";
  var STAGE_LIMIT_FILE = DATA + "seq-stage-limit.txt";
  var MECHANICS_FILE = DATA + "seq-mechanics-overrides.json";
  var DRAFT_KEY = "seq_mechanics_overrides_draft_v1";
  var DEFAULT_NOTE = "Includes mechanics-adjusted HP formula.";

  // Same bundled defaults the live page ships, used only if the file can't load.
  var DEFAULT_OVERRIDES = {
    6: { effectiveHp: 803800000, note: DEFAULT_NOTE },
    8: { effectiveHp: 1095610000, note: DEFAULT_NOTE },
    10: { effectiveHp: 2761910000, note: DEFAULT_NOTE },
    11: { effectiveHp: 2085750000, note: DEFAULT_NOTE },
    14: { effectiveHp: 4091380000, note: DEFAULT_NOTE }
  };

  var FALLBACK_ROWS = [
    266444540, 290648450, 324210140, 352632160, 387894300, 358007550, 393806900,
    542198300, 901488000, 901488000, 1042874600, 1292645400, 2001611000, 1351518300,
    2413397000, 3148018000, 3839448800, 4465471500, 6091220500, 7279999500, 8710000000,
    10335001000, 12456209000, 15292030000, 18773494000, 21274620000, 23572259000,
    25355002000, 26720200000, 27444734000
  ];

  var numberFmt = new Intl.NumberFormat("en-US");

  var state = {
    rows: new Map(),   // rowId -> maxHealth
    stageLimit: 0,
    base: {},          // override map from file (or defaults)
    overrides: {},     // effective override map (draft or clone of base)
    dataset: [],
    editingStage: null
  };

  document.addEventListener("DOMContentLoaded", function () {
    wireHeader();
    loadAll();
  });

  // ---- load -------------------------------------------------------------
  function loadAll() {
    Promise.all([loadStageLimit(), loadRows(), loadMechanics()]).then(function (res) {
      state.stageLimit = res[0];
      state.rows = res[1];
      state.base = res[2];

      var draft = loadDraft();
      state.overrides = draft || clone(state.base);

      rebuild();
      updateCount();
    });
  }

  function loadStageLimit() {
    return fetch(STAGE_LIMIT_FILE).then(function (r) {
      if (!r.ok) throw new Error();
      return r.text();
    }).then(function (t) {
      var n = parseInt(String(t).trim(), 10);
      return Number.isFinite(n) && n > 0 ? n : 30;
    }).catch(function () { return 30; });
  }

  function loadRows() {
    return fetch(CACHE_FILE).then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(function (json) {
      var rows = extractRows(json);
      if (!rows.size) throw new Error();
      return rows;
    }).catch(function () { return buildFallbackRows(); });
  }

  function loadMechanics() {
    return fetch(MECHANICS_FILE).then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(function (json) {
      var stages = (json && json.stages) || {};
      var out = {};
      Object.keys(stages).forEach(function (k) {
        var stage = parseInt(k, 10);
        var v = stages[k];
        if (Number.isFinite(stage) && v && Number.isFinite(v.effectiveHp) && v.effectiveHp > 0) {
          out[stage] = {
            effectiveHp: v.effectiveHp,
            note: (typeof v.note === "string" && v.note.trim()) ? v.note.trim() : DEFAULT_NOTE
          };
        }
      });
      return Object.keys(out).length ? out : clone(DEFAULT_OVERRIDES);
    }).catch(function () { return clone(DEFAULT_OVERRIDES); });
  }

  function extractRows(payload) {
    var container = (payload && payload.rows) || payload;
    var rows = (container && container.Rows) || container;
    var out = new Map();
    if (!rows || typeof rows !== "object") return out;
    Object.keys(rows).forEach(function (rowId) {
      var val = rows[rowId];
      if (Number.isFinite(val)) { out.set(rowId, val); return; }
      if (val && typeof val === "object" && Number.isFinite(val.MaxHealth)) {
        out.set(rowId, val.MaxHealth);
      }
    });
    return out;
  }

  function buildFallbackRows() {
    var rows = new Map();
    FALLBACK_ROWS.forEach(function (hp, i) { rows.set("endless_special_boss_" + (i + 1), hp); });
    return rows;
  }

  // ---- dataset ----------------------------------------------------------
  function baseEffective(maxHealth) { return maxHealth * (1 + BASE_RESIST_RATE); }

  function buildDataset() {
    var dataset = [];
    var prevEffective = null;
    for (var stage = 1; stage <= state.stageLimit; stage += 1) {
      var rowId = "endless_special_boss_" + stage;
      var maxHealth = state.rows.get(rowId);
      if (!Number.isFinite(maxHealth) || maxHealth <= 0) continue;

      var override = state.overrides[stage];
      var effectiveHp = override ? override.effectiveHp : baseEffective(maxHealth);
      var powercreep = prevEffective === null ? 0 : ((effectiveHp / prevEffective) - 1) * 100;

      dataset.push({
        stage: stage,
        rowId: rowId,
        maxHealth: maxHealth,
        effectiveHp: effectiveHp,
        powercreep: powercreep,
        isOverride: Boolean(override),
        note: override ? override.note : ""
      });
      prevEffective = effectiveHp;
    }
    state.dataset = dataset;
  }

  function rebuild() { buildDataset(); renderTable(); }

  function renderTable() {
    var body = document.querySelector("[data-seq-body]");
    if (!body) return;
    if (!state.dataset.length) {
      body.innerHTML = '<tr><td colspan="5">No rows loaded.</td></tr>';
      return;
    }
    body.innerHTML = state.dataset.map(function (e) {
      var star = e.isOverride ? '<span class="seq-footnote" title="' + escapeHtml(e.note) + '">*</span>' : "";
      return '<tr class="' + (e.isOverride ? "seqb-row--override" : "") + '">' +
        "<td>" + e.stage + "</td>" +
        "<td><code>" + escapeHtml(e.rowId) + "</code></td>" +
        "<td>" + formatInt(e.maxHealth) + "</td>" +
        '<td class="seqb-ehp" data-ehp-cell="' + e.stage + '" title="' + formatInt(e.effectiveHp) +
          ' — double-click to edit">' + formatCompact(e.effectiveHp) + star + "</td>" +
        "<td>" + formatPercent(e.powercreep) + "</td>" +
        "</tr>";
    }).join("");
  }

  // ---- editing ----------------------------------------------------------
  document.addEventListener("dblclick", function (ev) {
    var cell = ev.target.closest ? ev.target.closest("[data-ehp-cell]") : null;
    if (cell) startEditing(parseInt(cell.getAttribute("data-ehp-cell"), 10));
  });

  function startEditing(stage) {
    if (state.editingStage === stage) return;
    if (state.editingStage != null) commitEditing();
    var cell = findCell(stage);
    var entry = state.dataset.find(function (e) { return e.stage === stage; });
    if (!cell || !entry) return;
    state.editingStage = stage;
    cell.innerHTML = '<input class="seqb-input" type="text" inputmode="numeric" ' +
      'value="' + Math.round(entry.effectiveHp) + '" data-ehp-input />';
    var input = cell.querySelector("[data-ehp-input]");
    if (input) { input.focus(); input.select(); }
  }

  document.addEventListener("keydown", function (ev) {
    if (!ev.target.closest || !ev.target.closest("[data-ehp-input]")) return;
    if (ev.key === "Enter") { ev.preventDefault(); commitEditing(); }
    else if (ev.key === "Escape") { ev.preventDefault(); cancelEditing(); }
  });

  document.addEventListener("focusout", function (ev) {
    if (ev.target.closest && ev.target.closest("[data-ehp-input]")) {
      setTimeout(function () { if (state.editingStage != null) commitEditing(); }, 0);
    }
  });

  function commitEditing() {
    var stage = state.editingStage;
    if (stage == null) return;
    var cell = findCell(stage);
    var input = cell ? cell.querySelector("[data-ehp-input]") : null;
    var entry = state.dataset.find(function (e) { return e.stage === stage; });
    state.editingStage = null;
    if (!entry) { renderTable(); return; }

    var raw = input ? String(input.value).replace(/[^0-9.]/g, "") : "";
    var value = raw === "" ? NaN : Number(raw);
    var base = baseEffective(entry.maxHealth);

    if (!Number.isFinite(value) || value <= 0 || Math.round(value) === Math.round(base)) {
      // Cleared or back to the base formula → drop the override.
      delete state.overrides[stage];
    } else {
      var prev = state.overrides[stage];
      state.overrides[stage] = { effectiveHp: Math.round(value), note: (prev && prev.note) || DEFAULT_NOTE };
    }
    saveDraft();
    preserveScroll(function () { rebuild(); });
    updateCount();
  }

  function cancelEditing() {
    if (state.editingStage == null) return;
    state.editingStage = null;
    renderTable();
  }

  function findCell(stage) {
    return document.querySelector('[data-ehp-cell="' + stage + '"]');
  }

  function preserveScroll(fn) {
    var wrap = document.querySelector(".seq-table-wrap");
    var top = wrap ? wrap.scrollTop : 0;
    fn();
    if (wrap) wrap.scrollTop = top;
  }

  // ---- draft persistence ------------------------------------------------
  function loadDraft() {
    try {
      var parsed = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (!parsed || typeof parsed !== "object") return null;
      return normalizeOverrides(parsed);
    } catch (e) { return null; }
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.overrides)); } catch (e) {}
  }
  function normalizeOverrides(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var stage = parseInt(k, 10);
      var v = obj[k];
      if (Number.isFinite(stage) && v && Number.isFinite(v.effectiveHp) && v.effectiveHp > 0) {
        out[stage] = { effectiveHp: v.effectiveHp, note: (typeof v.note === "string" && v.note.trim()) ? v.note.trim() : DEFAULT_NOTE };
      }
    });
    return out;
  }

  // ---- header actions ---------------------------------------------------
  function wireHeader() {
    var exportBtn = document.querySelector('[data-seqb-action="export"]');
    if (exportBtn) exportBtn.addEventListener("click", exportOverrides);

    var importBtn = document.querySelector('[data-seqb-action="import"]');
    var fileInput = document.querySelector("[data-seqb-file]");
    if (importBtn && fileInput) {
      importBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (file) importOverrides(file);
      });
    }

    var resetBtn = document.querySelector('[data-seqb-action="reset"]');
    if (resetBtn) resetBtn.addEventListener("click", resetDraft);
  }

  function sortedStages(map) {
    var out = {};
    Object.keys(map).map(Number).sort(function (a, b) { return a - b; }).forEach(function (stage) {
      out[stage] = { effectiveHp: map[stage].effectiveHp, note: map[stage].note || DEFAULT_NOTE };
    });
    return out;
  }

  function exportOverrides() {
    var payload = { stages: sortedStages(state.overrides) };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "seq-mechanics-overrides.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported " + Object.keys(state.overrides).length + " override(s)");
  }

  function importOverrides(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { toast("Import failed — not valid JSON"); return; }
      var stages = (parsed && parsed.stages) || parsed;
      state.overrides = normalizeOverrides(stages || {});
      saveDraft();
      preserveScroll(function () { rebuild(); });
      updateCount();
      toast("Imported " + Object.keys(state.overrides).length + " override(s)");
    };
    reader.readAsText(file);
  }

  function resetDraft() {
    if (!window.confirm("Reset to the file's overrides and discard local edits?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    state.overrides = clone(state.base);
    preserveScroll(function () { rebuild(); });
    updateCount();
    toast("Reset to seq-mechanics-overrides.json");
  }

  // ---- helpers ----------------------------------------------------------
  function updateCount() {
    var el = document.querySelector("[data-seqb-count]");
    if (!el) return;
    var n = Object.keys(state.overrides).length;
    el.textContent = n + " override" + (n === 1 ? "" : "s");
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function formatInt(v) { return numberFmt.format(Math.round(v)); }
  function formatCompact(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "G";
    return (v / 1e6).toFixed(2) + "M";
  }
  function formatPercent(v) { return v.toFixed(2) + "%"; }
  function escapeHtml(v) {
    return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "seqb-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
  }
})();
