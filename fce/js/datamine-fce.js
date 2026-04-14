(function () {
  const DATA_FILE = "./fce-bosses.json";
  const DATA_FILE_RU = "./fce-bosses.ru.json";
  const SCENE_WIDTH = 1920;
  const SCENE_HEIGHT = 1080;
  const DEFAULT_NAME_RIGHT = 0;
  const DEFAULT_NAME_Y = 38;
  const DEFAULT_NAME_WIDTH = 620;
  const LANG_STORAGE_KEY = "fce-language";
  const PREVIEW_FOLDER_SEGMENT = "/assets/bosses/";
  const PREVIEW_REPLACEMENT_SEGMENT = "/assets/bosses-preview/";
  const UI_TEXT = {
    ui: {
      en: {
        eyebrow: "Datamine / FCE",
        title: "Boss mechanics",
        download: "Download",
        rendering: "Rendering",
        downloadAria: "Download current boss card",
        loading: "Loading boss card...",
        noBoss: "No boss selected.",
        loadError: "Could not load fce-bosses.json."
      },
      ru: {
        eyebrow: "Датамайн / FCE",
        title: "Механики боссов",
        download: "Скачать",
        rendering: "Рендер",
        downloadAria: "Скачать текущую карточку босса",
        loading: "Загрузка карточки босса...",
        noBoss: "Босс не выбран.",
        loadError: "Не удалось загрузить fce-bosses.json."
      }
    }
  };

  const state = {
    bosses: [],
    ruBosses: new Map(),
    selectedSlug: "",
    switcherRowCount: 0,
    language: resolveInitialLanguage()
  };
  const imageLoadCache = new Map();
  const prefetchQueue = [];
  const prefetchQueued = new Set();
  let prefetchRunning = false;

  window.addEventListener("DOMContentLoaded", () => {
    bindLanguageToggle();
    renderStaticUi();
    bindDownloadButton();
    loadPage();
  });

  async function loadPage() {
    try {
      const timestamp = Date.now();
      const [json, ruJson] = await Promise.all([
        loadJson(`${DATA_FILE}?t=${timestamp}`, true),
        loadJson(`${DATA_FILE_RU}?t=${timestamp}`, false)
      ]);

      state.bosses = Array.isArray(json?.bosses) ? json.bosses : [];
      state.ruBosses = createBossTranslationMap(ruJson);
      state.selectedSlug = resolveInitialBoss(state.bosses);
      state.switcherRowCount = getSwitcherRowCount();
      renderSwitcher();
      renderCard();
      window.addEventListener("hashchange", handleHashChange);
      window.addEventListener("resize", handleResize);
      window.addEventListener("load", updateSceneScale);
    } catch (error) {
      renderError(getUiText("loadError"));
    }
  }

  async function loadJson(url, required) {
    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      if (required) {
        throw new Error(`HTTP ${response.status}`);
      }
      return null;
    }

    return response.json();
  }

  function createBossTranslationMap(json) {
    const map = new Map();
    const bosses = Array.isArray(json?.bosses) ? json.bosses : [];
    bosses.forEach((boss) => {
      if (boss?.slug) {
        map.set(boss.slug, boss);
      }
    });
    return map;
  }

  function resolveInitialBoss(bosses) {
    const fromHash = window.location.hash.replace(/^#/, "").trim();
    if (fromHash && bosses.some((boss) => boss.slug === fromHash)) {
      return fromHash;
    }
    return bosses[0]?.slug || "";
  }

  function handleHashChange() {
    const nextSlug = window.location.hash.replace(/^#/, "").trim();
    if (!nextSlug || nextSlug === state.selectedSlug) {
      return;
    }
    if (!state.bosses.some((boss) => boss.slug === nextSlug)) {
      return;
    }
    state.selectedSlug = nextSlug;
    renderSwitcher();
    renderCard();
  }

  function handleResize() {
    const nextCount = getSwitcherRowCount();
    if (nextCount !== state.switcherRowCount) {
      state.switcherRowCount = nextCount;
      renderSwitcher();
    }
    updateSceneScale();
  }

  function renderSwitcher() {
    const root = document.querySelector("[data-boss-switcher]");
    if (!root) {
      return;
    }

    const rows = splitIntoRows(state.bosses, state.switcherRowCount || getSwitcherRowCount());
    root.innerHTML = rows
      .map((row) => {
        const chips = row
          .map((boss) => {
            const activeClass = boss.slug === state.selectedSlug ? " is-active" : "";
            return `
              <button class="fce-chip${activeClass}" type="button" data-boss-chip="${escapeHtml(boss.slug)}">
                <span class="fce-chip__dot"></span>
                <span>${escapeHtml(getBossName(boss))}</span>
              </button>
            `;
          })
          .join("");
        return `<div class="fce-switcher__row">${chips}</div>`;
      })
      .join("");

    root.querySelectorAll("[data-boss-chip]").forEach((button) => {
      button.addEventListener("click", () => {
        const slug = button.getAttribute("data-boss-chip");
        if (!slug || slug === state.selectedSlug) {
          return;
        }
        state.selectedSlug = slug;
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${slug}`);
        renderSwitcher();
        renderCard();
      });
    });
  }

  function renderCard() {
    const shell = document.querySelector("[data-boss-card-shell]");
    if (!shell) {
      return;
    }

    const boss = state.bosses.find((entry) => entry.slug === state.selectedSlug);
    if (!boss) {
      shell.innerHTML = `<div class="fce-card-loader">${escapeHtml(getUiText("noBoss"))}</div>`;
      return;
    }
    const displayName = getBossName(boss);

    const mechanics = (boss.mechanics || [])
      .map((entry, mechanicIndex) => {
        return `
          <article class="fce-card__line">
            <p class="fce-card__text"><span class="fce-card__index">${escapeHtml(entry.index || "?")}.</span>${renderMechanicText(entry, boss, mechanicIndex)}</p>
          </article>
        `;
      })
      .join("");

    const artMarkup = boss.art
      ? `<img class="fce-card__art" alt="${escapeHtml(displayName)}" style="object-position:${escapeHtml(boss.art_object_position || "center center")};">`
      : "";
    const visualStyle = buildVisualStyle(boss);

    let viewport = shell.querySelector("[data-fce-viewport]");
    let copy = shell.querySelector("[data-fce-copy]");
    let visual = shell.querySelector("[data-fce-visual]");

    if (!viewport || !copy || !visual) {
      shell.innerHTML = `
        <div class="fce-card-viewport" data-fce-viewport>
          <article class="fce-card">
            <div class="fce-card__sky"></div>
            <div class="fce-card__fog"></div>
            <div class="fce-card__grid"></div>
            <div class="fce-card__wash"></div>
            <div class="fce-card__copy" data-fce-copy></div>
            <div class="fce-card__visual" data-fce-visual></div>
          </article>
        </div>
      `;

      viewport = shell.querySelector("[data-fce-viewport]");
      copy = shell.querySelector("[data-fce-copy]");
      visual = shell.querySelector("[data-fce-visual]");
    }

    if (!copy || !visual || !viewport) {
      return;
    }

    copy.innerHTML = mechanics;
    visual.innerHTML = `
      ${artMarkup}
      <div class="fce-card__name">${escapeHtml(displayName)}</div>
    `;

    if (visualStyle) {
      visual.setAttribute("style", visualStyle);
    } else {
      visual.removeAttribute("style");
    }

    if (boss.art) {
      updateCardArt(shell, boss, displayName);
      queueRemainingFullArtPrefetch(boss.slug);
    }

    fitCardContent(shell, boss);
    updateSceneScale();
  }

  function renderError(message) {
    const shell = document.querySelector("[data-boss-card-shell]");
    const switcher = document.querySelector("[data-boss-switcher]");
    if (switcher) {
      switcher.innerHTML = "";
    }
    if (shell) {
      shell.innerHTML = `<div class="fce-card-loader">${escapeHtml(message)}</div>`;
    }
  }

  function renderMechanicText(entry, boss, mechanicIndex) {
    const localizedEntry = state.language === "ru"
      ? state.ruBosses.get(boss?.slug)?.mechanics?.[mechanicIndex]
      : null;

    if (typeof localizedEntry?.html === "string" && localizedEntry.html.trim()) {
      return localizedEntry.html;
    }
    if (typeof localizedEntry?.text === "string" && localizedEntry.text.trim()) {
      return escapeHtml(localizedEntry.text);
    }
    if (typeof entry?.html === "string" && entry.html.trim()) {
      return entry.html;
    }
    return escapeHtml(entry?.text || "");
  }

  function buildVisualStyle(boss) {
    const styles = [];
    if (boss.name_color) {
      styles.push(`--fce-name-color:${escapeHtml(boss.name_color)}`);
    }
    styles.push(`--fce-art-scale:${Number.isFinite(Number(boss.art_scale)) ? Number(boss.art_scale) : 1.08}`);
    styles.push(`--fce-art-x:${Number.isFinite(Number(boss.art_x)) ? Number(boss.art_x) : -96}px`);
    styles.push(`--fce-art-y:${Number.isFinite(Number(boss.art_y)) ? Number(boss.art_y) : 0}px`);
    styles.push(`--fce-name-right:${Number.isFinite(Number(boss.name_right)) ? Number(boss.name_right) : DEFAULT_NAME_RIGHT}px`);
    styles.push(`--fce-name-y:${Number.isFinite(Number(boss.name_y)) ? Number(boss.name_y) : DEFAULT_NAME_Y}px`);
    styles.push(`--fce-name-width:${Number.isFinite(Number(boss.name_width)) ? Number(boss.name_width) : DEFAULT_NAME_WIDTH}px`);
    styles.push(`--fce-name-scale:${Number.isFinite(Number(boss.name_scale)) ? Number(boss.name_scale) : 1}`);
    return styles.join(";");
  }

  function updateCardArt(shell, boss, displayName) {
    const artElement = shell.querySelector(".fce-card__art");
    if (!artElement || !boss?.art) {
      return;
    }

    const fullPath = boss.art;
    const previewPath = getPreviewArtPath(fullPath);
    const fullEntry = imageLoadCache.get(fullPath);
    const artToken = `${boss.slug}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    artElement.alt = displayName;
    artElement.setAttribute("data-fce-art-token", artToken);
    artElement.setAttribute("data-fce-art-slug", boss.slug);
    artElement.setAttribute("data-fce-art-full", fullPath);

    if (fullEntry?.status === "loaded") {
      artElement.onerror = null;
      artElement.src = fullPath;
      artElement.classList.remove("is-preview");
      artElement.classList.add("is-full");
      return;
    }

    artElement.classList.add("is-preview");
    artElement.classList.remove("is-full");

    if (previewPath) {
      artElement.onerror = () => {
        if (artElement.getAttribute("data-fce-art-token") !== artToken) {
          return;
        }
        artElement.onerror = null;
        artElement.src = fullPath;
        artElement.classList.remove("is-preview");
        artElement.classList.add("is-full");
      };
      artElement.src = previewPath;
    } else {
      artElement.onerror = null;
      artElement.src = fullPath;
      artElement.classList.remove("is-preview");
      artElement.classList.add("is-full");
    }

    ensureImageLoaded(fullPath).then(() => {
      const currentArt = shell.querySelector(".fce-card__art");
      if (!currentArt) {
        return;
      }
      if (currentArt.getAttribute("data-fce-art-token") !== artToken) {
        return;
      }
      currentArt.onerror = null;
      currentArt.src = fullPath;
      currentArt.classList.remove("is-preview");
      currentArt.classList.add("is-full");
    }).catch(() => {
      // Keep the preview or direct full src if the image fails to prefetch.
    });
  }

  function getPreviewArtPath(artPath) {
    if (typeof artPath !== "string" || !artPath.includes(PREVIEW_FOLDER_SEGMENT)) {
      return "";
    }
    return artPath.replace(PREVIEW_FOLDER_SEGMENT, PREVIEW_REPLACEMENT_SEGMENT);
  }

  function ensureImageLoaded(path) {
    const existingEntry = imageLoadCache.get(path);
    if (existingEntry) {
      return existingEntry.promise;
    }

    const image = new Image();
    const promise = new Promise((resolve, reject) => {
      image.addEventListener("load", () => {
        imageLoadCache.set(path, { status: "loaded", image, promise });
        resolve(image);
      }, { once: true });

      image.addEventListener("error", () => {
        imageLoadCache.delete(path);
        reject(new Error(`Could not load image: ${path}`));
      }, { once: true });
    });

    imageLoadCache.set(path, { status: "loading", image, promise });
    image.src = path;
    return promise;
  }

  function queueRemainingFullArtPrefetch(currentSlug) {
    const remainingPaths = state.bosses
      .filter((boss) => boss.slug !== currentSlug && typeof boss.art === "string" && boss.art)
      .map((boss) => boss.art);

    remainingPaths.forEach((path) => {
      const existingEntry = imageLoadCache.get(path);
      if (existingEntry?.status === "loaded" || existingEntry?.status === "loading") {
        return;
      }
      if (prefetchQueued.has(path)) {
        return;
      }

      prefetchQueued.add(path);
      prefetchQueue.push(path);
    });

    startPrefetchQueue();
  }

  function startPrefetchQueue() {
    if (prefetchRunning) {
      return;
    }
    prefetchRunning = true;

    const processNext = () => {
      const nextPath = prefetchQueue.shift();
      if (!nextPath) {
        prefetchRunning = false;
        return;
      }

      prefetchQueued.delete(nextPath);
      ensureImageLoaded(nextPath)
        .catch(() => {
          // Ignore individual prefetch failures; explicit loads can retry later.
        })
        .finally(() => {
          window.setTimeout(processNext, 140);
        });
    };

    window.setTimeout(processNext, 180);
  }

  function fitCardContent(shell, boss) {
    const copy = shell.querySelector(".fce-card__copy");
    const name = shell.querySelector(".fce-card__name");
    const visual = shell.querySelector(".fce-card__visual");

    if (copy) {
      const baseTop = Number.isFinite(Number(boss.copy_y)) ? Number(boss.copy_y) : 220;
      const copyWidth = Number.isFinite(Number(boss.copy_width)) ? Number(boss.copy_width) : 1300;
      let copyTop = baseTop;
      let copyScale = Number.isFinite(Number(boss.copy_scale)) ? Number(boss.copy_scale) : 1;

      copy.style.setProperty("--fce-copy-width", `${copyWidth}px`);
      copy.style.setProperty("--fce-copy-y", `${copyTop}px`);
      copy.style.setProperty("--fce-copy-scale", String(copyScale));

      const naturalHeight = copy.scrollHeight;
      const availableHeight = 1080 - baseTop;
      const centeredOffset = Math.max(0, (availableHeight - naturalHeight * copyScale) / 2);
      const centeredTop = baseTop + Math.min(42, centeredOffset);
      const overflowTop = Math.max(18, 916 - naturalHeight);
      copyTop = naturalHeight > 696 ? overflowTop : centeredTop;
      copy.style.setProperty("--fce-copy-y", `${copyTop}px`);

      const finalAvailableHeight = 1080 - copyTop;
      const scaledHeight = copy.scrollHeight * copyScale;
      if (scaledHeight > finalAvailableHeight) {
        copyScale = Math.max(0.84, finalAvailableHeight / copy.scrollHeight);
        copy.style.setProperty("--fce-copy-scale", copyScale.toFixed(4));
      }
    }

    if (name && visual) {
      const baseWidth = Number.isFinite(Number(boss.name_width)) ? Number(boss.name_width) : DEFAULT_NAME_WIDTH;
      visual.style.setProperty("--fce-name-width", `${baseWidth}px`);

      const naturalWidth = name.scrollWidth;
      if (naturalWidth > baseWidth) {
        const fittedScale = Math.max(0.72, baseWidth / naturalWidth);
        visual.style.setProperty("--fce-name-scale", fittedScale.toFixed(4));
      }
    }
  }

  function updateSceneScale() {
    const shell = document.querySelector("[data-boss-card-shell]");
    const viewport = document.querySelector("[data-fce-viewport]");
    if (!shell || !viewport) {
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const availableWidth = shell.clientWidth || shellRect.width || SCENE_WIDTH;
    const availableHeight = Math.max(window.innerHeight - shellRect.top - 26, 320);
    const scaleByWidth = availableWidth / SCENE_WIDTH;
    const scaleByHeight = availableHeight / SCENE_HEIGHT;
    const scale = Math.min(scaleByWidth, scaleByHeight, 1);

    viewport.style.width = `${Math.round(SCENE_WIDTH * scale)}px`;
    viewport.style.height = `${Math.round(SCENE_HEIGHT * scale)}px`;
    viewport.style.setProperty("--fce-scale", scale.toFixed(5));
  }

  function getSwitcherRowCount() {
    if (window.innerWidth <= 760) {
      return 1;
    }
    if (window.innerWidth <= 1260) {
      return 2;
    }
    return 3;
  }

  function bindDownloadButton() {
    const button = document.querySelector("[data-fce-download]");
    if (!button) {
      return;
    }

    button.addEventListener("click", async () => {
      const viewport = document.querySelector("[data-fce-viewport]");
      const boss = state.bosses.find((entry) => entry.slug === state.selectedSlug);
      if (!viewport || !boss) {
        return;
      }

      const html2canvasFn = window.html2canvas;
      if (typeof html2canvasFn !== "function") {
        alert("Download library is still loading. Please try again in a moment.");
        return;
      }

      const previousLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="fce-download-button__icon">…</span><span class="fce-download-button__label">${escapeHtml(getUiText("rendering"))}</span>`;

      try {
        await ensureBossArtReadyForExport(boss);
        const exportScene = createExportScene(viewport);
        if (!exportScene) {
          throw new Error("Could not prepare export scene.");
        }

        await waitForCardAssets(exportScene.exportCard);
        await waitForNextFrame();

        const renderedCanvas = await html2canvasFn(exportScene.exportCard, {
          backgroundColor: null,
          width: SCENE_WIDTH,
          height: SCENE_HEIGHT,
          scale: 1,
          useCORS: true,
          logging: false,
          removeContainer: true
        });

        const link = document.createElement("a");
        link.href = renderedCanvas.toDataURL("image/png");
        link.download = `fce-${boss.slug}-${state.language}.png`;
        link.click();
      } catch (error) {
        alert("Could not render the card for download.");
      } finally {
        destroyExportScene();
        button.disabled = false;
        button.innerHTML = previousLabel;
      }
    });
  }

  async function waitForCardAssets(card) {
    if (!card) {
      return;
    }

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (error) {
        // Ignore font loading issues and continue with available fonts.
      }
    }

    const pendingImages = Array.from(card.querySelectorAll("img")).map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    await Promise.all(pendingImages);
  }

  async function ensureBossArtReadyForExport(boss) {
    if (!boss?.art) {
      return;
    }

    await ensureImageLoaded(boss.art);
    const artElement = document.querySelector(".fce-card__art");
    if (!artElement) {
      return;
    }

    artElement.onerror = null;
    artElement.src = boss.art;
    artElement.classList.remove("is-preview");
    artElement.classList.add("is-full");
    await waitForCardAssets(document.querySelector("[data-fce-viewport]"));
  }

  function createExportScene(viewport) {
    destroyExportScene();

    const sourceCard = viewport?.querySelector(".fce-card");
    if (!sourceCard) {
      return null;
    }

    const exportRoot = document.createElement("div");
    exportRoot.className = "fce-export-root";
    exportRoot.setAttribute("data-fce-export-root", "");
    exportRoot.setAttribute("aria-hidden", "true");

    const exportCard = sourceCard.cloneNode(true);
    exportCard.classList.add("fce-card--export");
    syncAnimatedLayers(sourceCard, exportCard);
    normalizeExportArt(sourceCard, exportCard);
    exportRoot.appendChild(exportCard);
    document.body.appendChild(exportRoot);

    return { exportRoot, exportCard };
  }

  function destroyExportScene() {
    document.querySelector("[data-fce-export-root]")?.remove();
  }

  function syncAnimatedLayers(sourceCard, exportCard) {
    [".fce-card__sky", ".fce-card__fog"].forEach((selector) => {
      const sourceLayer = sourceCard.querySelector(selector);
      const exportLayer = exportCard.querySelector(selector);
      if (!sourceLayer || !exportLayer) {
        return;
      }

      const computed = window.getComputedStyle(sourceLayer);
      exportLayer.style.transform = computed.transform === "none" ? "" : computed.transform;
      exportLayer.style.opacity = computed.opacity;
      exportLayer.style.filter = computed.filter;
    });
  }

  function normalizeExportArt(sourceCard, exportCard) {
    const sourceImage = sourceCard.querySelector(".fce-card__art");
    const exportImage = exportCard.querySelector(".fce-card__art");
    if (!sourceImage || !exportImage) {
      return;
    }

    const computed = window.getComputedStyle(sourceImage);
    const exportArt = document.createElement("div");
    exportArt.className = "fce-card__art-export";
    exportArt.style.left = computed.left;
    exportArt.style.top = computed.top;
    exportArt.style.width = computed.width;
    exportArt.style.height = computed.height;
    exportArt.style.transform = computed.transform === "none" ? "" : computed.transform;
    exportArt.style.transformOrigin = computed.transformOrigin;
    exportArt.style.opacity = computed.opacity;
    exportArt.style.filter = computed.filter;
    exportArt.style.backgroundImage = `url("${sourceImage.currentSrc || sourceImage.src}")`;
    exportArt.style.backgroundRepeat = "no-repeat";
    exportArt.style.backgroundSize = "contain";
    exportArt.style.backgroundPosition = computed.objectPosition;

    exportImage.replaceWith(exportArt);
  }

  function waitForNextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function bindLanguageToggle() {
    document.querySelectorAll("[data-fce-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLanguage = button.getAttribute("data-fce-lang");
        if (!nextLanguage || nextLanguage === state.language) {
          return;
        }

        state.language = nextLanguage === "ru" ? "ru" : "en";
        localStorage.setItem(LANG_STORAGE_KEY, state.language);
        renderStaticUi();
        renderSwitcher();
        renderCard();
      });
    });
  }

  function renderStaticUi() {
    document.documentElement.lang = state.language === "ru" ? "ru" : "en";
    const eyebrow = document.querySelector("[data-fce-eyebrow]");
    const title = document.querySelector("[data-fce-title]");
    const downloadButton = document.querySelector("[data-fce-download]");
    const downloadLabel = document.querySelector("[data-fce-download-label]");
    const langToggle = document.querySelector("[data-fce-lang-toggle]");
    const loader = document.querySelector(".fce-card-loader");

    if (eyebrow) {
      eyebrow.textContent = getUiText("eyebrow");
    }
    if (title) {
      title.textContent = getUiText("title");
    }
    if (downloadLabel) {
      downloadLabel.textContent = getUiText("download");
    }
    if (downloadButton) {
      downloadButton.setAttribute("aria-label", getUiText("downloadAria"));
    }
    if (langToggle) {
      langToggle.setAttribute("aria-label", state.language === "ru" ? "Переключение языка" : "Language switcher");
    }
    if (loader) {
      loader.textContent = getUiText("loading");
    }

    document.querySelectorAll("[data-fce-lang]").forEach((button) => {
      const buttonLanguage = button.getAttribute("data-fce-lang");
      button.classList.toggle("is-active", buttonLanguage === state.language);
    });
  }

  function getUiText(key) {
    return UI_TEXT.ui?.[state.language]?.[key] || UI_TEXT.ui?.en?.[key] || "";
  }

  function getBossName(boss) {
    if (state.language === "ru") {
      return state.ruBosses.get(boss?.slug)?.name || boss?.name || "";
    }
    return boss?.name || "";
  }

  function resolveInitialLanguage() {
    const fromSearch = new URLSearchParams(window.location.search).get("lang");
    if (fromSearch === "ru" || fromSearch === "en") {
      return fromSearch;
    }

    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "ru" || stored === "en") {
      return stored;
    }

    return "en";
  }

  function splitIntoRows(items, rowCount) {
    const safeRowCount = Math.max(1, Math.min(rowCount, items.length || 1));
    const rows = Array.from({ length: safeRowCount }, () => []);

    items.forEach((item, index) => {
      rows[index % safeRowCount].push(item);
    });

    return rows.filter((row) => row.length > 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
