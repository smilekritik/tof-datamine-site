(function () {
  const SERVER_CACHE_RECOVERY_KEY = "tof-datamine-server-cache-recovery-v1";
  const SERVER_CACHE_RECOVERY_RELOAD_KEY = "tof-datamine-server-cache-recovery-reload-v1";

  async function removeLegacyServerWorkerCache() {
    if (location.hostname !== "tof.smilekritik.beer" || !("serviceWorker" in navigator)) return;
    try {
      if (localStorage.getItem(SERVER_CACHE_RECOVERY_KEY) === "done") return;

      const registrations = await navigator.serviceWorker.getRegistrations();
      const datamineRegistrations = registrations.filter((registration) => {
        try {
          return new URL(registration.scope).pathname.startsWith("/datamine/");
        } catch (error) {
          return false;
        }
      });
      const cacheNames = "caches" in window ? await caches.keys() : [];
      const legacyCacheNames = cacheNames.filter((name) => name.startsWith("tof-datamine-"));

      await Promise.all([
        ...datamineRegistrations.map((registration) => registration.unregister()),
        ...legacyCacheNames.map((name) => caches.delete(name))
      ]);
      localStorage.setItem(SERVER_CACHE_RECOVERY_KEY, "done");

      const hadLegacyCache = datamineRegistrations.length > 0 || legacyCacheNames.length > 0;
      if (hadLegacyCache && sessionStorage.getItem(SERVER_CACHE_RECOVERY_RELOAD_KEY) !== "done") {
        sessionStorage.setItem(SERVER_CACHE_RECOVERY_RELOAD_KEY, "done");
        location.reload();
      }
    } catch (error) {
      // Cache recovery is best-effort; normal server-rendered pages still work.
    }
  }

  removeLegacyServerWorkerCache();

  const STORAGE_KEY = "tof-datamine-language";
  const LANGUAGE_COOKIE = "tof-datamine-language";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const LEGACY_STORAGE_KEYS = ["fce-language", "seq-language", "items-language"];
  const SECTIONS = [
    { id: "oow", href: "oow/", label: { en: "Origin of War", ru: "Истоки войны" } },
    { id: "fce", href: "fce/", label: { en: "FCE", ru: "FCE" } },
    { id: "seq", href: "seq/", label: { en: "Sequential", ru: "Последовательность" } },
    { id: "multype", href: "multype/", label: { en: "Multype", ru: "Multype" } },
    { id: "items", href: "items/", label: { en: "Items", ru: "Предметы" } }
  ];
  const BRANDS = {
    hub: { en: "Datamine Archive", ru: "Архив Datamine" },
    oow: { en: "Origin of War", ru: "Истоки войны" },
    fce: { en: "FCE Boss Mechanics", ru: "Механики боссов FCE" },
    seq: { en: "Sequential Analysis", ru: "Анализ Sequential" },
    multype: { en: "Multype Datamine", ru: "Датамайн Multype" },
    items: { en: "Item Datamine", ru: "Датамайн предметов" }
  };

  const EXPORT_STRINGS = {
    lastUpdate: { en: "Last update", ru: "Последнее обновление" },
    version: { en: "Version:", ru: "Версия:" },
    snapshot: { en: "Dataset snapshot", ru: "Снимок данных" },
    sources: { en: "Sources", ru: "Источники" },
    tooltipTitle: { en: "Export details", ru: "Данные экспорта" },
    updated: { en: "Updated", ru: "Обновлено" },
    branch: { en: "Branch", ru: "Ветка" },
    global: { en: "Global", ru: "Global" },
    updateAvailable: { en: "Update available", ru: "Доступно обновление" },
    updateNotice: {
      en: (v) => `Global ${v} is newer than this dataset.`,
      ru: (v) => `Global ${v} новее текущего набора данных.`
    },
    updateHelpText: {
      en: "You can help update the Datamine. It takes about 10 minutes and requires an installed PC copy of Tower of Fantasy.",
      ru: "Вы можете помочь обновить Datamine. Потребуется около 10 минут и установленная версия Tower of Fantasy для ПК."
    },
    howToHelp: { en: "How to help →", ru: "Как помочь →" }
  };

  const SKIP_STRINGS = {
    en: "Skip to main content",
    ru: "Перейти к основному содержимому"
  };
  const NAV_STRINGS = {
    en: "Datamine sections",
    ru: "Разделы Datamine"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  let exportMeta = {
    version: "unavailable", exportedAt: "", lastUpdate: "—", lastUpdateIso: "",
    sources: [], available: false
  };
  let hasFetchedExportMeta = false;
  let liveGlobalVersion = null;
  let liveVersionStatus = null;

  function readCookie(name) {
    const prefix = encodeURIComponent(name) + "=";
    const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
  }

  function writeLanguageCookie(value) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(LANGUAGE_COOKIE)}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/datamine/; SameSite=Lax${secure}`;
  }

  function resolveInitialLanguage() {
    const cookieLanguage = readCookie(LANGUAGE_COOKIE);
    if (cookieLanguage === "ru" || cookieLanguage === "en") {
      localStorage.setItem(STORAGE_KEY, cookieLanguage);
      return cookieLanguage;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ru" || stored === "en") {
      writeLanguageCookie(stored);
      return stored;
    }

    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy === "ru" || legacy === "en") {
        localStorage.setItem(STORAGE_KEY, legacy);
        writeLanguageCookie(legacy);
        return legacy;
      }
    }
    return "en";
  }

  let language = resolveInitialLanguage();

  function getBasePath(host) {
    return host.dataset.basePath || (host.dataset.current === "hub" ? "./" : "../");
  }

  async function checkLiveGlobalVersion() {
    if (window.DatamineVersionStatus && typeof window.DatamineVersionStatus.getStatus === "function") {
      try {
        const res = await window.DatamineVersionStatus.getStatus(exportMeta.version);
        if (res && res.globalVersion) {
          liveGlobalVersion = res.globalVersion;
          liveVersionStatus = res;
          renderAll();
          window.dispatchEvent(new CustomEvent("datamine:live-version-loaded", { detail: res }));
        }
      } catch (err) {}
    }
  }

  async function fetchExportMeta(basePath) {
    if (hasFetchedExportMeta) return;
    hasFetchedExportMeta = true;

    if (window.DatamineMeta && typeof window.DatamineMeta.get === "function") {
      const meta = await window.DatamineMeta.get(basePath);
      if (meta) {
        exportMeta = Object.assign({}, exportMeta, meta);
        renderAll();
        window.dispatchEvent(new CustomEvent("datamine:meta-loaded", { detail: exportMeta }));
        if (meta.available) checkLiveGlobalVersion();
        return;
      }
    }
    renderAll();
  }

  function renderHost(host) {
    const current = host.dataset.current || "hub";
    const basePath = getBasePath(host);
    const brand = BRANDS[current] || BRANDS.hub;
    const main = document.querySelector("main");
    if (main && !main.id) main.id = "main-content";
    if (main && !main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    const mainTarget = main?.id || "main-content";
    const links = SECTIONS.map((section) => {
      const active = section.id === current;
      return `<a class="datamine-header__link${active ? " is-active" : ""}" href="${basePath}${section.href}"${active ? ' aria-current="page"' : ""}>${section.label[language]}</a>`;
    }).join("");

    const sourceRows = (exportMeta.sources || []).map((source) => {
      const client = language === "ru" ? (source.clientRu || source.client) : source.client;
      return `<div class="datamine-header__export-tooltip-row"><span class="datamine-header__export-tooltip-key">${EXPORT_STRINGS.sources[language]}</span><span class="datamine-header__export-tooltip-value">${escapeHtml(client)} — ${escapeHtml(source.branch)}</span></div>`;
    }).join("");

    const globalRow = liveGlobalVersion
      ? `<div class="datamine-header__export-tooltip-row"><span class="datamine-header__export-tooltip-key">${EXPORT_STRINGS.global[language]}</span><span class="datamine-header__export-tooltip-value">${escapeHtml(liveGlobalVersion)}</span></div>`
      : "";

    let updateHtml = "";
    if (liveVersionStatus && liveVersionStatus.updateAvailable && liveGlobalVersion) {
      updateHtml = `
        <div class="datamine-header__export-update-section">
          <span class="datamine-header__export-update-title">${EXPORT_STRINGS.updateAvailable[language]}</span>
          <p class="datamine-header__export-update-text">${EXPORT_STRINGS.updateNotice[language](liveGlobalVersion)}</p>
          <p class="datamine-header__export-update-subtext">${EXPORT_STRINGS.updateHelpText[language]}</p>
          <a class="datamine-header__export-help-link" href="${basePath}contribute/#regular">${EXPORT_STRINGS.howToHelp[language]}</a>
        </div>
      `;
    }

    const formattedExportDate = window.DatamineMeta && typeof window.DatamineMeta.formatSnapshotDate === "function"
      ? window.DatamineMeta.formatSnapshotDate(exportMeta.exportedAt || exportMeta.lastUpdateIso || exportMeta.lastUpdate, language)
      : (exportMeta.lastUpdate || "—");

    const tooltipRows = [
      (exportMeta.exportedAt || exportMeta.lastUpdateIso || exportMeta.lastUpdate)
        ? `<div class="datamine-header__export-tooltip-row"><span class="datamine-header__export-tooltip-key">${EXPORT_STRINGS.updated[language]}</span><span class="datamine-header__export-tooltip-value">${escapeHtml(formattedExportDate)}</span></div>`
        : "",
      sourceRows,
      globalRow
    ].filter(Boolean).join("");

    const tooltipHtml = (tooltipRows || updateHtml)
      ? `<div class="datamine-header__export-tooltip" id="datamine-header-popover" role="region" aria-label="${EXPORT_STRINGS.tooltipTitle[language]}"><span class="datamine-header__export-tooltip-title">${EXPORT_STRINGS.tooltipTitle[language]}</span>${tooltipRows}${updateHtml}</div>`
      : "";

    const ariaTooltip = [
      formattedExportDate !== "—" ? `${EXPORT_STRINGS.updated[language]}: ${formattedExportDate}` : "",
      (exportMeta.sources || []).map((source) => `${language === "ru" ? (source.clientRu || source.client) : source.client}: ${source.branch}`).join(", "),
      liveGlobalVersion ? `${EXPORT_STRINGS.global[language]}: ${liveGlobalVersion}` : ""
    ].filter(Boolean).join(" · ");

    host.innerHTML = `
      <a class="skip-link" href="#${escapeHtml(mainTarget)}">${SKIP_STRINGS[language]}</a>
      <header class="datamine-header">
        <div class="datamine-header__inner">
          <a class="datamine-header__brand" href="${basePath}">${brand[language]}</a>
          <nav class="datamine-header__nav" aria-label="${NAV_STRINGS[language]}">${links}</nav>
          <div class="datamine-header__right-area">
            <div class="datamine-header__language" aria-label="${language === "ru" ? "Переключение языка" : "Language switcher"}">
              <button class="datamine-header__language-button${language === "en" ? " is-active" : ""}" type="button" data-datamine-language="en" aria-pressed="${language === "en"}">EN</button>
              <button class="datamine-header__language-button${language === "ru" ? " is-active" : ""}" type="button" data-datamine-language="ru" aria-pressed="${language === "ru"}">RU</button>
            </div>
            <div class="datamine-header__export-info" data-datamine-export-info tabindex="0" role="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="datamine-header-popover" aria-label="${escapeHtml(ariaTooltip)}">
              <span class="datamine-header__version-badge" data-datamine-field="version">${exportMeta.available ? escapeHtml(exportMeta.version) : (language === "ru" ? "Версия недоступна" : "Version unavailable")}</span>
              <span class="datamine-header__export-client-name">${EXPORT_STRINGS.snapshot[language]}</span>
              ${tooltipHtml}
            </div>
          </div>
        </div>
      </header>`;

    host.querySelector(".skip-link")?.addEventListener("click", (event) => {
      const target = document.getElementById(mainTarget);
      if (!target) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start" });
    });

    if (!hasFetchedExportMeta) {
      fetchExportMeta(basePath);
    }
  }

  function renderAll() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-datamine-header]").forEach(renderHost);
  }

  function setLanguage(nextLanguage, notify = true) {
    const normalized = nextLanguage === "ru" ? "ru" : "en";
    const changed = normalized !== language;
    language = normalized;
    localStorage.setItem(STORAGE_KEY, language);
    writeLanguageCookie(language);
    renderAll();
    if (notify && changed) {
      window.dispatchEvent(new CustomEvent("datamine:language-change", { detail: { language } }));
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-datamine-language]");
    if (button) {
      setLanguage(button.dataset.datamineLanguage);
      return;
    }

    const exportInfo = event.target.closest("[data-datamine-export-info]");
    const allExportInfos = document.querySelectorAll("[data-datamine-export-info]");

    if (exportInfo) {
      // If clicking inside a link inside the tooltip, allow normal link navigation
      if (event.target.closest("a")) return;
      const isOpen = exportInfo.classList.contains("is-open");
      allExportInfos.forEach((el) => {
        el.classList.remove("is-open");
        el.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        exportInfo.classList.add("is-open");
        exportInfo.setAttribute("aria-expanded", "true");
      }
    } else {
      allExportInfos.forEach((el) => {
        el.classList.remove("is-open");
        el.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll("[data-datamine-export-info]").forEach((el) => {
        el.classList.remove("is-open");
        el.setAttribute("aria-expanded", "false");
      });
    }

    if (event.key === "Enter" || event.key === " ") {
      const focusedExport = document.activeElement && document.activeElement.closest("[data-datamine-export-info]");
      if (focusedExport && !document.activeElement.closest("a, button")) {
        event.preventDefault();
        const isOpen = focusedExport.classList.contains("is-open");
        focusedExport.classList.toggle("is-open", !isOpen);
        focusedExport.setAttribute("aria-expanded", String(!isOpen));
      }
    }
  });

  window.DatamineHeader = {
    getLanguage: () => language,
    setLanguage,
    getExportMeta: () => exportMeta,
    getGlobalVersion: () => liveGlobalVersion,
    storageKey: STORAGE_KEY
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderAll();
    }, { once: true });
  } else {
    renderAll();
  }
})();
