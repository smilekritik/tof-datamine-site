/* OOW Image Binder (builder-only)
 * ------------------------------------------------------------------
 * Adds an "upload / replace portrait" control to the enemy detail card
 * (the deep-intel modal) on a copy of the datamine OOW page, binds the
 * uploaded image to the enemy's codeName (e.g. boss_hum_036_EX), stores
 * it in localStorage, previews it live, and exports a ready-to-drop zip:
 *
 *   assets/monsters/<codeName>.<ext>     (the uploaded images)
 *   oow-image-bindings.json              ({ "<codeName>": "assets/monsters/<codeName>.<ext>" })
 *   README.txt                           (how to apply to the live site)
 *
 * Nothing here touches the copied page's own scripts — it observes the DOM
 * the React app renders and augments it.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "oow_image_bindings_v1";

  /** @type {Record<string,{dataUrl:string,name:string,size:number,type:string}>} */
  var bindings = load();
  var pendingCode = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings)); } catch (e) {}
  }
  function extFor(type) {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    return "png";
  }
  function fileFor(code) {
    var b = bindings[code];
    return "assets/monsters/" + code + "." + extFor(b ? b.type : "image/png");
  }

  // ---- fetch patch: rewrite the OOW data so EVERY enemy with a bound
  // codeName (floor avatars, hero art, and the modal alike) uses the local
  // image. Installed synchronously here, before the app fetches its data.
  function applyBindingsToData(root) {
    var changed = false;
    var stack = [root];
    while (stack.length) {
      var node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
          if (node[i] && typeof node[i] === "object") stack.push(node[i]);
        }
        continue;
      }
      if (typeof node.codeName === "string" && typeof node.image === "string" && bindings[node.codeName]) {
        node.image = bindings[node.codeName].dataUrl;
        changed = true;
      }
      for (var k in node) {
        if (node[k] && typeof node[k] === "object") stack.push(node[k]);
      }
    }
    return changed;
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var promise = origFetch.apply(null, arguments);
    // Only the floor-enemy datasets carry portrait paths; skip the big
    // deep-intel file (numbers only) to avoid an extra multi-MB re-parse.
    if (!/(oow_(stats|mmo_stats|current_seasons)|summary|index|s\d+|mmo_s\d+)\.json/.test(url)) return promise;
    if (!Object.keys(bindings).length) return promise;
    return promise.then(function (resp) {
      return resp.clone().json().then(function (data) {
        if (!applyBindingsToData(data)) return resp;
        return new Response(JSON.stringify(data), {
          status: resp.status, statusText: resp.statusText, headers: resp.headers
        });
      }).catch(function () { return resp; });
    });
  };

  // ---- hidden file input ------------------------------------------------
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file || !pendingCode) return;
    var code = pendingCode;
    var reader = new FileReader();
    reader.onload = function () {
      bindings[code] = { dataUrl: String(reader.result), name: file.name, size: file.size, type: file.type || "image/png" };
      save();
      updateDock();
      syncModal(); // instant feedback in the open modal
      // Reload so the fetch patch re-applies the image to every enemy with this
      // codeName across the floor list + hero art (not just the modal portrait).
      toast("Bound to " + code + " — applying across floors…");
      setTimeout(function () { location.reload(); }, 750);
    };
    reader.readAsDataURL(file);
  });
  document.body.appendChild(fileInput);

  // ---- floating dock ----------------------------------------------------
  var dock = document.createElement("div");
  dock.className = "oowb-dock";
  dock.innerHTML =
    '<div class="oowb-dock__head">' +
      '<span class="oowb-dock__badge">OOW</span>' +
      '<span class="oowb-dock__title">Image Binder</span>' +
    "</div>" +
    '<div class="oowb-dock__count" data-oowb-count>No local bindings</div>' +
    '<p class="oowb-dock__hint">Open an enemy card and upload a portrait. Export gives you <code>assets/monsters/&lt;code&gt;.png</code> + a mapping JSON to merge into <code>scripts/monster-image-mapping.json</code>, then rebuild.</p>' +
    '<div class="oowb-dock__row">' +
      '<button class="oowb-btn oowb-btn--primary" type="button" data-oowb-export>Export (zip)</button>' +
      '<button class="oowb-btn" type="button" data-oowb-clear>Clear</button>' +
    "</div>";
  document.body.appendChild(dock);

  dock.querySelector("[data-oowb-export]").addEventListener("click", exportZip);
  dock.querySelector("[data-oowb-clear]").addEventListener("click", clearAll);

  function updateDock() {
    var n = Object.keys(bindings).length;
    var el = dock.querySelector("[data-oowb-count]");
    el.textContent = n ? (n + " local binding" + (n > 1 ? "s" : "")) : "No local bindings";
    dock.querySelector("[data-oowb-export]").disabled = n === 0;
  }

  // ---- modal detection + augmentation ----------------------------------
  function parseCode(header) {
    // The id line reads "<label> · <codeName> · S.. / F..". codeName is the
    // token between the first two middots.
    var divs = header.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var m = /·\s*([A-Za-z0-9_]+)\s*·\s*S/.exec(divs[i].textContent || "");
      if (m) return m[1];
    }
    return null;
  }

  function syncModal() {
    var header = document.querySelector(".oow-modal-header");
    if (!header) return;
    var img = header.querySelector("img");
    if (!img) return;
    var wrap = img.parentElement;
    var code = parseCode(header);
    if (!code) return;

    // Preview an existing binding.
    var b = bindings[code];
    if (b && img.getAttribute("data-oowb") !== code) {
      if (!img.dataset.oowbOrig) img.dataset.oowbOrig = img.dataset.src || img.src || "";
      img.src = b.dataUrl;
      img.dataset.src = b.dataUrl;
      img.setAttribute("data-oowb", code);
    }

    // Portrait flag dot.
    if (wrap && getComputedStyle(wrap).position !== "static") {
      var hasFlag = wrap.querySelector(".oowb-portrait-flag");
      if (b && !hasFlag) {
        var dot = document.createElement("span");
        dot.className = "oowb-portrait-flag";
        wrap.appendChild(dot);
      } else if (!b && hasFlag) {
        hasFlag.remove();
      }
    }

    // Inject / refresh the upload control.
    if (wrap && !wrap.querySelector(".oowb-portrait-tool")) {
      var tool = document.createElement("div");
      tool.className = "oowb-portrait-tool";
      tool.innerHTML = '<button type="button" class="oowb-portrait-tool__btn">Replace image</button>';
      // Don't let the click bubble to the portrait's zoom handler.
      tool.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        pendingCode = wrap.getAttribute("data-oowb-code") || code;
        fileInput.click();
      });
      wrap.appendChild(tool);
    }
    if (wrap) wrap.setAttribute("data-oowb-code", code);
  }

  var scheduled = false;
  var observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    // setTimeout (not rAF) so it still fires when the tab is backgrounded.
    setTimeout(function () { scheduled = false; syncModal(); }, 50);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  syncModal();

  // ---- export / clear ---------------------------------------------------
  function exportZip() {
    var codes = Object.keys(bindings);
    if (!codes.length) return;
    if (typeof JSZip === "undefined") { toast("JSZip failed to load"); return; }

    var zip = new JSZip();
    var mapping = {};
    codes.forEach(function (code) {
      var b = bindings[code];
      var path = fileFor(code);
      mapping[code] = path;
      var base64 = String(b.dataUrl).split(",")[1] || "";
      zip.file(path, base64, { base64: true });
    });
    zip.file("oow-image-bindings.json", JSON.stringify(mapping, null, 2));
    zip.file("README.txt",
      "OOW image bindings\n" +
      "==================\n\n" +
      "1. Copy the assets/monsters/*.png files into datamine/oow/assets/monsters/.\n" +
      "2. Merge the entries from oow-image-bindings.json into\n" +
      "   scripts/monster-image-mapping.json. Keys here are the enemy codeName\n" +
      "   (e.g. boss_hum_036_EX). The build resolver also matches the blueprint\n" +
      "   class path, so if an entry does not take effect after rebuilding, add a\n" +
      "   variant key \"OriginWar_<codeName>_C\" pointing at the same file.\n" +
      "3. Rebuild the OOW data: node pipeline/processors/build-user-stats.js (and any deep-intel\n" +
      "   step), then redeploy datamine/oow/.\n"
    );

    zip.generateAsync({ type: "blob" }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "oow-image-bindings.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Exported " + codes.length + " binding" + (codes.length > 1 ? "s" : ""));
    });
  }

  function clearAll() {
    if (!Object.keys(bindings).length) return;
    if (!window.confirm("Remove all local image bindings?")) return;
    // Restore the currently shown portrait, if any.
    var header = document.querySelector(".oow-modal-header");
    if (header) {
      var img = header.querySelector("img");
      if (img && img.dataset.oowbOrig) {
        img.src = img.dataset.oowbOrig;
        img.dataset.src = img.dataset.oowbOrig;
        img.removeAttribute("data-oowb");
      }
      var flag = header.querySelector(".oowb-portrait-flag");
      if (flag) flag.remove();
    }
    bindings = {};
    save();
    updateDock();
    toast("Cleared all bindings — reloading…");
    setTimeout(function () { location.reload(); }, 500);
  }

  // ---- toast ------------------------------------------------------------
  var toastEl = document.createElement("div");
  toastEl.className = "oowb-toast";
  document.body.appendChild(toastEl);
  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
  }

  updateDock();
})();
