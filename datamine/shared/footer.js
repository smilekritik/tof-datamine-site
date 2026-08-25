(function () {
  const FOOTER_LINKS = [
    {
      key: "about",
      href: "about/",
      external: false
    },
    {
      key: "projects",
      href: "projects/",
      external: false
    },
    {
      key: "contribute",
      href: "contribute/",
      external: false
    },
    {
      key: "privacy",
      href: "privacy/",
      external: false
    },
    {
      key: "changelog",
      href: "changelog/",
      external: false
    },
    {
      key: "github",
      href: "https://github.com/smilekritik/tof-datamine-site",
      external: true
    }
  ];

  const TRANSLATIONS = {
    en: {
      about: "About datamine",
      projects: "TOF resources",
      contribute: "Help update data",
      changelog: "Changelog",
      privacy: "Privacy",
      github: "GitHub",
      navAria: "Datamine information",
      githubAria: "GitHub (opens in a new tab)"
    },
    ru: {
      about: "О Datamine",
      projects: "Ресурсы TOF",
      contribute: "Помочь обновить данные",
      changelog: "История изменений",
      privacy: "Конфиденциальность",
      github: "GitHub",
      navAria: "Информация о Datamine",
      githubAria: "GitHub (откроется в новой вкладке)"
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

  function getBasePath(host) {
    if (host && host.dataset.basePath) return host.dataset.basePath;
    const path = window.location.pathname;
    if (path.endsWith("/datamine/") || path.endsWith("/datamine/index.html") || path === "/datamine") {
      return "./";
    }
    return "../";
  }

  function renderFooter(host) {
    if (!host) return;

    const lang = getLanguage();
    const basePath = getBasePath(host);
    const year = new Date().getFullYear();
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    const linksHtml = FOOTER_LINKS.map((link) => {
      const label = t[link.key] || link.key;
      const targetUrl = link.external ? link.href : `${basePath}${link.href}`;
      const targetAttr = link.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const ariaAttr = link.external ? ` aria-label="${t.githubAria}"` : "";
      return `<a class="datamine-footer__link" href="${targetUrl}"${targetAttr}${ariaAttr}>${label}</a>`;
    }).join("");

    host.innerHTML = `
      <div class="datamine-footer__inner">
        <span class="datamine-footer__copyright">© <span data-footer-year>${year}</span> smilekritik</span>
        <nav class="datamine-footer__nav" aria-label="${t.navAria}">
          ${linksHtml}
        </nav>
      </div>
    `;

    host.dataset.footerReady = "true";
  }

  function renderAll() {
    const hosts = document.querySelectorAll("[data-datamine-footer]");
    if (!hosts.length) return;
    hosts.forEach(renderFooter);
  }

  window.addEventListener("datamine:language-change", renderAll);
  window.addEventListener("datamine:languagechange", renderAll);

  window.DatamineFooter = {
    renderAll,
    getLinks: () => FOOTER_LINKS,
    getTranslations: () => TRANSLATIONS
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }
})();
