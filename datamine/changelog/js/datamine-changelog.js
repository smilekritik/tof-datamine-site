(function () {
  const CHANGELOG_STRINGS = {
    en: {
      metaTitle: "Changelog & Data Freshness — TOF Datamine",
      metaDesc: "Changelog and dataset status for TOF Datamine — track game patch updates, scaling shifts, boss mechanics, and research snapshots.",
      heroEyebrow: "DATASET HISTORY",
      heroTitle: "Changelog & Data Freshness",
      heroSubtitle: "Track game patch updates, dataset rebuilds, formula adjustments, and research snapshots.",

      statusTitle: "Current Dataset Freshness",
      snapshotLabel: "Dataset snapshot",
      exportedLabel: "Exported",
      sourcesLabel: "Sources",
      unavailable: "Unavailable",
      historyTitle: "Update History",
      tagGame: "DATA",
      tagCalc: "PIPELINE",
      tagCurated: "SITE",
      tagResearch: "FIX"
    },
    ru: {
      metaTitle: "История обновлений и статус данных — TOF Datamine",
      metaDesc: "История обновлений TOF Datamine: игровые патчи, изменения масштабирования, механики боссов и снимки исследований.",
      heroEyebrow: "ИСТОРИЯ ДАТАСЕТОВ",
      heroTitle: "История обновлений и актуальность",
      heroSubtitle: "Отслеживание обновлений патчей игры, пересборки данных, корректировок формул и снимков исследований.",

      statusTitle: "Текущий статус наборов данных",
      snapshotLabel: "Снимок Datamine",
      exportedLabel: "Экспортирован",
      sourcesLabel: "Источники",
      unavailable: "Недоступно",
      historyTitle: "История обновлений",
      tagGame: "DATA",
      tagCalc: "PIPELINE",
      tagCurated: "SITE",
      tagResearch: "FIX"
    }
  };

  function getLanguage() {
    if (window.DatamineI18n && typeof window.DatamineI18n.getLanguage === "function") {
      return window.DatamineI18n.getLanguage();
    }
    if (window.DatamineHeader && typeof window.DatamineHeader.getLanguage === "function") {
      return window.DatamineHeader.getLanguage();
    }
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("tof-datamine-language="));
    if (cookie) {
      const val = cookie.split("=")[1];
      if (val === "ru" || val === "en") return val;
    }
    const stored = localStorage.getItem("tof-datamine-language");
    if (stored === "ru" || stored === "en") return stored;
    return document.documentElement.lang === "ru" ? "ru" : "en";
  }

  function renderChangelogPage() {
    const lang = getLanguage();
    const t = CHANGELOG_STRINGS[lang] || CHANGELOG_STRINGS.en;
    const history = window.CHANGELOG_DATA || [];
    const meta = window.DatamineMeta?.getSync?.() || { version: "unavailable", sources: [], available: false, lastUpdate: "—" };
    const currentVersion = meta.available ? meta.version : t.unavailable;

    document.title = t.metaTitle;
    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) metaDescTag.setAttribute("content", t.metaDesc);

    const root = document.querySelector("[data-changelog-app]");
    if (!root) return;

    const formattedExportDate = window.DatamineMeta && typeof window.DatamineMeta.formatSnapshotDate === "function"
      ? window.DatamineMeta.formatSnapshotDate(meta.exportedAt || meta.lastUpdateIso || meta.lastUpdate, lang)
      : (meta.lastUpdate || t.unavailable);

    const sources = (meta.sources || []).map((source) => `${lang === "ru" ? (source.clientRu || source.client) : source.client} — ${source.branch}`).join("; ") || t.unavailable;
    const statusGridHtml = `
          <div class="changelog-status-card">
            <span class="changelog-status-card__name">${t.snapshotLabel}</span>
            <div class="changelog-status-card__meta">
              <span class="changelog-status-card__ver">${currentVersion}</span>
              <span class="changelog-status-card__badge">${t.exportedLabel}: ${formattedExportDate}</span>
            </div>
            <span class="changelog-status-card__name">${t.sourcesLabel}: ${sources}</span>
          </div>
        `;

    const historyHtml = history
      .map((entry) => {
        const clientLabel = lang === "ru" ? entry.clientRu : entry.client;
        const summaryText = entry.summary[lang] || entry.summary.en;

        const changesListHtml = entry.changes
          .map((ch) => {
            const changeText = ch.text[lang] || ch.text.en;
            return `
              <li class="changelog-item">
                <span class="changelog-item__section">${ch.section}</span>
                <span class="changelog-item__tag changelog-item__tag--${ch.tag.toLowerCase().replace(/\s+/g, '-')}">${ch.tag}</span>
                <span class="changelog-item__text">${changeText}</span>
              </li>
            `;
          })
          .join("");

        return `
          <article class="changelog-release">
            <header class="changelog-release__header">
              <div class="changelog-release__title-row">
                <h3 class="changelog-release__version">v${entry.version}</h3>
                <span class="changelog-release__date">${entry.date}</span>
                <span class="changelog-release__client">${clientLabel}</span>
              </div>
              <p class="changelog-release__summary">${summaryText}</p>
            </header>
            <ul class="changelog-list">
              ${changesListHtml}
            </ul>
          </article>
        `;
      })
      .join("");

    root.innerHTML = `
      <div class="changelog-container">
        <!-- Hero -->
        <header class="changelog-hero">
          <p class="changelog-hero__eyebrow">${t.heroEyebrow}</p>
          <h1 class="changelog-hero__title">${t.heroTitle}</h1>
          <p class="changelog-hero__subtitle">${t.heroSubtitle}</p>
        </header>

        <!-- Current Freshness Summary -->
        <section class="changelog-section">
          <div class="changelog-section__header">
            <h2 class="changelog-section__title">${t.statusTitle}</h2>
          </div>
          <div class="changelog-status-grid">
            ${statusGridHtml}
          </div>
        </section>

        <!-- Release Timeline History -->
        <section class="changelog-section">
          <div class="changelog-section__header">
            <h2 class="changelog-section__title">${t.historyTitle}</h2>
          </div>
          <div class="changelog-history">
            ${historyHtml}
          </div>
        </section>
      </div>
    `;
  }

  window.addEventListener("datamine:language-change", renderChangelogPage);
  window.addEventListener("datamine:languagechange", renderChangelogPage);
  window.addEventListener("datamine:meta-loaded", renderChangelogPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderChangelogPage, { once: true });
  } else {
    renderChangelogPage();
  }
})();
