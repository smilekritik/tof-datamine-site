(function (root) {
  const DATAMINE_ROUTES = {
    home: "index.html",
    oow: "oow/",
    fce: "fce/",
    seq: "seq/",
    multype: "multype/",
    items: "items/",
    about: "about/",
    contribute: "contribute/",
    projects: "projects/",
    privacy: "privacy/",
    changelog: "changelog/"
  };

  const PROJECT_LINKS = {
    siteGithub: "https://github.com/smilekritik/tof-datamine-site",
    scannerGithub: "https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner",
    fastExporterGithub: "https://github.com/smilekritik/tof-datamine-site/tree/main/tof-fast-datamine"
  };

  // Centralized contact configuration. Only non-empty configured contacts are displayed in UI.
  const CONTACTS = {
    discord: "",
    telegram: "",
    githubIssues: "https://github.com/smilekritik/tof-datamine-site/issues"
  };

  function getConfiguredContacts() {
    const list = [];
    if (CONTACTS.discord && CONTACTS.discord.trim()) {
      list.push({ key: "discord", label: "Discord", url: CONTACTS.discord.trim() });
    }
    if (CONTACTS.telegram && CONTACTS.telegram.trim()) {
      list.push({ key: "telegram", label: "Telegram", url: CONTACTS.telegram.trim() });
    }
    if (CONTACTS.githubIssues && CONTACTS.githubIssues.trim()) {
      list.push({ key: "github", label: "GitHub Issues", url: CONTACTS.githubIssues.trim() });
    }
    return list;
  }

  function getBasePath(hostElement) {
    if (hostElement && hostElement.dataset && hostElement.dataset.basePath) {
      return hostElement.dataset.basePath;
    }
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.endsWith("/datamine/") || path.endsWith("/datamine/index.html") || path === "/datamine") {
        return "./";
      }
    }
    return "../";
  }

  function resolveRouteUrl(routeKey, basePath = "./") {
    const route = DATAMINE_ROUTES[routeKey];
    if (!route) return basePath;
    return `${basePath}${route}`;
  }

  const DatamineSiteConfig = {
    DATAMINE_ROUTES,
    PROJECT_LINKS,
    CONTACTS,
    getConfiguredContacts,
    getBasePath,
    resolveRouteUrl
  };

  root.DatamineSiteConfig = DatamineSiteConfig;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DatamineSiteConfig;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
