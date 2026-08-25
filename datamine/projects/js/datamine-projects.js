(function () {
  const PROJECTS_STRINGS = {
    en: {
      metaTitle: "Tower of Fantasy Resources — TOF Datamine",
      metaDesc: "Databases, wikis, spreadsheets, calculators and community tools for Tower of Fantasy.",
      heroEyebrow: "RESOURCES",
      heroTitle: "Useful Tower of Fantasy resources",
      heroSubtitle: "Databases, wikis, spreadsheets, calculators and community tools for Tower of Fantasy.",
      directoryAria: "Tower of Fantasy resources directory",
      resourceCount: (n) => `${n} ${n === 1 ? "item" : "items"}`
    },
    ru: {
      metaTitle: "Ресурсы Tower of Fantasy — TOF Datamine",
      metaDesc: "Базы данных, вики, таблицы, калькуляторы и инструменты сообщества по Tower of Fantasy.",
      heroEyebrow: "РЕСУРСЫ",
      heroTitle: "Полезные ресурсы Tower of Fantasy",
      heroSubtitle: "Базы данных, вики, таблицы, калькуляторы и инструменты сообщества по Tower of Fantasy.",
      directoryAria: "Каталог ресурсов Tower of Fantasy",
      resourceCount: (n) => `${n} ${n === 1 ? "ресурс" : (n >= 2 && n <= 4 ? "ресурса" : "ресурсов")}`
    }
  };

  function getLanguage() {
    if (window.DatamineHeader && typeof window.DatamineHeader.getLanguage === "function") {
      return window.DatamineHeader.getLanguage();
    }
    const cookie = document.cookie.split("; ").find((row) => row.startsWith("tof-datamine-language="));
    if (cookie) {
      const val = cookie.split("=")[1];
      if (val === "ru" || val === "en") return val;
    }
    const stored = localStorage.getItem("tof-datamine-language");
    if (stored === "ru" || stored === "en") return stored;
    return document.documentElement.lang === "ru" ? "ru" : "en";
  }

  function renderResourceRow(res, lang) {
    const desc = res.description ? (res.description[lang] || res.description.en || "") : "";
    const targetAttr = res.isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
    const typeClass = res.type ? res.type.toLowerCase() : "web";
    const authorHtml = res.author ? `<span class="resource-row__author">${res.author}</span>` : "";

    return `
      <a class="resource-row" href="${res.url}"${targetAttr}>
        <div class="resource-row__header">
          <div class="resource-row__title-group">
            <span class="resource-row__name">${res.name}</span>
            ${authorHtml}
          </div>
          <div class="resource-row__meta">
            <span class="resource-type-badge resource-type-badge--${typeClass}">${res.type || "Web"}</span>
            <span class="resource-row__arrow" aria-hidden="true">↗</span>
          </div>
        </div>
        ${desc ? `<p class="resource-row__desc">${desc}</p>` : ""}
        <div class="resource-row__footer">
          <span class="resource-row__host">${res.displayUrl || ""}</span>
        </div>
      </a>
    `;
  }

  function renderCategoryCard(cat, lang, t) {
    const catTitle = cat.title ? (cat.title[lang] || cat.title.en || "") : "";
    const resources = cat.resources || [];
    const countText = t.resourceCount(resources.length);

    return `
      <article class="resource-category-card" style="--cat-accent: ${cat.color || "var(--dm-gold)"};">
        <div class="resource-category-card__header">
          <div class="resource-category-card__title-row">
            <span class="resource-category-card__indicator" aria-hidden="true"></span>
            <h2 class="resource-category-card__title">${catTitle}</h2>
          </div>
          <span class="resource-category-card__count">${countText}</span>
        </div>
        <div class="resource-category-card__list">
          ${resources.map((r) => renderResourceRow(r, lang)).join("")}
        </div>
      </article>
    `;
  }

  function renderProjectsPage() {
    const lang = getLanguage();
    const t = PROJECTS_STRINGS[lang] || PROJECTS_STRINGS.en;
    const categories = window.TOF_RESOURCES_DATA || [];

    document.title = t.metaTitle;
    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) metaDescTag.setAttribute("content", t.metaDesc);

    const root = document.querySelector("[data-projects-app]");
    if (!root) return;

    root.innerHTML = `
      <!-- Hero -->
      <section class="projects-hero">
        <p class="projects-hero__eyebrow">${t.heroEyebrow}</p>
        <h1 class="projects-hero__title">${t.heroTitle}</h1>
        <p class="projects-hero__subtitle">${t.heroSubtitle}</p>
      </section>

      <!-- Resource Categories Grid -->
      <section class="resources-grid" aria-label="${t.directoryAria}">
        ${categories.map((cat) => renderCategoryCard(cat, lang, t)).join("")}
      </section>
    `;
  }

  window.addEventListener("datamine:language-change", () => {
    renderProjectsPage();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderProjectsPage, { once: true });
  } else {
    renderProjectsPage();
  }
})();
