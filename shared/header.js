(function () {
  const STORAGE_KEY = "tof-datamine-language";
  const LEGACY_STORAGE_KEYS = ["fce-language", "seq-language", "items-language"];
  const SECTIONS = [
    { id: "oow", href: "oow/", label: { en: "Origin of War", ru: "Истоки войны" } },
    { id: "fce", href: "fce/", label: { en: "FCE", ru: "FCE" } },
    { id: "seq", href: "seq/", label: { en: "Sequential", ru: "Последовательные испытания" } },
    { id: "multype", href: "multype/", label: { en: "Multype", ru: "Multype" } },
    { id: "items", href: "items/", label: { en: "Items", ru: "Предметы" } }
  ];
  const BRANDS = {
    hub: { en: "Datamine Archive", ru: "Архив датамайна" },
    oow: { en: "Origin of War", ru: "Истоки войны" },
    fce: { en: "FCE Boss Mechanics", ru: "Механики боссов FCE" },
    seq: { en: "Sequential Analysis", ru: "Анализ Sequential" },
    multype: { en: "Multype Datamine", ru: "Датамайн Multype" },
    items: { en: "Item Datamine", ru: "Датамайн предметов" }
  };

  const EXPORT_STRINGS = {
    lastUpdate: { en: "Last update", ru: "Last update" },
    version: { en: "Version:", ru: "Версия:" },
    client: { en: "Client:", ru: "Клиент:" }
  };

  let exportMeta = {
    version: "6.3.0",
    clientName: "Korea Dev 2",
    clientNameRu: "Корея Dev 2",
    branch: "TestPC_KR2New",
    lastUpdate: "21.08.2026",
    lastUpdateIso: ""
  };
  let hasFetchedExportMeta = false;

  function resolveInitialLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ru" || stored === "en") return stored;

    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy === "ru" || legacy === "en") {
        localStorage.setItem(STORAGE_KEY, legacy);
        return legacy;
      }
    }
    return "en";
  }

  let language = resolveInitialLanguage();

  function getBasePath(host) {
    return host.dataset.basePath || (host.dataset.current === "hub" ? "./" : "../");
  }

  async function fetchExportMeta(basePath) {
    if (hasFetchedExportMeta) return;
    hasFetchedExportMeta = true;

    try {
      const summaryRes = await fetch(`${basePath}data/datamine-summary.json`);
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (data && data.exportVersion && data.exportVersion.version) {
          exportMeta = Object.assign({}, exportMeta, data.exportVersion);
          renderAll();
          return;
        }
      }
    } catch (e) {}

    try {
      const versionRes = await fetch(`${basePath}data/export-version.json`);
      if (versionRes.ok) {
        const data = await versionRes.json();
        if (data && data.version) {
          exportMeta = Object.assign({}, exportMeta, data);
          renderAll();
        }
      }
    } catch (e) {}
  }

  function renderHost(host) {
    const current = host.dataset.current || "hub";
    const basePath = getBasePath(host);
    const brand = BRANDS[current] || BRANDS.hub;
    const links = SECTIONS.map((section) => {
      const active = section.id === current;
      return `<a class="datamine-header__link${active ? " is-active" : ""}" href="${basePath}${section.href}"${active ? ' aria-current="page"' : ""}>${section.label[language]}</a>`;
    }).join("");

    const clientDisplayName = (language === "ru" && exportMeta.clientNameRu)
      ? exportMeta.clientNameRu
      : (exportMeta.clientName || "Korea Dev 2");

    const dateTitle = exportMeta.lastUpdate ? `Updated: ${exportMeta.lastUpdate}` : "";
    const tooltip = [dateTitle, exportMeta.branch ? `(${exportMeta.branch})` : ""].filter(Boolean).join(" ");

    host.innerHTML = `
      <header class="datamine-header">
        <div class="datamine-header__inner">
          <a class="datamine-header__brand" href="${basePath}">${brand[language]}</a>
          <nav class="datamine-header__nav" aria-label="Datamine sections">${links}</nav>
          <div class="datamine-header__right-area">
            <div class="datamine-header__language" aria-label="${language === "ru" ? "Переключение языка" : "Language switcher"}">
              <button class="datamine-header__language-button${language === "en" ? " is-active" : ""}" type="button" data-datamine-language="en" aria-pressed="${language === "en"}">EN</button>
              <button class="datamine-header__language-button${language === "ru" ? " is-active" : ""}" type="button" data-datamine-language="ru" aria-pressed="${language === "ru"}">RU</button>
            </div>
            <div class="datamine-header__export-info" data-datamine-export-info title="${tooltip}">
              <span class="datamine-header__export-label">${EXPORT_STRINGS.lastUpdate[language]}</span>
              <div class="datamine-header__export-details">
                <div class="datamine-header__export-row">
                  <span class="datamine-header__export-key">${EXPORT_STRINGS.version[language]}</span>
                  <span class="datamine-header__version-badge" data-datamine-field="version">${exportMeta.version || "6.3.0"}</span>
                </div>
                <div class="datamine-header__export-row">
                  <span class="datamine-header__export-key">${EXPORT_STRINGS.client[language]}</span>
                  <strong class="datamine-header__export-client-name" data-datamine-field="clientName">${clientDisplayName}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>`;

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
    renderAll();
    if (notify && changed) {
      window.dispatchEvent(new CustomEvent("datamine:language-change", { detail: { language } }));
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-datamine-language]");
    if (button) setLanguage(button.dataset.datamineLanguage);
  });

  window.DatamineHeader = {
    getLanguage: () => language,
    setLanguage,
    getExportMeta: () => exportMeta,
    storageKey: STORAGE_KEY
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }
})();
