(function (root) {
  const STORAGE_KEY = "tof-datamine-language";
  const LANGUAGE_COOKIE = "tof-datamine-language";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const LEGACY_STORAGE_KEYS = ["fce-language", "seq-language", "items-language"];

  function readCookie(name) {
    if (typeof document === "undefined") return "";
    const prefix = encodeURIComponent(name) + "=";
    const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
  }

  function writeLanguageCookie(value) {
    if (typeof document === "undefined" || typeof location === "undefined") return;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(LANGUAGE_COOKIE)}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/datamine/; SameSite=Lax${secure}`;
  }

  function resolveInitialLanguage() {
    if (root.DatamineHeader && typeof root.DatamineHeader.getLanguage === "function") {
      return root.DatamineHeader.getLanguage();
    }
    const cookieLanguage = readCookie(LANGUAGE_COOKIE);
    if (cookieLanguage === "ru" || cookieLanguage === "en") {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, cookieLanguage);
      return cookieLanguage;
    }

    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ru" || stored === "en") {
        writeLanguageCookie(stored);
        return stored;
      }

      for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy === "ru" || legacy === "en") {
          localStorage.setItem(STORAGE_KEY, legacy);
          writeLanguageCookie(legacy);
          return legacy;
        }
      }
    }

    if (typeof document !== "undefined" && document.documentElement && document.documentElement.lang === "ru") {
      return "ru";
    }

    return "en";
  }

  let currentLang = resolveInitialLanguage();
  const subscribers = new Set();

  function getLanguage() {
    if (root.DatamineHeader && typeof root.DatamineHeader.getLanguage === "function") {
      return root.DatamineHeader.getLanguage();
    }
    return currentLang;
  }

  function setLanguage(nextLang, notify = true) {
    const normalized = nextLang === "ru" ? "ru" : "en";
    const changed = normalized !== currentLang;
    currentLang = normalized;

    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, currentLang);
    writeLanguageCookie(currentLang);

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = currentLang;
    }

    if (root.DatamineHeader && typeof root.DatamineHeader.setLanguage === "function") {
      if (root.DatamineHeader.getLanguage() !== currentLang) {
        root.DatamineHeader.setLanguage(currentLang, false);
      }
    }

    if (notify && changed && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("datamine:language-change", { detail: { language: currentLang } }));
      window.dispatchEvent(new CustomEvent("datamine:languagechange", { detail: { language: currentLang } }));
    }

    subscribers.forEach((cb) => {
      try {
        cb(currentLang);
      } catch (err) {
        console.error("Error in language subscriber:", err);
      }
    });
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("datamine:language-change", (e) => {
      const lang = e.detail?.language;
      if ((lang === "ru" || lang === "en") && lang !== currentLang) {
        currentLang = lang;
        subscribers.forEach((cb) => cb(currentLang));
      }
    });
  }

  const DatamineI18n = {
    getLanguage,
    setLanguage,
    subscribe,
    STORAGE_KEY,
    LANGUAGE_COOKIE
  };

  root.DatamineI18n = DatamineI18n;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DatamineI18n;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
