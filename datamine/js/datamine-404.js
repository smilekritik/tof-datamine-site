(function () {
  "use strict";

  const COPY = {
    en: {
      pageTitle: "Page not found — TOF Datamine Archive",
      badge: "SECTOR ERROR // 404_DATA_CORRUPTED",
      title: "Page not found",
      desc: "The requested coordinate or resource does not exist in the current Datamine archive. It may have been relocated across game client versions, or the link may be outdated.",
      telemetryTitle: "DIAGNOSTIC TELEMETRY",
      telemetryPath: "REQUEST_URI",
      telemetryStatus: "STATUS_CODE",
      telemetryStatusVal: "404 Not Found (UNRESOLVED_RECORD)",
      telemetryDataset: "DATASET_VERSION",
      telemetryTime: "TIMESTAMP_UTC",
      telemetryLoading: "Connecting to archive...",
      returnHub: "Return to Datamine Archive",
      goBack: "Go Back to Previous Page",
      searchPlaceholder: "Quick search datasets (e.g. OOW, Bosses, Sequential, Items, Multype)...",
      searchAria: "Quick search Datamine datasets",
      searchFound: (count) => `Showing ${count} matching dataset${count === 1 ? "" : "s"}:`,
      searchNotFound: "No matching dataset sectors found. Browse the available sections below:",
      sectorsEyebrow: "ARCHIVE SECTORS",
      sectorsTitle: "Active Datamine Datasets",
      docsTitle: "DOCUMENTATION & PIPELINE",
      aboutLink: "About Data Pipeline & Extraction",
      contributeLink: "How to Help Update Data",
      projectsLink: "TOF Community Resources & Wikis",
      changelogLink: "Changelog & Updates",
      cards: {
        oow: {
          title: "Origin of War",
          desc: "Enemy stats, floor health, wave distribution, defenses and seasonal scaling schedules.",
          path: "/datamine/oow/"
        },
        fce: {
          title: "Boss Mechanics (FCE)",
          desc: "Combat cards, boss phases, skill behaviors, and visual reference guides.",
          path: "/datamine/fce/"
        },
        seq: {
          title: "Sequential Analysis",
          desc: "Sequential Phantasm floor HP scaling, effective health formulas, and Global progression cutoff.",
          path: "/datamine/seq/"
        },
        multype: {
          title: "Multiplicative Buffs",
          desc: "Additive vs multiplicative category classifications and weapon modifier matrices.",
          path: "/datamine/multype/"
        },
        items: {
          title: "Item Identifiers",
          desc: "Searchable table of item IDs, internal resource keys, and English/Russian display names.",
          path: "/datamine/items/"
        },
        hub: {
          title: "Datamine Archive Hub",
          desc: "Return to the main datamine entrance with live dataset statistics and season overview.",
          path: "/datamine/"
        }
      }
    },
    ru: {
      pageTitle: "Страница не найдена — Архив TOF Datamine",
      badge: "ОШИБКА СЕКТОРА // 404_ДАННЫЕ_НЕ_НАЙДЕНЫ",
      title: "Страница не найдена",
      desc: "Запрошенная координата или ресурс отсутствует в текущем архиве датамайна. Возможно, страница была перемещена в новых версиях игры или удалена при обработке данных.",
      telemetryTitle: "ДИАГНОСТИЧЕСКАЯ ТЕЛЕМЕТРИЯ",
      telemetryPath: "ЗАПРОШЕННЫЙ_URI",
      telemetryStatus: "КОД_ОТВЕТА",
      telemetryStatusVal: "404 Not Found (ЗАПИСЬ_НЕ_НАЙДЕНА)",
      telemetryDataset: "ВЕРСИЯ_ДАТАСЕТА",
      telemetryTime: "ВРЕМЯ_UTC",
      telemetryLoading: "Подключение к архиву...",
      returnHub: "Вернуться в архив Datamine",
      goBack: "Вернуться назад",
      searchPlaceholder: "Быстрый поиск по датамайну (напр. Истоки, Боссы, Предметы)...",
      searchAria: "Быстрый поиск по разделам датамайна",
      searchFound: (count) => `Найдено разделов: ${count}`,
      searchNotFound: "Совпадений не найдено. Выберите один из разделов ниже:",
      sectorsEyebrow: "РАЗДЕЛЫ АРХИВА",
      sectorsTitle: "Актуальные наборы данных",
      docsTitle: "ДОКУМЕНТАЦИЯ И ПАЙПЛАЙН",
      aboutLink: "О пайплайне и источниках данных",
      contributeLink: "Как помочь обновить данные",
      projectsLink: "Ресурсы сообщества и калькуляторы",
      changelogLink: "История изменений",
      cards: {
        oow: {
          title: "Истоки войны",
          desc: "Характеристики врагов, здоровье этажей, распределение волн, защита и расписание сезонов.",
          path: "/datamine/oow/"
        },
        fce: {
          title: "Механики боссов (FCE)",
          desc: "Боевые карточки FCE, фазы боссов, механики умений и наглядные руководства.",
          path: "/datamine/fce/"
        },
        seq: {
          title: "Последовательный бой",
          desc: "Здоровье боссов в Sequential, эффективное HP и порог доступных этажей.",
          path: "/datamine/seq/"
        },
        multype: {
          title: "Мультипликативные усиления",
          desc: "Группировка аддитивных и мультипликативных усилений, матрица взаимосвязей.",
          path: "/datamine/multype/"
        },
        items: {
          title: "Идентификаторы предметов",
          desc: "Таблица идентификаторов предметов, внутренних ключей и названий на русском и английском.",
          path: "/datamine/items/"
        },
        hub: {
          title: "Главный архив Datamine",
          desc: "Вернуться на главную страницу датамайна со статистикой и обзором сезонов.",
          path: "/datamine/"
        }
      }
    }
  };

  const state = {
    language: resolveLanguage(),
    datasetVersion: null
  };

  function resolveLanguage() {
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

  function getUtcTimestamp() {
    const now = new Date();
    return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  }

  function renderTelemetry() {
    const strings = COPY[state.language];
    const pathEl = document.getElementById("telemetry-path");
    const statusValEl = document.getElementById("telemetry-status-val");
    const versionEl = document.getElementById("telemetry-version");
    const timeEl = document.getElementById("telemetry-time");

    if (pathEl) {
      pathEl.textContent = window.location.pathname || "/datamine/404.html";
    }
    if (statusValEl) {
      statusValEl.textContent = strings.telemetryStatusVal;
    }
    if (timeEl) {
      timeEl.textContent = getUtcTimestamp();
    }
    if (versionEl) {
      if (state.datasetVersion) {
        versionEl.textContent = state.datasetVersion;
      } else {
        versionEl.textContent = strings.telemetryLoading;
      }
    }
  }

  async function loadDatasetVersion() {
    if (window.DatamineMeta && typeof window.DatamineMeta.get === "function") {
      try {
        const meta = await window.DatamineMeta.get("/datamine/");
        if (meta && meta.version) {
          state.datasetVersion = meta.version;
          const versionEl = document.getElementById("telemetry-version");
          if (versionEl) versionEl.textContent = meta.version;
        }
      } catch (err) {
        // Fallback to placeholder if metadata unavailable
      }
    }
  }

  function applyLanguage() {
    const strings = COPY[state.language];
    document.documentElement.lang = state.language;
    document.title = strings.pageTitle;

    document.querySelectorAll("[data-404-copy]").forEach((el) => {
      const key = el.dataset["404Copy"];
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });

    const searchInput = document.getElementById("error-404-search");
    if (searchInput) {
      searchInput.setAttribute("placeholder", strings.searchPlaceholder);
      searchInput.setAttribute("aria-label", strings.searchAria);
    }

    // Update cards
    document.querySelectorAll("[data-404-card]").forEach((cardEl) => {
      const cardKey = cardEl.dataset["404Card"];
      const cardData = strings.cards[cardKey];
      if (cardData) {
        const titleEl = cardEl.querySelector(".error-404-card__title");
        const bodyEl = cardEl.querySelector(".error-404-card__body");
        if (titleEl) titleEl.textContent = cardData.title;
        if (bodyEl) bodyEl.textContent = cardData.desc;
      }
    });

    renderTelemetry();
    filterCards();
  }

  function initHistoryBack() {
    const backBtn = document.getElementById("btn-history-back");
    if (!backBtn) return;

    backBtn.addEventListener("click", () => {
      try {
        if (document.referrer && new URL(document.referrer, window.location.origin).origin === window.location.origin) {
          window.history.back();
          return;
        }
      } catch (e) {
        // fallback to /datamine/
      }
      window.location.href = "/datamine/";
    });
  }

  function filterCards() {
    const searchInput = document.getElementById("error-404-search");
    const statusEl = document.getElementById("error-404-search-status");
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    const strings = COPY[state.language];
    const cards = Array.from(document.querySelectorAll("[data-404-card]"));

    if (!query) {
      cards.forEach((card) => card.classList.remove("is-hidden"));
      if (statusEl) statusEl.textContent = "";
      return;
    }

    let matchCount = 0;
    cards.forEach((card) => {
      const cardKey = card.dataset["404Card"];
      const cardDataEn = COPY.en.cards[cardKey] || {};
      const cardDataRu = COPY.ru.cards[cardKey] || {};
      const searchTerms = [
        cardKey,
        cardDataEn.title,
        cardDataEn.desc,
        cardDataRu.title,
        cardDataRu.desc,
        card.textContent
      ].join(" ").toLowerCase();

      const isMatch = query.split(/\s+/).every((word) => searchTerms.includes(word));
      if (isMatch) {
        card.classList.remove("is-hidden");
        matchCount += 1;
      } else {
        card.classList.add("is-hidden");
      }
    });

    if (statusEl) {
      statusEl.textContent = matchCount > 0 ? strings.searchFound(matchCount) : strings.searchNotFound;
    }
  }

  function initSearch() {
    const searchInput = document.getElementById("error-404-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", filterCards);

    // Global shortcut: '/' focuses search
    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        filterCards();
        searchInput.blur();
      }
    });
  }

  function init() {
    state.language = resolveLanguage();
    applyLanguage();
    initHistoryBack();
    initSearch();
    loadDatasetVersion();

    window.addEventListener("datamine:language-change", (event) => {
      state.language = event.detail?.language === "ru" ? "ru" : "en";
      applyLanguage();
    });

    window.addEventListener("datamine:languagechange", (event) => {
      state.language = event.detail?.language === "ru" ? "ru" : "en";
      applyLanguage();
    });

    if (window.DatamineI18n && typeof window.DatamineI18n.subscribe === "function") {
      window.DatamineI18n.subscribe((newLang) => {
        state.language = newLang === "ru" ? "ru" : "en";
        applyLanguage();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
