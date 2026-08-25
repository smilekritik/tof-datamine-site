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
      versionUnavailable: "Version information is unavailable",
      popoverTitle: "Dataset details",
      datasetKey: "Dataset",
      globalKey: "Global",
      updateAvailable: "Update available",
      updateNotice: (v) => `Global ${v} is newer than this Multype dataset.`,
      updateDesc: "Refreshing Multype requires a full game export and a large-scale modifier scan.",
      timeWarning: "~10 hours required",
      howToHelp: "How to help →"
    },
    ru: {
      group: "Цветовая тема таблицы",
      themeLabel: "Палитра таблицы",
      light: "Светлая",
      dark: "Тёмная",
      version: "Версия данных",
      versionUnavailable: "Информация о версии недоступна",
      popoverTitle: "Сведения о наборе данных",
      datasetKey: "Датасет",
      globalKey: "Global",
      updateAvailable: "Доступно обновление",
      updateNotice: (v) => `Global ${v} новее этого набора данных Multype.`,
      updateDesc: "Обновление Multype требует полного экспорта игры и масштабного сканирования модификаторов.",
      timeWarning: "Требуется ~10 часов",
      howToHelp: "Как помочь →"
    }
  };
  let versionText = "";
  let liveGlobalVersion = null;
  let liveStatus = null;

  function getTheme() {
    return document.documentElement.dataset.multypeTheme === "dark" ? "dark" : "light";
  }

  function saveTheme(theme) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${theme}; Max-Age=${COOKIE_MAX_AGE}; Path=/datamine/multype/; SameSite=Lax${secure}`;
  }

  function escapeHtml(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    const versionCard = document.querySelector(".multype-version-card");

    if (versionLabel) versionLabel.textContent = copy.version;
    if (versionNode) versionNode.textContent = versionText || copy.versionUnavailable;

    if (versionCard) {
      // Setup accessible attributes
      versionCard.setAttribute("tabindex", "0");
      versionCard.setAttribute("role", "button");
      versionCard.setAttribute("aria-haspopup", "dialog");
      if (!versionCard.hasAttribute("aria-expanded")) {
        versionCard.setAttribute("aria-expanded", "false");
      }

      // Check if popover container exists
      let popover = versionCard.querySelector(".multype-version-popover");
      if (!popover) {
        popover = document.createElement("div");
        popover.className = "multype-version-popover";
        popover.id = "multype-version-popover";
        popover.setAttribute("role", "region");
        versionCard.appendChild(popover);
      }

      const cleanDatasetVersion = versionText ? versionText.replace(/^v/i, "").split(" ")[0] : "";
      const globalRow = liveGlobalVersion
        ? `<div class="multype-version-popover__row"><span class="multype-version-popover__key">${copy.globalKey}</span><span class="multype-version-popover__value">${escapeHtml(liveGlobalVersion)}</span></div>`
        : "";

      let updateHtml = "";
      if (liveStatus && liveStatus.updateAvailable && liveGlobalVersion) {
        updateHtml = `
          <div class="multype-version-popover__update-section">
            <span class="multype-version-popover__update-title">${copy.updateAvailable}</span>
            <p class="multype-version-popover__update-text">${copy.updateNotice(liveGlobalVersion)}</p>
            <p class="multype-version-popover__update-desc">${copy.updateDesc}</p>
            <div class="multype-version-popover__time-badge">${copy.timeWarning}</div>
            <a class="multype-version-popover__help-link" href="../contribute/#multype">${copy.howToHelp}</a>
          </div>
        `;
      }

      const rowsHtml = `
        <div class="multype-version-popover__row">
          <span class="multype-version-popover__key">${copy.datasetKey}</span>
          <span class="multype-version-popover__value">${escapeHtml(cleanDatasetVersion || versionText || "—")}</span>
        </div>
        ${globalRow}
      `;

      popover.innerHTML = `
        <span class="multype-version-popover__title">${copy.popoverTitle}</span>
        ${rowsHtml}
        ${updateHtml}
      `;
    }
  }

  async function checkLiveStatus() {
    if (window.DatamineVersionStatus && typeof window.DatamineVersionStatus.getStatus === "function") {
      try {
        const res = await window.DatamineVersionStatus.getStatus(versionText);
        if (res) {
          liveGlobalVersion = res.globalVersion;
          liveStatus = res;
          renderSwitch();
        }
      } catch (err) {}
    }
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
    checkLiveStatus();
  }

  function setTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.multypeTheme = normalized;
    saveTheme(normalized);
    renderSwitch();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-multype-theme-value]");
    if (button) {
      setTheme(button.dataset.multypeThemeValue);
      return;
    }

    const versionCard = event.target.closest(".multype-version-card");
    const allCards = document.querySelectorAll(".multype-version-card");

    if (versionCard) {
      if (event.target.closest("a")) return;
      const isOpen = versionCard.classList.contains("is-open");
      allCards.forEach((c) => {
        c.classList.remove("is-open");
        c.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        versionCard.classList.add("is-open");
        versionCard.setAttribute("aria-expanded", "true");
      }
    } else {
      allCards.forEach((c) => {
        c.classList.remove("is-open");
        c.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".multype-version-card").forEach((c) => {
        c.classList.remove("is-open");
        c.setAttribute("aria-expanded", "false");
      });
    }

    if (event.key === "Enter" || event.key === " ") {
      const focusedCard = document.activeElement && document.activeElement.closest(".multype-version-card");
      if (focusedCard && !document.activeElement.closest("a, button")) {
        event.preventDefault();
        const isOpen = focusedCard.classList.contains("is-open");
        focusedCard.classList.toggle("is-open", !isOpen);
        focusedCard.setAttribute("aria-expanded", String(!isOpen));
      }
    }
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
