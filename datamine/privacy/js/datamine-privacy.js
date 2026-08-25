(function () {
  const PRIVACY_STRINGS = {
    en: {
      metaTitle: "Privacy Notice — TOF Datamine",
      metaDesc: "Privacy notice for TOF Datamine — browser preferences, local drafts, site assets, and application request logging.",
      heroEyebrow: "PRIVACY NOTICE",
      heroTitle: "Privacy & Data Storage",
      heroSubtitle: "How the application stores preferences and logs requests.",

      secSummaryTitle: "Summary",
      summaryIntro: "TOF Datamine is an ad-free, tracker-free community research archive. We do not track your activity across the web, sell personal information, or run commercial behavioural analytics scripts.",

      secInventoryTitle: "Data Inventory",
      invAnalyticsTitle: "Analytics & Tracking",
      invAnalyticsDesc: "None. No Google Analytics, no Meta pixels, and no behavioural profiling scripts are loaded on this site.",
      invCookiesTitle: "Persistent preferences",
      invCookiesDesc: "The application stores interface language and themes in localStorage or functional cookies. Multype table scale and some page view preferences are stored in localStorage. These values stay in your browser and do not contain an account profile.",
      invSessionTitle: "Temporary and recovery state",
      invSessionDesc: "Some interface state is kept only for the current page or URL. A small localStorage and sessionStorage marker is also used to complete one-time recovery from the former Datamine cache.",
      invBuilderTitle: "Builder drafts",
      invBuilderDesc: "Datamine Builder stores drafts in localStorage and exports files on your device. It does not publish those drafts to the live site.",
      invFontsTitle: "Fonts & Media Assets",
      invFontsDesc: "The application loads fonts, scripts, styles, and game images from the same origin as the page.",
      invLogsTitle: "Server Infrastructure Logs",
      invLogsDesc: "This application logs request time, HTTP method, and requested URL. Its request logger does not add the client IP address, User-Agent, or response status. Hosting infrastructure outside this application may have its own policies.",

      secExternalTitle: "External Links",
      externalDesc: "This website links to external tools, databases, and repositories (such as GitHub, Discord, or community tool sites). Clicking these links takes you to third-party domains operated under their own respective terms and privacy policies.",

      secContactTitle: "Contact & Updates",
      contactDesc: "If you have questions or concerns regarding privacy or data handling on this site, reach out via the official GitHub repository:",
      githubLink: "github.com/smilekritik/tof-datamine-site",
      lastUpdated: "Last updated: 24 August 2026"
    },
    ru: {
      metaTitle: "Политика конфиденциальности — TOF Datamine",
      metaDesc: "Политика конфиденциальности TOF Datamine: настройки браузера, локальные черновики, ресурсы сайта и журналирование запросов приложением.",
      heroEyebrow: "КОНФИДЕНЦИАЛЬНОСТЬ",
      heroTitle: "Конфиденциальность и хранение данных",
      heroSubtitle: "Как приложение хранит настройки и записывает запросы.",

      secSummaryTitle: "Краткая суть",
      summaryIntro: "TOF Datamine — некоммерческий исследовательский архив без рекламы и трекеров. Мы не отслеживаем активность пользователей в интернете, не продаём данные и не используем системы поведенческой аналитики.",

      secInventoryTitle: "Инвентаризация данных",
      invAnalyticsTitle: "Аналитика и трекеры",
      invAnalyticsDesc: "Отсутствуют. На сайте нет счётчиков Google Analytics, Яндекс.Метрики или пикселей социальных сетей.",
      invCookiesTitle: "Постоянные настройки",
      invCookiesDesc: "Приложение хранит язык интерфейса и темы в localStorage или функциональных куки. Масштаб таблицы Multype и некоторые настройки вида страниц хранятся в localStorage. Эти значения остаются в браузере и не содержат профиль аккаунта.",
      invSessionTitle: "Временное состояние и восстановление",
      invSessionDesc: "Часть состояния интерфейса хранится только на текущей странице или в URL. Небольшие маркеры в localStorage и sessionStorage также используются для однократного восстановления после прежнего кэша Datamine.",
      invBuilderTitle: "Черновики Builder",
      invBuilderDesc: "Datamine Builder хранит черновики в localStorage и экспортирует файлы на ваше устройство. Он не публикует черновики на действующий сайт.",
      invFontsTitle: "Шрифты и медиафайлы",
      invFontsDesc: "Приложение загружает шрифты, скрипты, стили и игровые изображения с того же источника, что и страницу.",
      invLogsTitle: "Серверные логи инфраструктуры",
      invLogsDesc: "Это приложение журналирует время запроса, HTTP-метод и запрошенный URL. Его журнал запросов не добавляет IP-адрес клиента, User-Agent или статус ответа. У внешней инфраструктуры хостинга могут быть собственные правила.",

      secExternalTitle: "Внешние ссылки",
      externalDesc: "На сайте размещены ссылки на сторонние проекты, базы данных и репозитории (GitHub, интерактивные карты, утилиты сообщества). Переход по ним регулируется политиками конфиденциальности соответствующих сервисов.",

      secContactTitle: "Контакты и обновления",
      contactDesc: "По любым вопросам относительно работы сайта и обработки данных вы можете связаться через GitHub-репозиторий проекта:",
      githubLink: "github.com/smilekritik/tof-datamine-site",
      lastUpdated: "Дата обновления: 24 августа 2026"
    }
  };

  function getLanguage() {
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

  function renderPrivacyPage() {
    const lang = getLanguage();
    const t = PRIVACY_STRINGS[lang] || PRIVACY_STRINGS.en;

    document.title = t.metaTitle;
    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) metaDescTag.setAttribute("content", t.metaDesc);

    const root = document.querySelector("[data-privacy-app]");
    if (!root) return;

    root.innerHTML = `
      <article class="privacy-article">
        <!-- Hero -->
        <header class="privacy-hero">
          <p class="privacy-hero__eyebrow">${t.heroEyebrow}</p>
          <h1 class="privacy-hero__title">${t.heroTitle}</h1>
          <p class="privacy-hero__subtitle">${t.heroSubtitle}</p>
        </header>

        <!-- Executive Summary -->
        <section class="privacy-section">
          <div class="privacy-section__header">
            <h2 class="privacy-section__title">${t.secSummaryTitle}</h2>
          </div>
          <div class="privacy-prose">
            <p><strong>${t.summaryIntro}</strong></p>
          </div>
        </section>

        <!-- Inventory Grid -->
        <section class="privacy-section">
          <div class="privacy-section__header">
            <h2 class="privacy-section__title">${t.secInventoryTitle}</h2>
          </div>
          <div class="privacy-grid">
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invAnalyticsTitle}</h3>
              <p class="privacy-card__desc">${t.invAnalyticsDesc}</p>
            </div>
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invCookiesTitle}</h3>
              <p class="privacy-card__desc">${t.invCookiesDesc}</p>
            </div>
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invSessionTitle}</h3>
              <p class="privacy-card__desc">${t.invSessionDesc}</p>
            </div>
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invBuilderTitle}</h3>
              <p class="privacy-card__desc">${t.invBuilderDesc}</p>
            </div>
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invFontsTitle}</h3>
              <p class="privacy-card__desc">${t.invFontsDesc}</p>
            </div>
            <div class="privacy-card">
              <h3 class="privacy-card__title">${t.invLogsTitle}</h3>
              <p class="privacy-card__desc">${t.invLogsDesc}</p>
            </div>
          </div>
        </section>

        <!-- External Links -->
        <section class="privacy-section">
          <div class="privacy-section__header">
            <h2 class="privacy-section__title">${t.secExternalTitle}</h2>
          </div>
          <div class="privacy-prose">
            <p>${t.externalDesc}</p>
          </div>
        </section>

        <!-- Contact & Updates -->
        <section class="privacy-section">
          <div class="privacy-section__header">
            <h2 class="privacy-section__title">${t.secContactTitle}</h2>
          </div>
          <div class="privacy-prose">
            <p>${t.contactDesc} <a class="privacy-link" href="https://${t.githubLink}" target="_blank" rel="noopener noreferrer">${t.githubLink} ↗</a></p>
            <p class="privacy-updated">${t.lastUpdated}</p>
          </div>
        </section>
      </article>
    `;
  }

  window.addEventListener("datamine:language-change", renderPrivacyPage);
  window.addEventListener("datamine:languagechange", renderPrivacyPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderPrivacyPage, { once: true });
  } else {
    renderPrivacyPage();
  }
})();
