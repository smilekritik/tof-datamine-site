(function () {
  const copy = {
    en: {
      title: "Tower of Fantasy archive",
      subtitle: "Game data, scaling, mechanics and internal values.",
      oowTitle: "Origin of War",
      oowBody: "Enemy stats, floor health, wave distribution, defenses and seasonal scaling schedules.",
      fceTitle: "Boss mechanics",
      fceBody: "Cards, mechanics and visual references.",
      seqTitle: "Sequential scaling",
      seqBody: "Boss HP, effective HP and floor-to-floor growth.",
      multypeTitle: "Multiplicative buffs",
      multypeBody: "Buff grouping and multiplier data.",
      itemsTitle: "Item identifiers",
      itemsBody: "Internal and display names in a data table.",
      openPage: "Open page",
      openOow: "Open Origin of War",
      seasonsLoading: "Loading seasons...",
      latestAvailable: "Latest available",
      seasons: "seasons",
      bosses: "bosses",
      floors: "floors",
      buffs: "buffs",
      items: "items",
      footer: "Tower of Fantasy archive",
      loading: "Loading",
      datasetsAria: "Datamine datasets"
    },
    ru: {
      title: "Архив Tower of Fantasy",
      subtitle: "Игровые данные, рост характеристик, механики и внутренние значения.",
      oowTitle: "Истоки войны",
      oowBody: "Характеристики врагов, здоровье этажей, распределение волн, защита и расписание сезонов.",
      fceTitle: "Механики боссов",
      fceBody: "Карточки, механики и наглядные руководства.",
      seqTitle: "Последовательный бой",
      seqBody: "Здоровье боссов, эффективное HP и рост между этажами.",
      multypeTitle: "Мультипликативные усиления",
      multypeBody: "Группировка усилений и коэффициенты.",
      itemsTitle: "Идентификаторы предметов",
      itemsBody: "Внутренние и отображаемые названия в таблице данных.",
      openPage: "Открыть раздел",
      openOow: "Открыть Истоки войны",
      seasonsLoading: "Загрузка сезонов...",
      latestAvailable: "Последний доступный",
      seasons: "сезонов",
      bosses: "боссов",
      floors: "этажей",
      buffs: "усилений",
      items: "предметов",
      footer: "Архив Tower of Fantasy",
      loading: "Загрузка",
      datasetsAria: "Наборы данных Datamine"
    }
  };

  const state = {
    language: window.DatamineHeader?.getLanguage() === "ru" ? "ru" : "en",
    seasons: [],
    stats: {}
  };

  const FCE_BOSS_PREVIEWS = [
    { src: "./fce/assets/bosses-preview/jormungand.png", name: "Jormungand", nameRu: "Йормунганд" },
    { src: "./fce/assets/bosses-preview/apophis.png", name: "Apophis", nameRu: "Апофис" },
    { src: "./fce/assets/bosses-preview/frost-bot.png", name: "Frost Bot", nameRu: "Ледяной бот" }
  ];
  let currentBossIdx = 0;

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    hydrateHubStats();
    initFceBossRotation();
    window.addEventListener("datamine:language-change", (event) => {
      state.language = event.detail?.language === "ru" ? "ru" : "en";
      applyLanguage();
    });
  });

  function initFceBossRotation() {
    const img = document.getElementById("hub-fce-preview");
    const nameEl = document.getElementById("hub-fce-name");
    if (!img) return;
    setInterval(() => {
      currentBossIdx = (currentBossIdx + 1) % FCE_BOSS_PREVIEWS.length;
      img.style.opacity = "0.2";
      setTimeout(() => {
        const item = FCE_BOSS_PREVIEWS[currentBossIdx];
        img.src = item.src;
        if (nameEl) nameEl.textContent = state.language === "ru" ? item.nameRu : item.name;
        img.style.opacity = "1";
      }, 250);
    }, 6500);
  }

  function applyLanguage() {
    const strings = copy[state.language];
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-hub-copy]").forEach((element) => {
      element.textContent = strings[element.dataset.hubCopy] || element.textContent;
    });
    document.querySelector(".datamine-hub-grid")?.setAttribute("aria-label", strings.datasetsAria);
    const nameEl = document.getElementById("hub-fce-name");
    if (nameEl) {
      const item = FCE_BOSS_PREVIEWS[currentBossIdx];
      nameEl.textContent = state.language === "ru" ? item.nameRu : item.name;
    }
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
    return `${String(parts[2]).padStart(2, "0")}.${String(parts[1]).padStart(2, "0")}`;
  }

})();
