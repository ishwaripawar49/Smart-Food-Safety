import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import enTranslations from "../locales/en.json";
import mrTranslations from "../locales/mr.json";
import hiTranslations from "../locales/hi.json";

export const AVAILABLE_LANGUAGES = [
  { code: "mr", label: "मराठी", nativeName: "मराठी" },
  { code: "hi", label: "हिंदी", nativeName: "हिंदी" },
  { code: "en", label: "English", nativeName: "English" },
];

const TRANSLATIONS = {
  en: enTranslations,
  mr: mrTranslations,
  hi: hiTranslations,
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("foodsafe_easy_lang");
      if (saved && ["en", "mr", "hi"].includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage access issues
    }
    return "mr"; // Default to Marathi for local citizen accessibility
  });

  const changeLanguage = useCallback((langCode) => {
    if (["en", "mr", "hi"].includes(langCode)) {
      setLanguageState(langCode);
      try {
        localStorage.setItem("foodsafe_easy_lang", langCode);
      } catch {
        // Ignore localStorage error
      }
      document.documentElement.lang = langCode;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (keyPath, variables = {}) => {
      if (!keyPath || typeof keyPath !== "string") return "";

      const keys = keyPath.split(".");
      let current = TRANSLATIONS[language];
      let fallback = TRANSLATIONS.en;

      // Navigate active language
      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          current = null;
          break;
        }
      }

      // If missing in active language, fallback to English
      let result = current;
      if (result === null || result === undefined) {
        for (const k of keys) {
          if (fallback && typeof fallback === "object" && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = null;
            break;
          }
        }
        result = fallback;
      }

      // If still missing, return key path
      if (result === null || result === undefined) {
        return keyPath;
      }

      // Interpolate {{var}}
      if (typeof result === "string" && variables && Object.keys(variables).length > 0) {
        let interpolated = result;
        for (const [vKey, vVal] of Object.entries(variables)) {
          interpolated = interpolated.replace(
            new RegExp(`{{\\s*${vKey}\\s*}}`, "g"),
            String(vVal)
          );
        }
        return interpolated;
      }

      return result;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage: changeLanguage,
      changeLanguage,
      t,
      languages: AVAILABLE_LANGUAGES,
    }),
    [language, changeLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for components outside provider
    return {
      t: (key) => key,
      language: "en",
      changeLanguage: () => {},
    };
  }
  return {
    t: context.t,
    language: context.language,
    changeLanguage: context.changeLanguage,
    i18n: {
      language: context.language,
      changeLanguage: context.changeLanguage,
    },
  };
}

export default LanguageContext;
