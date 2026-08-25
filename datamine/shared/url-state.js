/**
 * Shared query-string state helper for /datamine pages (oow, multype, items).
 *
 * Each page owns a small set of "which view" params (season, filters, search…).
 * These pages update the address bar live so a copied URL restores the current
 * view. This helper centralizes the read/write plumbing:
 *
 *   window.DatamineUrlState.read()            -> plain object of current params
 *   window.DatamineUrlState.write(patch)      -> replaceState with patch merged
 *                                                 in (empty/null values removed)
 *
 * write() is safe to call on hot paths (per keystroke, or from a React
 * componentDidUpdate that fires on every hover/scroll):
 *   - Writes are DEBOUNCED so a burst of calls collapses into one, staying well
 *     under the browser's history.replaceState rate limit (~100/30s in Chrome;
 *     exceeding it throttles and causes visible lag).
 *   - Redundant writes are SKIPPED: if the resulting URL equals the current one
 *     (e.g. hover/scroll that don't change any owned param), nothing happens.
 *
 * It only ever uses history.replaceState, so the browser Back button is never
 * affected. Params not mentioned in a patch (e.g. ?lang, ?chartTheme) are left
 * untouched so language/theme deep-links keep working.
 */
(function () {
  "use strict";

  if (window.DatamineUrlState) return;

  var WRITE_DELAY_MS = 250;
  var pendingPatch = null;
  var writeTimer = 0;

  function read() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    params.forEach(function (value, key) {
      out[key] = value;
    });
    return out;
  }

  function currentUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function flush() {
    writeTimer = 0;
    var patch = pendingPatch;
    pendingPatch = null;
    if (!patch) return;

    var params = new URLSearchParams(window.location.search);
    Object.keys(patch).forEach(function (key) {
      var value = patch[key];
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    var query = params.toString();
    var url = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    if (url === currentUrl()) return; // Nothing changed — avoid a wasted write.

    try {
      window.history.replaceState(null, "", url);
    } catch (e) {
      // Some sandboxed contexts forbid replaceState; deep-linking is a
      // best-effort enhancement, so silently skip when it is unavailable.
    }
  }

  // Merge `patch` into the pending write and (re)arm the debounce. Continuous
  // activity keeps resetting the timer, so the write lands once things settle.
  function write(patch) {
    pendingPatch = Object.assign(pendingPatch || {}, patch || {});
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(flush, WRITE_DELAY_MS);
  }

  window.DatamineUrlState = { read: read, write: write };
})();
