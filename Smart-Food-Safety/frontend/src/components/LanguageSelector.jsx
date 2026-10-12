import { Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector({ style = {}, variant = "standard" }) {
  const { language, changeLanguage, languages } = useLanguage();

  return (
    <div
      className="language-selector-container"
      role="region"
      aria-label="Language selection"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "var(--color-surface, #ffffff)",
        padding: "4px 8px",
        borderRadius: "var(--radius-full, 9999px)",
        border: "1px solid var(--color-border, #e2e8f0)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <Globe size={16} style={{ color: "var(--color-primary, #16a34a)", flexShrink: 0 }} aria-hidden="true" />
      <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>
        Current language: {languages.find((l) => l.code === language)?.label || language}
      </span>
      <div style={{ display: "inline-flex", gap: "3px" }} role="group" aria-label="Available languages">
        {languages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              aria-pressed={isActive}
              style={{
                background: isActive ? "var(--color-primary, #16a34a)" : "transparent",
                color: isActive ? "#ffffff" : "var(--color-text, #1e293b)",
                border: "none",
                borderRadius: "var(--radius-full, 9999px)",
                padding: "4px 10px",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                minHeight: "32px",
                outlineOffset: "2px",
              }}
            >
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
