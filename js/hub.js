(function () {
  const copy = {
    en: {
      title: "Tower of Fantasy data workspace",
      subtitle: "Choose a dataset. Every section keeps its own tools while sharing one navigation and visual language.",
      oowTitle: "Enemy stats & seasonal scaling",
      oowBody: "Floor health, enemies, waves, defenses, drops, and difficulty schedules for every available season.",
      fceTitle: "Boss mechanics",
      fceBody: "Visual boss guides with concise mechanic notes, language switching, and image export.",
      seqTitle: "Boss scaling charts",
      seqBody: "Datamined monster stats, raw and effective health charts, and floor-to-floor growth.",
      multypeTitle: "Buff categories",
      multypeBody: "Search renamed and original buff keys, inspect additive groups, and compare multiplicative columns.",
      itemsTitle: "Item identifiers",
      itemsBody: "Search item IDs, original developer names, and translated labels in a compact data table.",
      openPage: "Open page",
      openOow: "Open Origin of War",
      seasonsLoading: "Loading seasons...",
      latestAvailable: "Latest available",
      seasons: "seasons",
      bosses: "bosses",
      floors: "floors",
      buffs: "buffs",
      items: "items",
      footer: "Tower of Fantasy datamine archive",
      loading: "Loading"
    },
    ru: {
      title: "Рабочая область данных Tower of Fantasy",
      subtitle: "Выберите набор данных. Каждый раздел сохраняет собственные инструменты, общую навигацию и единый визуальный язык.",
      oowTitle: "Характеристики врагов и рост по сезонам",
      oowBody: "Здоровье этажей, противники, волны, защита, награды и расписание сложности для всех доступных сезонов.",
      fceTitle: "Механики боссов",
      fceBody: "Наглядные карточки боссов с краткими механиками, переключением языка и экспортом изображения.",
      seqTitle: "Графики роста боссов",
      seqBody: "Характеристики монстров из данных игры, графики обычного и эффективного здоровья и рост между этажами.",
      multypeTitle: "Категории усилений",
      multypeBody: "Поиск исходных и переименованных ключей, группы сложения и столбцы перемножения.",
      itemsTitle: "Идентификаторы предметов",
      itemsBody: "Поиск ID предметов, исходных названий разработчиков и переводов в компактной таблице.",
      openPage: "Открыть раздел",
      openOow: "Открыть Истоки войны",
      seasonsLoading: "Загрузка сезонов...",
      latestAvailable: "Последний доступный",
      seasons: "сезонов",
      bosses: "боссов",
      floors: "этажей",
      buffs: "усилений",
      items: "предметов",
      footer: "Архив датамайна Tower of Fantasy",
      loading: "Загрузка"
    }
  };

  const state = {
    language: window.DatamineHeader?.getLanguage() === "ru" ? "ru" : "en",
    seasons: [],
    stats: {}
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    hydrateHubStats();
    window.addEventListener("datamine:language-change", (event) => {
      state.language = event.detail?.language === "ru" ? "ru" : "en";
      applyLanguage();
    });
  });

  function applyLanguage() {
    const strings = copy[state.language];
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-hub-copy]").forEach((element) => {
      element.textContent = strings[element.dataset.hubCopy] || element.textContent;
    });
    renderStats();
    renderSeasons();
  }

  async function hydrateHubStats() {
    try {
      const summary = await fetchJson("./data/datamine-summary.json");
      state.seasons = Array.isArray(summary?.oow?.seasons)
        ? summary.oow.seasons.slice().sort((a, b) => Number(a.season) - Number(b.season))
        : [];
      state.stats = {
        oow: Number(summary?.oow?.seasonCount || state.seasons.length),
        fce: Number(summary?.fce?.bossCount || 0),
        seq: Number(summary?.sequential?.floorCount || 0),
        multype: Number(summary?.multype?.buffCount || 0),
        items: Number(summary?.items?.itemCount || 0)
      };
      renderStats();
      renderSeasons();
    } catch (error) {
      document.querySelectorAll("[data-datamine-meta]").forEach((element) => {
        element.textContent = state.language === "ru" ? "Кеш недоступен" : "Cache unavailable";
      });
      const seasonSummary = document.querySelector("[data-oow-season-summary]");
      if (seasonSummary) {
        seasonSummary.textContent = state.language === "ru" ? "Не удалось загрузить кеш сезонов." : "Could not load the season cache.";
      }
    }
  }

  function renderSeasons() {
    if (!state.seasons.length) return;
    const strings = copy[state.language];
    const latest = state.seasons[state.seasons.length - 1];
    const today = new Date();
    const current = state.seasons.find((season) => isDateWithinSeason(today, season));
    const summary = document.querySelector("[data-oow-season-summary]");
    const list = document.querySelector("[data-oow-season-list]");
    if (summary) {
      summary.replaceChildren(
        createSummaryPart(strings.latestAvailable, `S${latest.season}`),
        createSummaryPart(strings.floors, String(latest.floorCount || latest.floors?.length || 0))
      );
    }
    if (!list) return;
    list.replaceChildren(...state.seasons.slice(-5).map((season) => createSeasonCard(season, season === current)));
  }

  function createSummaryPart(label, value) {
    const wrapper = document.createElement("span");
    const strong = document.createElement("strong");
    const caption = document.createElement("span");
    wrapper.className = "oow-stat";
    strong.textContent = value;
    caption.textContent = label;
    wrapper.append(strong, caption);
    return wrapper;
  }

  function createSeasonCard(season, current) {
    const card = document.createElement("div");
    const code = document.createElement("span");
    const dates = document.createElement("span");
    card.className = `oow-season${current ? " oow-season--current" : ""}`;
    if (current) card.setAttribute("aria-current", "date");
    code.className = "oow-season__code";
    dates.className = "oow-season__dates";
    code.textContent = `S${season.season}`;
    dates.textContent = `${formatDate(season.startDate)} → ${formatDate(season.endDate)}`;
    card.append(code, dates);
    return card;
  }

  function isDateWithinSeason(date, season) {
    const start = parseLocalDate(season.startDate);
    const end = parseLocalDate(season.endDate);
    if (!start || !end) return false;
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return day >= start && day <= end;
  }

  function parseLocalDate(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function renderStats() {
    if (state.stats.oow) setMetric("oow", state.stats.oow);
    if (state.stats.fce) setMetric("fce", state.stats.fce);
    if (state.stats.seq) setMetric("seq", state.stats.seq);
    if (state.stats.multype) setMetric("multype", state.stats.multype);
    if (state.stats.items) setMetric("items", state.stats.items);
  }

  function setMetric(key, value) {
    const metric = document.querySelector(`[data-datamine-meta="${key}"]`);
    const valueElement = metric?.querySelector("[data-meta-value]");
    if (valueElement) valueElement.textContent = Number(value).toLocaleString(state.language === "ru" ? "ru-RU" : "en-US");
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function formatDate(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return String(value || "—");
    return `${String(parts[2]).padStart(2, "0")}.${String(parts[1]).padStart(2, "0")}.${parts[0]}`;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
})();
