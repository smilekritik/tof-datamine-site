(function (root) {
  const CHANGELOG_DATA = [
    {
      version: "6.3.0",
      date: "21.08.2026",
      client: "Korea Dev 1",
      clientRu: "Корея Dev 1",
      summary: {
        en: "Updated Datamine data for version 6.3.0.",
        ru: "Обновлены данные Datamine для версии 6.3.0."
      },
      changes: [
        {
          section: "OOW",
          tag: "DATA",
          text: {
            en: "Updated Season 23 data, enemy waves, and boss values.",
            ru: "Обновлены данные сезона 23, волны противников и значения боссов."
          }
        },
        {
          section: "Sequential",
          tag: "DATA",
          text: {
            en: "Updated boss stages and calculated scaling values.",
            ru: "Обновлены этапы с боссами и рассчитанные значения масштабирования."
          }
        },
        {
          section: "FCE",
          tag: "DATA",
          text: {
            en: "Added new boss mechanics and refreshed boss cards.",
            ru: "Добавлены новые механики боссов и обновлены карточки."
          }
        },
        {
          section: "Items",
          tag: "DATA",
          text: {
            en: "Updated Gacha and MMO item databases.",
            ru: "Обновлены базы предметов Gacha и MMO."
          }
        },
        {
          section: "Multype",
          tag: "DATA",
          text: {
            en: "Updated Multype data from the latest full game scan.",
            ru: "Обновлены данные Multype по результатам последнего полного сканирования игры."
          }
        }
      ]
    },
    {
      version: "6.2.5",
      date: "14.08.2026",
      client: "Korea Dev 2",
      clientRu: "Корея Dev 2",
      summary: {
        en: "Small data and site update.",
        ru: "Небольшое обновление данных и сайта."
      },
      changes: [
        {
          section: "FCE",
          tag: "DATA",
          text: {
            en: "Added missing boss descriptions and updated the boss list.",
            ru: "Добавлены отсутствующие описания боссов и обновлён список боссов."
          }
        },
        {
          section: "OOW",
          tag: "DATA",
          text: {
            en: "Updated season data and buff descriptions.",
            ru: "Обновлены данные сезонов и описания усилений."
          }
        },
        {
          section: "Items",
          tag: "FIX",
          text: {
            en: "Fixed several item names and mappings.",
            ru: "Исправлены несколько названий и сопоставлений предметов."
          }
        },
        {
          section: "Site",
          tag: "FIX",
          text: {
            en: "Small layout and localization fixes.",
            ru: "Небольшие исправления макета и локализации."
          }
        }
      ]
    }
  ];

  root.CHANGELOG_DATA = CHANGELOG_DATA;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { CHANGELOG_DATA };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
