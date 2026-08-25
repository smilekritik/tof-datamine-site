(function (root) {
  const FALLBACK_META = {
    version: "unavailable", exportedAt: "", lastUpdate: "—", lastUpdateIso: "",
    sources: [], available: false
  };

  const BRANCH_NAMES_MAP = {
    TestPC_KR2New: { en: "Korea Dev 1", ru: "Корея Dev 1" },
    TestPC_KRNew: { en: "Korea Dev 2", ru: "Корея Dev 2" },
    TestPC_IW_3_0_0: { en: "Taiwan Dev 1", ru: "Тайвань Dev 1" },
    TestPC_IW_2_5_0: { en: "Taiwan Dev 2", ru: "Тайвань Dev 2" },
    OBPC_Xianqian: { en: "Global Pioneer", ru: "Глобал Pioneer" },
    AdvLaunch52: { en: "CN Client", ru: "CN Клиент" }
  };

  let cachedMetaPromise = null;
  let cachedMetaData = null;

  function normalizeExportMeta(data) {
    if (!data || typeof data !== "object") return { ...FALLBACK_META };
    const snapshot = data.snapshot && typeof data.snapshot === "object" ? data.snapshot : null;
    if (!snapshot || typeof snapshot.version !== "string" || !snapshot.version.trim() || !Array.isArray(snapshot.sources)) return { ...FALLBACK_META };
    const sources = snapshot.sources.map((source) => {
      const branchInfo = BRANCH_NAMES_MAP[source.branch] || {};
      let client = source.client || branchInfo.en || "unknown";
      if (source.branch === "TestPC_KR2New" && client === "Korea Dev 2") client = "Korea Dev 1";
      if (source.branch === "TestPC_KRNew" && client === "Korea Dev 1") client = "Korea Dev 2";
      let clientRu = source.clientRu || branchInfo.ru || client || "неизвестно";
      if (source.branch === "TestPC_KR2New" && clientRu === "Корея Dev 2") clientRu = "Корея Dev 1";
      if (source.branch === "TestPC_KRNew" && clientRu === "Корея Dev 1") clientRu = "Корея Dev 2";
      return {
        client,
        clientRu,
        branch: source.branch || "",
        ...(source.appVersion ? { appVersion: source.appVersion } : {}),
        ...(source.hash ? { hash: source.hash } : {})
      };
    });
    return {
      version: snapshot.version.trim(),
      exportedAt: snapshot.exportedAt || "",
      lastUpdate: snapshot.exportedAt || "—",
      lastUpdateIso: snapshot.exportedAt || "",
      sources,
      available: true
    };
  }

  function getExportMetaAsync(basePath = "./") {
    if (cachedMetaData) {
      return Promise.resolve(cachedMetaData);
    }
    if (cachedMetaPromise) {
      return cachedMetaPromise;
    }

    const url = `${basePath}release-manifest.json`;
    cachedMetaPromise = fetch(url, { cache: "default" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        cachedMetaData = normalizeExportMeta(json);
        if (typeof root.dispatchEvent === "function" && typeof CustomEvent !== "undefined") root.dispatchEvent(new CustomEvent("datamine:meta-loaded", { detail: cachedMetaData }));
        return cachedMetaData;
      })
      .catch(() => {
        cachedMetaData = { ...FALLBACK_META };
        if (typeof root.dispatchEvent === "function" && typeof CustomEvent !== "undefined") root.dispatchEvent(new CustomEvent("datamine:meta-loaded", { detail: cachedMetaData }));
        return cachedMetaData;
      });

    return cachedMetaPromise;
  }

  function getExportMetaSync() {
    return cachedMetaData || { ...FALLBACK_META };
  }

  function setCachedMeta(data) {
    cachedMetaData = normalizeExportMeta(data);
  }

  const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function formatSnapshotDate(isoString, lang = "en") {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const day = d.getUTCDate();
    const monthIdx = d.getUTCMonth();
    const year = d.getUTCFullYear();
    if (lang === "ru") {
      return `${day} ${RU_MONTHS[monthIdx] || ""} ${year}`.trim();
    }
    return `${day} ${EN_MONTHS[monthIdx] || ""} ${year}`.trim();
  }

  const DatamineMeta = {
    get: getExportMetaAsync,
    getSync: getExportMetaSync,
    set: setCachedMeta,
    formatSnapshotDate,
    FALLBACK_META
  };

  root.DatamineMeta = DatamineMeta;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DatamineMeta;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
