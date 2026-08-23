/* Items Rename Editor (builder-only)
 * ------------------------------------------------------------------
 * Reuses the live datamine Items core + styles, but runs fully client-side:
 * there is no server here, so the core's "save" POST is intercepted and the
 * rename is kept in localStorage instead. On load, stored renames are merged
 * back into the fetched mapping so the table shows your draft. Export writes a
 * drop-in copy of the mapping file (with quality + every field preserved) for
 * the active source (Gacha / MMO):
 *
 *   datamine/items/data/merged_mapping_with_original.json       (Gacha)
 *   datamine/items/data/merged_mapping_with_original_mmo.json   (MMO)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "items_rename_bindings_v1";
  var SAVE_SENTINEL = "itembuilder:save";
  var DATA_BASE = "../../datamine/items/data/";
  var FILES = {
    gacha: "merged_mapping_with_original.json",
    mmo: "merged_mapping_with_original_mmo.json"
  };

  /** @type {{gacha:Record<string,string>, mmo:Record<string,string>}} */
  var bindings = load();

  function load() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return { gacha: parsed.gacha || {}, mmo: parsed.mmo || {} };
    } catch (e) {
      return { gacha: {}, mmo: {} };
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings)); } catch (e) {}
  }
  function bucketFor(mode) { return mode === "mmo" ? "mmo" : "gacha"; }
  function modeForUrl(url) { return /_mmo\.json/.test(String(url)) ? "mmo" : "gacha"; }
  function countBindings() {
    return Object.keys(bindings.gacha).length + Object.keys(bindings.mmo).length;
  }

  // Apply stored renames onto a fetched mapping (keyed by num → {..., rename}).
  function applyBindings(data, mode) {
    var bucket = bindings[bucketFor(mode)] || {};
    Object.keys(bucket).forEach(function (key) {
      if (data && data[key] && typeof data[key] === "object") {
        data[key].rename = bucket[key];
      }
    });
    return data;
  }

  // ---- fetch patch (installed before the app loads any data) ------------
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";

    // Intercept the core's rename "save" POST — persist locally, fake success.
    if (url.indexOf(SAVE_SENTINEL) === 0) {
      var rename = "";
      var mode = "gacha";
      var key = "";
      try {
        var body = JSON.parse((init && init.body) || "{}");
        key = String(body.key == null ? "" : body.key);
        rename = String(body.rename == null ? "" : body.rename);
        mode = bucketFor(body.mode);
      } catch (e) {}
      if (key) { bindings[mode][key] = rename; save(); updateCount(); }
      return Promise.resolve(new Response(
        JSON.stringify({ ok: true, item: { rename: rename } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    var promise = origFetch(input, init);
    if (!/merged_mapping_with_original(_mmo)?\.json/.test(url)) return promise;

    var mode = modeForUrl(url);
    if (!Object.keys(bindings[bucketFor(mode)]).length) return promise;
    return promise.then(function (resp) {
      return resp.clone().json().then(function (data) {
        applyBindings(data, mode);
        return new Response(JSON.stringify(data), {
          status: resp.status, statusText: resp.statusText, headers: resp.headers
        });
      }).catch(function () { return resp; });
    });
  };

  // ---- boot the reused Items core --------------------------------------
  window.addEventListener("DOMContentLoaded", function () {
    if (!window.TofLeaksItemsCore) return;

    var app = window.TofLeaksItemsCore.createItemsApp({
      rootSelector: "[data-items-app]",
      datasets: {
        gacha: { label: "Gacha", dataUrls: [DATA_BASE + FILES.gacha], saveMode: "gacha" },
        mmo: { label: "MMO", dataUrls: [DATA_BASE + FILES.mmo], saveMode: "mmo" }
      },
      saveUrls: [SAVE_SENTINEL],
      editable: true,
      pageTitle: "",
      pageHint: "Double-click a rename to edit. Draft is kept in your browser; use Export to write the mapping file for datamine/items/data/.",
      emptyRenameLabel: ""
    });

    wireHeader(app);
    updateCount();
  });

  // ---- header actions ---------------------------------------------------
  function activeMode() {
    var active = document.querySelector(".items-mode-button--active[data-mode]");
    return bucketFor(active ? active.getAttribute("data-mode") : "gacha");
  }

  function wireHeader(app) {
    document.querySelectorAll("[data-itb-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-itb-lang");
        if (app && typeof app.setLanguage === "function") app.setLanguage(lang);
        document.querySelectorAll("[data-itb-lang]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
      });
    });

    var exportBtn = document.querySelector('[data-itb-action="export"]');
    if (exportBtn) exportBtn.addEventListener("click", function () { exportMapping(activeMode()); });

    var importBtn = document.querySelector('[data-itb-action="import"]');
    var fileInput = document.querySelector("[data-itb-file]");
    if (importBtn && fileInput) {
      importBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (file) importMapping(file, activeMode());
      });
    }

    var resetBtn = document.querySelector('[data-itb-action="reset"]');
    if (resetBtn) resetBtn.addEventListener("click", resetDraft);
  }

  function exportMapping(mode) {
    var file = FILES[mode];
    origFetch(DATA_BASE + file)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        applyBindings(data, mode);
        downloadJson(file, data);
        toast("Exported " + file);
      })
      .catch(function () { toast("Export failed — could not read source"); });
  }

  // Import a previously exported mapping file: pull its non-empty renames into
  // the draft for the active source, then reload so the table reflects them.
  function importMapping(file, mode) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { toast("Import failed — not valid JSON"); return; }

      var bucket = bindings[bucketFor(mode)];
      var n = 0;
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach(function (key) {
          var entry = parsed[key];
          // Full mapping: { "1": { id, name, original, rename, quality } }
          if (entry && typeof entry === "object" && "rename" in entry) {
            var val = String(entry.rename == null ? "" : entry.rename);
            if (val) { bucket[key] = val; n++; }
          } else if (typeof entry === "string") {
            // Flat { "1": "rename" } shape.
            if (entry) { bucket[key] = entry; n++; }
          }
        });
      }
      save();
      toast("Imported " + n + " rename" + (n === 1 ? "" : "s") + " — reloading…");
      setTimeout(function () { location.reload(); }, 650);
    };
    reader.readAsText(file);
  }

  function resetDraft() {
    if (!countBindings()) return;
    if (!window.confirm("Discard all local rename edits (both sources)?")) return;
    bindings = { gacha: {}, mmo: {} };
    save();
    toast("Draft cleared — reloading…");
    setTimeout(function () { location.reload(); }, 500);
  }

  function downloadJson(name, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---- small chrome: draft count + toast --------------------------------
  function updateCount() {
    var el = document.querySelector("[data-itb-count]");
    if (!el) return;
    var n = countBindings();
    el.textContent = n ? (n + " edit" + (n === 1 ? "" : "s") + " in draft") : "No local edits";
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "itb-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
  }
})();
