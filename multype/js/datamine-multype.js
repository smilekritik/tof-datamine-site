(function () {
  const translations = {
    en: {
      eyebrow: "DATAMINE · MULTYPE",
      title: "Buff categories & stacking rules",
      description: "Datamined Tower of Fantasy buff categories. Different columns multiply with each other; values in the same column are additive. Merged fields are interchangeable, while separate fields can stack.",
      loadingTitle: "Loading datamine JSON...",
      loadingBody: "Building the Main / Sub / Value model and rename dictionary.",
      loadError: "Load error",
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
      eyebrow: "DATAMINE · MULTYPE",
      title: "Категории усилений и правила сложения",
      description: "Категории усилений Tower of Fantasy из данных игры. Разные столбцы перемножаются, а значения в одном столбце складываются. Объединённые поля взаимозаменяемы, отдельные поля могут работать одновременно.",
      loadingTitle: "Загрузка данных...",
      loadingBody: "Формируем структуру Main / Sub / Value и словарь переименований.",
      loadError: "Ошибка загрузки",
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
      pageKind: "public",
      initialMode: "renamed",
      dataUrl: "./data/module_extra_to_files_mapping3.json",
      renamesUrl: "./data/renames.base.json",
      storageKey: "tof-multype-local-renames-v1",
      language: initialLanguage,
      translations,
      pageTitle: "Multype datamine viewer",
      pageEyebrow: "Datamine / Multype",
      pageDescription:
        "Datamined buff categories from the Tower of Fantasy exporter scanner repo. Different columns are multiplicative, the same column is additive. If several fields are merged into one, they are replaceable; if not, they are stackable, but not always XD."
    });

    window.addEventListener("datamine:language-change", (event) => {
      const language = event.detail?.language === "ru" ? "ru" : "en";
      app.setLanguage(language);
    });
  });
})();
