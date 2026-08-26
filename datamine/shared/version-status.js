(function (root) {
  let globalVersionPromise = null;
  let cachedGlobalVersion = null;

  /**
   * Parse a version string (e.g. "6.3.0", "v5.7.0 KR Dev client", " 6.4\n")
   * into an array of numeric components [6, 3, 0].
   * Returns null if unparseable.
   */
  function parseVersion(str) {
    if (typeof str !== "string") return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    // Match the primary numeric version pattern (e.g., 6.3.0, 5.7.12, 6.4)
    const match = trimmed.match(/(?:v|V)?\s*(\d+(?:\.\d+)+)/);
    if (!match || !match[1]) return null;

    const parts = match[1].split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });

    return parts.length > 0 ? parts : null;
  }

  /**
   * Compare two semantic versions.
   * Returns:
   *   1 if a > b
   *  -1 if a < b
   *   0 if a == b
   *  null if either version is invalid
   */
  function compareVersions(a, b) {
    const partsA = parseVersion(a);
    const partsB = parseVersion(b);

    if (!partsA || !partsB) return null;

    const maxLength = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLength; i++) {
      const valA = i < partsA.length ? partsA[i] : 0;
      const valB = i < partsB.length ? partsB[i] : 0;
      if (valA > valB) return 1;
      if (valA < valB) return -1;
    }

    return 0;
  }

  /**
   * Read the latest daily Global version from a static file.
   * Request is cached in-memory for the page lifecycle.
   * Resolves to version string (e.g. "6.2.0") or null on failure.
   */
  async function getGlobalVersion() {
    if (cachedGlobalVersion !== null) {
      return cachedGlobalVersion;
    }

    if (globalVersionPromise) {
      return globalVersionPromise;
    }

    globalVersionPromise = (async () => {
      try {
        const versionUrl = "/datamine/data/live-global-version.json";

        const response = await fetch(versionUrl, { cache: "no-store" });
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        if (data && typeof data.version === "string" && data.version.trim()) {
          cachedGlobalVersion = data.version.trim();
          return cachedGlobalVersion;
        }
        return null;
      } catch (err) {
        // Live version check is optional enrichment; suppress network errors silently
        return null;
      } finally {
        globalVersionPromise = null;
      }
    })();

    return globalVersionPromise;
  }

  /**
   * Compare a dataset version against the live Global version.
   */
  async function getStatus(datasetVersion) {
    const globalVersion = await getGlobalVersion();
    if (!globalVersion || !datasetVersion) {
      return {
        datasetVersion: datasetVersion || null,
        globalVersion: globalVersion || null,
        updateAvailable: false,
        isCurrent: null,
        status: "unknown"
      };
    }

    const cmp = compareVersions(globalVersion, datasetVersion);
    if (cmp === null) {
      return {
        datasetVersion,
        globalVersion,
        updateAvailable: false,
        isCurrent: null,
        status: "unknown"
      };
    }

    const updateAvailable = cmp > 0;
    const isCurrent = cmp <= 0;

    return {
      datasetVersion,
      globalVersion,
      updateAvailable,
      isCurrent,
      status: updateAvailable ? "update_available" : "current"
    };
  }

  const DatamineVersionStatus = {
    parseVersion,
    compareVersions,
    getGlobalVersion,
    getStatus,
    // Reset cache (used primarily for unit testing)
    _resetCache: () => {
      cachedGlobalVersion = null;
      globalVersionPromise = null;
    }
  };

  root.DatamineVersionStatus = DatamineVersionStatus;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DatamineVersionStatus;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
