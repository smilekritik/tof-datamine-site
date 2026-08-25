(function (root) {
  const TOF_RESOURCES_DATA = [
    {
      id: "databases",
      title: {
        en: "Databases & Datamine",
        ru: "Базы данных и датамайн"
      },
      color: "#f5d97a",
      icon: "database",
      resources: [
        {
          name: "tof.gg",
          url: "https://tof.gg/",
          displayUrl: "tof.gg",
          isInternal: false,
          type: "Web",
          description: {
            en: "Tower of Fantasy database for simulacra, matrices, outfits and relics.",
            ru: "База данных Tower of Fantasy по симулякрам, матрицам, обликам и реликвиям."
          }
        },
        {
          name: "Tower of Fantasy Index",
          url: "https://www.toweroffantasy.info/",
          displayUrl: "toweroffantasy.info",
          isInternal: false,
          type: "Web",
          description: {
            en: "Structured game database covering Simulacra, weapons, matrices, relics, cosmetics, and food.",
            ru: "Структурированная база данных по симулякрам, оружию, матрицам, реликвиям, косметике и рецептам."
          }
        },
        {
          name: "Tower of Fantasy Exporter Scanner",
          url: "https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner",
          displayUrl: "github.com/smilekritik/Tower-of-fantasy-exporter-scanner",
          isInternal: false,
          type: "Tool",
          author: "by Kritik",
          description: {
            en: "Asset export and scanning CLI tools used for deep game research and modifier analysis.",
            ru: "Инструменты для экспорта и сканирования ассетов для глубоких исследований и анализа модификаторов."
          }
        }
      ]
    },
    {
      id: "wikis",
      title: {
        en: "Wikis & Reference",
        ru: "Вики и справочники"
      },
      color: "#c084fc",
      icon: "wiki",
      resources: [
        {
          name: "Tower of Fantasy Wiki",
          url: "https://toweroffantasy.fandom.com/wiki/Tower_of_Fantasy_Wiki",
          displayUrl: "toweroffantasy.fandom.com",
          isInternal: false,
          type: "Wiki",
          description: {
            en: "Community-maintained English wiki covering characters, weapons, systems, story and other Tower of Fantasy information.",
            ru: "Англоязычная вики сообщества по персонажам, оружию, игровым системам и сюжету Tower of Fantasy."
          }
        },
        {
          name: "Tower of Fantasy Interactive Map",
          url: "https://tower-of-fantasy-map.hotgames.gg/",
          displayUrl: "tower-of-fantasy-map.hotgames.gg",
          isInternal: false,
          type: "Tool",
          description: {
            en: "Dedicated interactive map resource with exploration markers, chests, puzzles, and collectible locations.",
            ru: "Интерактивная карта мира с точками исследования, сундуками, загадками и расположением ресурсов."
          }
        }
      ]
    },
    {
      id: "calculators",
      title: {
        en: "Spreadsheets & Calculators",
        ru: "Таблицы и калькуляторы"
      },
      color: "#ff6b8b",
      icon: "sheet",
      resources: [
        {
          name: "Everything",
          url: "https://docs.google.com/spreadsheets/",
          displayUrl: "docs.google.com/spreadsheets",
          isInternal: false,
          type: "Sheet",
          author: "by Kritik",
          description: {
            en: "Collection of Tower of Fantasy datamined tables, reference sheets and combat calculators.",
            ru: "Коллекция датамайн-таблиц, справочных материалов и боевых калькуляторов по Tower of Fantasy."
          }
        },
        {
          name: "Tower of Fantasy Tools",
          url: "https://www.toweroffantasytools.com/",
          displayUrl: "toweroffantasytools.com",
          isInternal: false,
          type: "Tool",
          description: {
            en: "Gear comparison, build presets, team damage calculators, and reference tools for weapons and matrices.",
            ru: "Инструменты для сравнения экипировки, пресетов билдов, калькуляторов урона команд и справочников."
          }
        },
        {
          name: "ToF WARP Toolbox (幻塔WARPお道具箱)",
          url: "https://tof-warp-odougubako.site/",
          displayUrl: "tof-warp-odougubako.site",
          isInternal: false,
          type: "Tool",
          description: {
            en: "Japanese community toolbox featuring an item database, gear references, and practical gameplay utility tools.",
            ru: "Японский инструментарий сообщества с базой предметов, справочниками экипировки и полезными утилитами."
          }
        }
      ]
    }
  ];

  // Flattened array for backwards compatibility
  const TOF_PROJECTS_DATA = TOF_RESOURCES_DATA.flatMap((cat) =>
    cat.resources.map((res) => ({ ...res, category: cat.id }))
  );

  root.TOF_RESOURCES_DATA = TOF_RESOURCES_DATA;
  root.TOF_PROJECTS_DATA = TOF_PROJECTS_DATA;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { TOF_RESOURCES_DATA, TOF_PROJECTS_DATA };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);

