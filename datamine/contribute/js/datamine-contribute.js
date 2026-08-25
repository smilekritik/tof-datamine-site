(function () {
  const CONTENT = {
    en: {
      metaTitle: "Contribute — TOF Datamine",
      metaDesc: "Help keep TOF Datamine current by providing a fresh Tower of Fantasy game export for regular Datamine updates, Multype research scans, or manual data corrections.",
      heroEyebrow: "CONTRIBUTE",
      heroTitle: "Help improve Datamine",
      heroSubtitle: "Provide a fresh game export, help with a Multype research scan, or prepare a correction to manually maintained data.",

      tabRegular: "Regular update",
      tabRegularSub: "~10 min",
      tabMultype: "Multype scan",
      tabMultypeSub: "~10 h",
      tabCorrections: "Fix data",
      tabCorrectionsSub: "Builder",
      tabsAria: "Contribution workflows",

      // Tab 1: Regular
      regularTitle: "Regular Datamine update",
      regularBadge: "~10 minutes",
      regularIntro: "Requires Windows, PowerShell, an installed Tower of Fantasy client, and Node.js. The portable package extracts game data and processes it automatically into Datamine files.",
      regularSteps: [
        {
          num: "1",
          title: "Download the Datamine exporter",
          desc: "Get the pre-configured fast exporter package:",
          link: {
            text: "Get exporter from GitHub",
            url: "https://github.com/smilekritik/tof-datamine-site/tree/main/tof-fast-datamine"
          }
        },
        {
          num: "2",
          title: "Create the raw export",
          desc: "Run SMALL for a regular handoff, or RUN_EXPORT_FULL.bat when the complete configured image set is needed:",
          code: "RUN_EXPORT_SMALL.bat"
        },
        {
          num: "3",
          title: "Keep the validated raw archive",
          desc: "SMALL creates <code>raw_exports_small.zip</code>. FULL creates <code>raw_exports_full.zip</code>. Archive creation stops if required source groups fail validation."
        },
        {
          num: "4",
          title: "Process the export",
          desc: "With Node.js installed, run RUN_PROCESS.bat. The script validates the exported data and prepares the Datamine files in <code>dist_datamine_bundle</code> automatically. After a successful run, this folder contains a complete, ready-to-use copy of the Datamine data structure as it is arranged for the website:",
          code: "RUN_PROCESS.bat"
        }
      ],

      // Tab 2: Multype
      multypeTitle: "Multype research scan",
      multypeBadge: "Export ~2–5 h · Scan ~2–5 h",
      multypeIntro: "Multype uses a full unpack of all game assets and a deep recursive scan of gameplay effect modifiers. This specialized research workflow is separate from regular updates.",
      multypeSteps: [
        {
          num: "1",
          title: "Export and unpack the full game",
          desc: "Export the complete game assets to structured JSON using FModel or UnrealExporter. Set UE_Version to <code>GAME_TowerOfFantasy</code>. <span class=\"contribute-step-time\">Expected export time: ~2–5 h.</span><br><br><strong>Global AES Key:</strong><br><code class=\"contribute-step__code\">0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8</code>",
          links: [
            { text: "FModel", url: "https://fmodel.app/" },
            { text: "UnrealExporter", url: "https://github.com/luk-gg/UnrealExporter" }
          ]
        },
        {
          num: "2",
          title: "Get Tower of Fantasy Exporter Scanner",
          desc: "Download or clone the scanner Python tool:",
          link: {
            text: "Get Exporter Scanner from GitHub",
            url: "https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner"
          }
        },
        {
          num: "3",
          title: "Run the scanner",
          desc: "Execute the scanner CLI against your JSON export folder to map AttributeName, Modifiers, and ModuleExtraType relationships. <span class=\"contribute-step-time\">Expected scan time: ~2–5 h:</span>",
          code: "python main_scanning_files.py --input path_to_json --mode 1"
        },
        {
          num: "4",
          title: "Mapping outputs",
          desc: "Use the generated mapping files for the Multype dataset: <code>unique_attributes_sorted.json</code> and <code>module_extra_to_files_mapping3.json</code> from the <code>Exported</code> folder."
        }
      ],

      // Tab 3: Corrections & Builder
      correctionsTitle: "Manual corrections & Builder workbench",
      correctionsBadge: "Client-side editor",
      correctionsIntro: "Found something that looks wrong? Certain Datamine layers are maintained by hand (readable item names, FCE boss composition, artwork associations, and Sequential EHP overrides). You can inspect them, prepare a local draft in Builder, and export files for review.",
      noticeDraft: "<strong>Local Draft & Publication Policy:</strong> Builder operates entirely in the browser, saving drafts to local storage and exporting JSON files. It does not publish directly to the live site — submitted files are verified by a maintainer before deployment.",
      noticeLang: "<strong>Language:</strong> Builder interface is available in English.",
      openBuilderBtn: "Open Datamine Builder",

      guidanceTitle: "Decision guide: what kind of issue did you find?",
      guidance1Q: "Raw game value or stat looks wrong in OOW / Sequential?",
      guidance1A: "Raw enemy HP, element resistances, base stats, and wave pools are extracted directly from client data tables and should first be verified against source tables. Do not manually overwrite extracted raw stats in Builder — report the discrepancy for source review.",
      guidance2Q: "Readable item name is missing, outdated, or awkward?",
      guidance2A: "Item renames are maintained in a dedicated translation layer. Open Items Builder, locate the numerical item ID or developer key, adjust the display name, and export the updated mapping.",
      guidance3Q: "Boss artwork mapping or mechanics composition is incorrect in FCE / OOW?",
      guidance3A: "Boss artwork associations, ability descriptions, and mechanics cards are maintained manually. Use FCE Card Builder or OOW Image Binder to adjust the composition and export the resulting dataset.",

      // Bottom Sections
      checklistTitle: "WHAT TO INCLUDE IN A REPORT",
      checklistSubtitle: "Include as much of the following as possible to help reproduce the issue:",
      checklistItems: [
        { label: "Affected section:", text: "OOW, FCE, Sequential, Items, Multype, or another page." },
        { label: "What looks wrong:", text: "Briefly describe the incorrect value, missing data, or visual problem." },
        { label: "Game snapshot / version:", text: "Include the Datamine snapshot (e.g. 6.3.0) or game client version if data-related." },
        { label: "Exact identifier:", text: "Item ID, boss name, season/floor number, or internal key (e.g. <code>boss_015_EX</code>)." },
        { label: "Evidence / reference:", text: "Screenshot, raw source value, or exported JSON fragment if available." },
        { label: "Steps to reproduce:", text: "For UI/browser issues, describe what you opened, selected, or searched for." }
      ],

      contactTitle: "CONTACT & SUBMISSION",
      contactIntro: "Send your exported files, bug reports, or questions to the project maintainer:",
      noContactsConfigured: "You can submit issue reports and file exports directly via GitHub Issues:",

      afterSendTitle: "WHAT HAPPENS AFTER YOU SEND DATA?",
      afterSendDesc: "1. The maintainer verifies the submitted export against source game tables.<br>2. Canonical processors and automated contract tests (<code>npm test</code>) are executed.<br>3. The static Datamine archive is regenerated and published to the live site."
    },
    ru: {
      metaTitle: "Участие — TOF Datamine",
      metaDesc: "Помогите поддерживать TOF Datamine в актуальном состоянии: предоставьте свежий экспорт игры, помогите со сканированием Multype или подготовьте исправление данных.",
      heroEyebrow: "УЧАСТИЕ",
      heroTitle: "Помочь улучшить Datamine",
      heroSubtitle: "Предоставьте свежий экспорт игры, помогите со сканированием Multype или подготовьте исправление вручную поддерживаемых данных.",

      tabRegular: "Обычное обновление",
      tabRegularSub: "~10 мин",
      tabMultype: "Сканирование Multype",
      tabMultypeSub: "~10 ч",
      tabCorrections: "Исправить данные",
      tabCorrectionsSub: "Builder",
      tabsAria: "Способы участия",

      // Tab 1: Regular
      regularTitle: "Обычное обновление Datamine",
      regularBadge: "~10 минут",
      regularIntro: "Для работы требуются Windows PowerShell, установленный клиент Tower of Fantasy и Node.js. Переносимый пакет извлекает данные игры и автоматически подготавливает файлы Datamine.",
      regularSteps: [
        {
          num: "1",
          title: "Скачайте экспортёр Datamine",
          desc: "Получите готовый пакет быстрого экспортёра:",
          link: {
            text: "Скачать экспортёр с GitHub",
            url: "https://github.com/smilekritik/tof-datamine-site/tree/main/tof-fast-datamine"
          }
        },
        {
          num: "2",
          title: "Создайте исходный экспорт",
          desc: "Для обычной передачи запустите SMALL. Если нужен полный настроенный набор изображений, используйте RUN_EXPORT_FULL.bat:",
          code: "RUN_EXPORT_SMALL.bat"
        },
        {
          num: "3",
          title: "Сохраните проверенный исходный архив",
          desc: "SMALL создаёт <code>raw_exports_small.zip</code>, FULL — <code>raw_exports_full.zip</code>. Если обязательные группы источников не прошли проверку, архив не создаётся."
        },
        {
          num: "4",
          title: "Обработайте экспорт",
          desc: "При установленном Node.js запустите RUN_PROCESS.bat. Скрипт проверит выгруженные данные и автоматически подготовит файлы Datamine в <code>dist_datamine_bundle</code>. После успешной обработки создаётся полная готовая копия данных Datamine в той же структуре, в которой они размещаются на сайте:",
          code: "RUN_PROCESS.bat"
        }
      ],

      // Tab 2: Multype
      multypeTitle: "Исследовательский скан Multype",
      multypeBadge: "Экспорт ~2–5 ч · Скан ~2–5 ч",
      multypeIntro: "В отличие от обычного Datamine, Multype требует полной распаковки ресурсов игры и глубокого рекурсивного сканирования модификаторов игровых эффектов. Это отдельная исследовательская задача, не входящая в обычные обновления.",
      multypeSteps: [
        {
          num: "1",
          title: "Распакуйте полный набор ресурсов игры",
          desc: "Выгрузите все ресурсы игры в формат structured JSON с помощью инструментов FModel или UnrealExporter. Укажите UE_Version как <code>GAME_TowerOfFantasy</code>. <span class=\"contribute-step-time\">Ожидаемое время экспорта: примерно 2–5 часов.</span><br><br><strong>Global AES Key:</strong><br><code class=\"contribute-step__code\">0x6E6B325B02B821BD46AF6B62B1E929DC89957DC6F8AA78210D5316798B7508F8</code>",
          links: [
            { text: "FModel", url: "https://fmodel.app/" },
            { text: "UnrealExporter", url: "https://github.com/luk-gg/UnrealExporter" }
          ]
        },
        {
          num: "2",
          title: "Скачайте Tower of Fantasy Exporter Scanner",
          desc: "Получите или клонируйте инструмент сканирования на Python:",
          link: {
            text: "Скачать Exporter Scanner с GitHub",
            url: "https://github.com/smilekritik/Tower-of-fantasy-exporter-scanner"
          }
        },
        {
          num: "3",
          title: "Запустите сканер",
          desc: "Выполните команду сканирования, указав путь к выгруженным JSON-файлам. Сканер обойдёт ассеты и построит связи между AttributeName, Modifiers и контекстами ModuleExtraType. <span class=\"contribute-step-time\">Ожидаемое время сканирования: примерно 2–5 часов:</span>",
          code: "python main_scanning_files.py --input путь_к_json --mode 1"
        },
        {
          num: "4",
          title: "Отправьте полученные результаты",
          desc: "Отправьте полученные файлы <code>unique_attributes_sorted.json</code> и <code>module_extra_to_files_mapping3.json</code> из папки <code>Exported</code>."
        }
      ],

      // Tab 3: Corrections & Builder
      correctionsTitle: "Ручные исправления и Builder",
      correctionsBadge: "Локальный редактор",
      correctionsIntro: "Нашли неточность? Часть данных архива поддерживается вручную (понятные названия предметов, карточки механик FCE, привязка артов боссов, ручные оверрайды EHP в Sequential). Вы можете открыть тот же локальный Builder, который используется для их подготовки, внести правки и экспортировать файл на проверку.",
      noticeDraft: "<strong>Локальный черновик и публикация:</strong> Builder работает полностью в браузере, сохраняет черновик локально и экспортирует файлы JSON. Он не публикует изменения на сайт напрямую — присланные файлы проверяются сопровождающим перед публикацией.",
      noticeLang: "<strong>Язык интерфейса:</strong> Интерфейс Builder доступен на английском языке.",
      openBuilderBtn: "Открыть Datamine Builder",

      guidanceTitle: "Руководство: какую ошибку вы обнаружили?",
      guidance1Q: "Неверные HP или статы в OOW / Sequential?",
      guidance1A: "Базовые характеристики (HP, сопротивления, пулы волн) извлекаются напрямую из игровых таблиц и должны сверяться с источником. Не перезаписывайте сырые игровые статы вручную в Builder — сообщите о расхождении для проверки источника.",
      guidance2Q: "Неудачное или отсутствующее понятное имя предмета?",
      guidance2A: "Переименования предметов поддерживаются в отдельном слое. Откройте Items Builder, найдите предмет по числовому ID или системному ключу, укажите корректное имя и экспортируйте файл.",
      guidance3Q: "Не тот арт босса или пропущена фаза механики?",
      guidance3A: "Привязка изображений боссов, описания навыков и карточки механик настраиваются вручную. Используйте FCE Card Builder или OOW Image Binder для корректировки сопоставлений и экспорта данных.",

      // Bottom Sections
      checklistTitle: "ЧТО УКАЗАТЬ В СООБЩЕНИИ",
      checklistSubtitle: "По возможности укажите следующую информацию, чтобы проблему можно было воспроизвести:",
      checklistItems: [
        { label: "Раздел Datamine:", text: "Истоки войны, FCE, Sequential, База предметов, Multype или другая страница." },
        { label: "Суть проблемы:", text: "Кратко опишите неверное значение, отсутствующие данные или визуальную ошибку." },
        { label: "Версия игры / снимок:", text: "Укажите версию снимка (например, 6.3.0) или версию клиента, если вопрос касается данных." },
        { label: "Точный идентификатор:", text: "ID предмета, имя босса, номер сезона/этажа или системный ключ (например, <code>boss_015_EX</code>)." },
        { label: "Подтверждение:", text: "Скриншот, значение из исходных данных или фрагмент экспортированного JSON при наличии." },
        { label: "Шаги для воспроизведения:", text: "Для ошибок интерфейса укажите, что именно вы открывали, выбирали или искали." }
      ],

      contactTitle: "СВЯЗЬ И ОТПРАВКА ДАННЫХ",
      contactIntro: "Отправить файлы, сообщения об ошибках или вопросы можно напрямую:",
      noContactsConfigured: "Вы можете отправить сообщение об ошибке и файлы через GitHub Issues:",

      afterSendTitle: "ЧТО ПРОИСХОДИТ ПОСЛЕ ОТПРАВКИ?",
      afterSendDesc: "1. Разработчик проверяет предоставленные файлы на соответствие ресурсам игры.<br>2. Запускаются канонические скрипты обработки и автоматические тесты (<code>npm test</code>).<br>3. Обновленный статический архив собирается и публикуется на сайте."
    }
  };

  function getLanguage() {
    if (typeof window !== "undefined") {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("tof-datamine-language="));
      if (match) {
        const val = match.split("=")[1];
        if (val === "ru" || val === "en") return val;
      }
      const stored = localStorage.getItem("tof-datamine-language");
      if (stored === "ru" || stored === "en") return stored;
    }
    return typeof document !== "undefined" && document.documentElement.lang === "ru" ? "ru" : "en";
  }

  function resolveInitialTab() {
    if (typeof window !== "undefined" && window.location && window.location.hash) {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#multype") return "multype";
      if (hash === "#corrections" || hash === "#builder") return "corrections";
      if (hash === "#regular") return "regular";
    }
    return "regular";
  }

  let activeTab = resolveInitialTab();

  function setTab(tabKey, updateHash = true) {
    activeTab = tabKey;
    const tabButtons = document.querySelectorAll("[data-tab-key]");
    const panels = document.querySelectorAll("[data-panel-key]");

    tabButtons.forEach((btn) => {
      const active = btn.dataset.tabKey === tabKey;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    panels.forEach((p) => {
      const active = p.dataset.panelKey === tabKey;
      p.classList.toggle("is-active", active);
    });

    if (updateHash && typeof window !== "undefined" && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", `#${tabKey}`);
    }
  }

  function renderPage() {
    const lang = getLanguage();
    const t = CONTENT[lang] || CONTENT.en;

    document.title = t.metaTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t.metaDesc);

    const root = document.querySelector("[data-contribute-app]");
    if (!root) return;

    const contacts = (window.DatamineSiteConfig && typeof window.DatamineSiteConfig.getConfiguredContacts === "function")
      ? window.DatamineSiteConfig.getConfiguredContacts()
      : [{ key: "github", label: "GitHub Issues", url: "https://github.com/smilekritik/tof-datamine-site/issues" }];

    const contactsHtml = contacts.length > 0
      ? contacts.map((c) => `<a class="contribute-contact-btn" href="${c.url}" target="_blank" rel="noopener noreferrer">${c.label} <span class="contribute-action-arrow">↗</span></a>`).join("")
      : `<a class="contribute-contact-btn" href="https://github.com/smilekritik/tof-datamine-site/issues" target="_blank" rel="noopener noreferrer">GitHub Issues <span class="contribute-action-arrow">↗</span></a>`;

    const renderStepsHtml = (steps) => steps.map((s) => `
      <li class="contribute-step">
        <span class="contribute-step__num">${s.num}</span>
        <div class="contribute-step__content">
          <strong>${s.title}</strong>
          <div>${s.desc}</div>
          ${s.links ? `<div class="contribute-step__action" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">${s.links.map((l) => `<a class="contribute-action-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.text} <span class="contribute-action-arrow">↗</span></a>`).join("")}</div>` : ""}
          ${s.link ? `<div class="contribute-step__action"><a class="contribute-action-link" href="${s.link.url}" target="_blank" rel="noopener noreferrer">${s.link.text} <span class="contribute-action-arrow">↗</span></a></div>` : ""}
          ${s.code ? `<code class="contribute-step__code">${s.code}</code>` : ""}
        </div>
      </li>
    `).join("");

    root.innerHTML = `
      <!-- Hero -->
      <section class="contribute-hero">
        <p class="contribute-hero__eyebrow">${t.heroEyebrow}</p>
        <h1 class="contribute-hero__title">${t.heroTitle}</h1>
        <p class="contribute-hero__subtitle">${t.heroSubtitle}</p>
      </section>

      <!-- 3 Tabs Navigation -->
      <nav class="contribute-tabs" role="tablist" aria-label="${t.tabsAria}">
        <button class="contribute-tab-button${activeTab === "regular" ? " is-active" : ""}" type="button" role="tab" data-tab-key="regular" aria-selected="${activeTab === "regular"}">
          <span class="contribute-tab-button__label">${t.tabRegular}</span>
          <span class="contribute-tab-button__sub contribute-tab-button__sub--gold">${t.tabRegularSub}</span>
        </button>
        <button class="contribute-tab-button${activeTab === "multype" ? " is-active" : ""}" type="button" role="tab" data-tab-key="multype" aria-selected="${activeTab === "multype"}">
          <span class="contribute-tab-button__label">${t.tabMultype}</span>
          <span class="contribute-tab-button__sub contribute-tab-button__sub--pink">${t.tabMultypeSub}</span>
        </button>
        <button class="contribute-tab-button${activeTab === "corrections" ? " is-active" : ""}" type="button" role="tab" data-tab-key="corrections" aria-selected="${activeTab === "corrections"}">
          <span class="contribute-tab-button__label">${t.tabCorrections}</span>
          <span class="contribute-tab-button__sub contribute-tab-button__sub--teal">${t.tabCorrectionsSub}</span>
        </button>
      </nav>

      <!-- Tab 1 Panel: Regular Update -->
      <section class="contribute-panel${activeTab === "regular" ? " is-active" : ""}" data-panel-key="regular" role="tabpanel" aria-label="${t.regularTitle}">
        <article class="contribute-card">
          <div class="contribute-card__header">
            <h2 class="contribute-card__title">${t.regularTitle}</h2>
            <span class="contribute-card__badge">${t.regularBadge}</span>
          </div>
          <div class="contribute-prose">
            <p>${t.regularIntro}</p>
          </div>
          <ol class="contribute-steps">
            ${renderStepsHtml(t.regularSteps)}
          </ol>
        </article>
      </section>

      <!-- Tab 2 Panel: Multype Research Scan -->
      <section class="contribute-panel${activeTab === "multype" ? " is-active" : ""}" data-panel-key="multype" role="tabpanel" aria-label="${t.multypeTitle}">
        <article class="contribute-card">
          <div class="contribute-card__header">
            <h2 class="contribute-card__title">${t.multypeTitle}</h2>
            <span class="contribute-card__badge contribute-card__badge--pink">${t.multypeBadge}</span>
          </div>
          <div class="contribute-prose">
            <p>${t.multypeIntro}</p>
          </div>
          <ol class="contribute-steps">
            ${renderStepsHtml(t.multypeSteps)}
          </ol>
        </article>
      </section>

      <!-- Tab 3 Panel: Fix Data / Builder -->
      <section class="contribute-panel${activeTab === "corrections" ? " is-active" : ""}" data-panel-key="corrections" role="tabpanel" aria-label="${t.correctionsTitle}">
        <article class="contribute-card">
          <div class="contribute-card__header">
            <h2 class="contribute-card__title">${t.correctionsTitle}</h2>
            <span class="contribute-card__badge contribute-card__badge--teal">${t.correctionsBadge}</span>
          </div>
          <div class="contribute-prose">
            <p>${t.correctionsIntro}</p>
          </div>

          <div class="contribute-notice-box">
            <p>${t.noticeDraft}</p>
            <p>${t.noticeLang}</p>
          </div>

          <div class="contribute-guidance">
            <div class="contribute-guidance-item">
              <p class="contribute-guidance-item__question">${t.guidance1Q}</p>
              <p class="contribute-guidance-item__answer">${t.guidance1A}</p>
            </div>
            <div class="contribute-guidance-item">
              <p class="contribute-guidance-item__question">${t.guidance2Q}</p>
              <p class="contribute-guidance-item__answer">${t.guidance2A}</p>
            </div>
            <div class="contribute-guidance-item">
              <p class="contribute-guidance-item__question">${t.guidance3Q}</p>
              <p class="contribute-guidance-item__answer">${t.guidance3A}</p>
            </div>
          </div>

          <div style="margin-top: 14px;">
            <a class="contribute-action-link" href="../../datamine-builder/" target="_blank" rel="noopener noreferrer">${t.openBuilderBtn} <span class="contribute-action-arrow">→</span></a>
          </div>
        </article>
      </section>

      <!-- Shared Bottom Grid -->
      <section class="contribute-bottom-grid">
        <aside class="contribute-subcard">
          <h3 class="contribute-subcard__title">${t.checklistTitle}</h3>
          <p class="contribute-subcard__subtitle">${t.checklistSubtitle}</p>
          <ul class="contribute-checklist">
            ${t.checklistItems.map((item) => `
              <li class="contribute-checklist-item">
                <span class="contribute-checklist-item__bullet">›</span>
                <div>
                  <strong class="contribute-checklist-item__label">${item.label}</strong>
                  <span class="contribute-checklist-item__text"> ${item.text}</span>
                </div>
              </li>
            `).join("")}
          </ul>
        </aside>

        <aside class="contribute-subcard">
          <h3 class="contribute-subcard__title">${t.contactTitle}</h3>
          <div class="contribute-prose">
            <p>${contacts.length > 0 ? t.contactIntro : t.noContactsConfigured}</p>
          </div>
          <div class="contribute-contacts-list">
            ${contactsHtml}
          </div>
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--contrib-border);" class="contribute-prose">
            <p style="font-size: 11.5px; color: var(--contrib-muted);">${t.afterSendDesc}</p>
          </div>
        </aside>
      </section>
    `;
  }

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-tab-key]");
    if (tabBtn) {
      setTab(tabBtn.dataset.tabKey, true);
    }
  });

  window.addEventListener("hashchange", () => {
    const nextTab = resolveInitialTab();
    if (nextTab !== activeTab) {
      setTab(nextTab, false);
    }
  });

  window.addEventListener("datamine:language-change", renderPage);
  window.addEventListener("datamine:languagechange", renderPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderPage, { once: true });
  } else {
    renderPage();
  }
})();
