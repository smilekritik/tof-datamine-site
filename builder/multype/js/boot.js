(function () {
  // Boot the shared Multype core in local-editor mode.
  //
  // The data lives in the published site tree (datamine/multype/data). We point
  // dataUrl/renamesUrl back at it with parent-relative paths so this works both
  // on the server (same-origin) and when the folder is opened from file://.
  //
  // Publishing loop: edit renames here -> Export JSON downloads renames.base.json
  // -> replace datamine/multype/data/renames.base.json -> redeploy.

  const translations = {
    en: {
      source: "Source",
      sourceFile: "Source file",
      total: "Total",
      categories: "categories",
      subcategories: "subcategories",
      buffs: "buffs",
      openJson: "Open local JSON",
      viewSource: "View exporter source",
      renamed: "Renamed",
      combined: "Combined",
      datamined: "Datamined",
      search: "Search",
      searchPlaceholder: "Search original keys or renamed labels...",
      main: "Main",
      sub: "Sub",
      allMain: "All Main",
      allSub: "All Sub",
      all: "All",
      renamedOnly: "Renamed only",
      unrenamedOnly: "Unrenamed only",
      emptyTitle: "Nothing matched",
      emptyBody: "Try another mode, clear filters, or remove the search query.",
      subColumns: "sub columns",
      files: "files"
    },
    ru: {
      source: "Источник",
      sourceFile: "Файл данных",
      total: "Всего",
      categories: "категорий",
      subcategories: "подкатегорий",
      buffs: "усилений",
      openJson: "Открыть локальный JSON",
      viewSource: "Открыть источник экспортера",
      renamed: "Переименованные",
      combined: "Вместе",
      datamined: "Исходные",
      search: "Поиск",
      searchPlaceholder: "Поиск по исходным ключам и новым названиям...",
      main: "Main",
      sub: "Sub",
      allMain: "Все Main",
      allSub: "Все Sub",
      all: "Все",
      renamedOnly: "Только переименованные",
      unrenamedOnly: "Без переименования",
      emptyTitle: "Ничего не найдено",
      emptyBody: "Смените режим, сбросьте фильтры или очистите поисковый запрос.",
      subColumns: "подкатегорий",
      files: "файлов"
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofMultypeCore) {
      return;
    }

    const initialLanguage = window.DatamineHeader?.getLanguage() === "ru" ? "ru" : "en";

    const app = window.TofMultypeCore.createMultypeApp({
      rootSelector: "[data-multype-app]",
      pageKind: "local",
      dataUrl: "../../datamine/multype/data/module_extra_to_files_mapping3.json",
      renamesUrl: "../../datamine/multype/data/renames.base.json",
      storageKey: "tof-multype-local-renames-v1",
      language: initialLanguage,
      translations,
      pageTitle: "Multype rename editor",
      pageEyebrow: "Datamine Builder / Multype",
      pageDescription:
        "Edit category, subcategory, and file renames for the Multype dataset, then export the updated dictionary."
    });

    const root = document.querySelector("[data-multype-app]");

    // The Export / Import / Reset controls live in the header now. Forward them
    // to the editor's own (hidden) in-body buttons so the tested core handlers
    // run. Query on each click — the body re-renders and swaps those nodes.
    function forwardAction(dataAction) {
      root?.querySelector(`[data-action="${dataAction}"]`)?.click();
    }

    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-mtb-action]");
      if (actionButton) {
        const map = {
          export: "export-renames",
          import: "trigger-import",
          reset: "reset-draft"
        };
        forwardAction(map[actionButton.dataset.mtbAction]);
        return;
      }

      const langButton = event.target.closest("[data-mtb-lang]");
      if (langButton) {
        window.DatamineHeader?.setLanguage(langButton.dataset.mtbLang);
      }
    });

    function syncLangButtons(language) {
      document.querySelectorAll("[data-mtb-lang]").forEach((button) => {
        const active = button.dataset.mtbLang === language;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    syncLangButtons(initialLanguage);
    window.addEventListener("datamine:language-change", (event) => {
      const language = event.detail?.language === "ru" ? "ru" : "en";
      app.setLanguage(language);
      syncLangButtons(language);
    });
  });
})();
