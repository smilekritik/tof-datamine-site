(function () {
  const numberFormatter = new Intl.NumberFormat("en-US");

  document.addEventListener("DOMContentLoaded", () => {
    hydrateHubStats();
  });

  async function hydrateHubStats() {
    await Promise.allSettled([
      hydrateFceBossCount(),
      hydrateSeqFloorCount(),
      hydrateMultypeBuffCount(),
      hydrateItemsCount()
    ]);
  }

  async function hydrateFceBossCount() {
    const json = await fetchJson("./fce/fce-bosses.json");
    const bossCount = Array.isArray(json?.bosses) ? json.bosses.length : 0;
    if (!bossCount) {
      return;
    }

    setText('[data-datamine-meta="fce"]', formatLabel(bossCount, "boss"));
  }

  async function hydrateSeqFloorCount() {
    let floorCount = await fetchSeqStageLimit();

    if (!Number.isFinite(floorCount) || floorCount <= 0) {
      const cacheJson = await fetchJson("./seq/seq-boss-cache.json");
      floorCount = resolveSeqFloorFromCache(cacheJson);
    }

    if (!Number.isFinite(floorCount) || floorCount <= 0) {
      return;
    }

    setText('[data-datamine-meta="seq"]', `Floor ${numberFormatter.format(floorCount)}`);
  }

  async function hydrateMultypeBuffCount() {
    const json = await fetchJson("./multype/module_extra_to_files_mapping3.json");
    const buffCount = countMultypeBuffs(json);
    if (!buffCount) {
      return;
    }

    const label = formatLabel(buffCount, "buff");
    setText('[data-datamine-meta="multype"]', label);
    setText('[data-datamine-total="multype"]', label);
  }

  async function hydrateItemsCount() {
    const json = await fetchJson("./items/merged_mapping_with_original.json");
    const itemCount =
      json && typeof json === "object" && !Array.isArray(json) ? Object.keys(json).length : 0;
    if (!itemCount) {
      return;
    }

    setText('[data-datamine-meta="items"]', formatLabel(itemCount, "item"));
  }

  async function fetchSeqStageLimit() {
    try {
      const response = await fetch("./seq/seq-stage-limit.txt", {
        cache: "no-store"
      });

      if (!response.ok) {
        return NaN;
      }

      const text = await response.text();
      return Number.parseInt(text.trim(), 10);
    } catch (error) {
      return NaN;
    }
  }

  function resolveSeqFloorFromCache(json) {
    if (!json || typeof json !== "object") {
      return NaN;
    }

    const cachedUpToStage = Number(json?.meta?.cachedUpToStage);
    if (Number.isFinite(cachedUpToStage) && cachedUpToStage > 0) {
      return cachedUpToStage;
    }

    const requestedStageLimit = Number(json?.meta?.requestedStageLimit);
    if (Number.isFinite(requestedStageLimit) && requestedStageLimit > 0) {
      return requestedStageLimit;
    }

    const rowKeys = Object.keys(json?.rows || {});
    const derivedFloor = rowKeys.reduce((maxStage, key) => {
      const match = key.match(/(\d+)$/);
      const stage = Number.parseInt(match?.[1] || "", 10);
      return Number.isFinite(stage) ? Math.max(maxStage, stage) : maxStage;
    }, 0);

    return derivedFloor || NaN;
  }

  function countMultypeBuffs(json) {
    if (!json || typeof json !== "object") {
      return 0;
    }

    return Object.values(json).reduce((mainTotal, subGroups) => {
      if (!subGroups || typeof subGroups !== "object") {
        return mainTotal;
      }

      const subTotal = Object.values(subGroups).reduce((groupTotal, entries) => {
        return groupTotal + (Array.isArray(entries) ? entries.length : 0);
      }, 0);

      return mainTotal + subTotal;
    }, 0);
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  function formatLabel(value, singular) {
    const plural =
      singular === "boss"
        ? "bosses"
        : singular === "item"
          ? "items"
          : `${singular}s`;
    const noun = value === 1 ? singular : plural;
    return `${numberFormatter.format(value)} ${noun}`;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }
})();
