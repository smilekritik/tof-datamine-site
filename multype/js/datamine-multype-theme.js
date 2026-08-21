(function () {
  const COOKIE_NAME = "tof-multype-theme";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const labels = {
    en: {
      group: "Table color theme",
      themeLabel: "Table palette",
      light: "Light",
      dark: "Dark",
      version: "Dataset version",
      versionUnavailable: "Version information is unavailable"
    },
    ru: {
      group: "Цветовая тема таблицы",
      themeLabel: "Палитра таблицы",
      light: "Светлая",
      dark: "Тёмная",
      version: "Версия данных",
      versionUnavailable: "Информация о версии недоступна"
    }
  };
  let versionText = "";

  function getTheme() {
    return document.documentElement.dataset.multypeTheme === "dark" ? "dark" : "light";
  }

  function saveTheme(theme) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${theme}; Max-Age=${COOKIE_MAX_AGE}; Path=/datamine/multype/; SameSite=Lax${secure}`;
  }

  function renderSwitch() {
    const theme = getTheme();
    const language = document.documentElement.lang === "ru" ? "ru" : "en";
    const copy = labels[language];
    const control = document.querySelector("[data-multype-theme-switch]");
    const controlLabel = document.querySelector("[data-multype-theme-label]");
    if (controlLabel) controlLabel.textContent = copy.themeLabel;
    if (control) {
      control.setAttribute("aria-label", copy.group);
      control.querySelectorAll("[data-multype-theme-value]").forEach((button) => {
        const value = button.dataset.multypeThemeValue;
        const active = value === theme;
        const buttonLabel = button.querySelector("[data-multype-theme-button-label]");
        if (buttonLabel) buttonLabel.textContent = copy[value];
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    const versionLabel = document.querySelector("[data-multype-version-label]");
    const versionNode = document.querySelector("[data-multype-version]");
    if (versionLabel) versionLabel.textContent = copy.version;
    if (versionNode) versionNode.textContent = versionText || copy.versionUnavailable;
  }

  async function loadVersion() {
    try {
      const response = await fetch("./data/version.txt");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      versionText = (await response.text()).trim();
    } catch {
      versionText = "";
    }
    renderSwitch();
  }

  function setTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.multypeTheme = normalized;
    saveTheme(normalized);
    renderSwitch();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-multype-theme-value]");
    if (button) setTheme(button.dataset.multypeThemeValue);
  });

  window.addEventListener("datamine:language-change", renderSwitch);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderSwitch();
      loadVersion();
    }, { once: true });
  } else {
    renderSwitch();
    loadVersion();
  }
})();
