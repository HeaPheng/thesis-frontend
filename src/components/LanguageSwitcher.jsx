import "./LanguageSwitcher.css";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo } from "react";

const normalizeLang = (v) => (v === "kh" ? "km" : v); // support old "kh"

const applyLangToDom = (lang) => {
  const isKm = lang === "km";
  document.documentElement.classList.toggle("lang-km", isKm);
  document.documentElement.lang = isKm ? "km" : "en";
};

const applyLangToCoding = (lang) => {
  // Map UI language to coding language (keep simple)
  // If later you want different coding languages (js/python/etc), adjust here.
  const codingLang = lang === "km" ? "km" : "en";

  try {
    localStorage.setItem("coding_lang", codingLang);
  } catch {}

  window.dispatchEvent(new CustomEvent("coding-lang-changed", { detail: { lang: codingLang } }));
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLang = useMemo(() => normalizeLang(i18n.language || "en"), [i18n.language]);

  // ✅ ensure DOM class is correct on first mount / refresh
  useEffect(() => {
    const saved = normalizeLang(localStorage.getItem("app_lang") || currentLang || "en");
    applyLangToDom(saved);

    // ✅ also sync coding language on refresh
    applyLangToCoding(saved);
  }, [currentLang]);

  const toggleLang = () => {
    const newLang = currentLang === "en" ? "km" : "en";

    i18n.changeLanguage(newLang);

    try {
      localStorage.setItem("app_lang", newLang);
    } catch {}

    // ✅ switch font immediately
    applyLangToDom(newLang);

    // ✅ notify general UI listeners
    window.dispatchEvent(new CustomEvent("app-lang-changed", { detail: { lang: newLang } }));

    // ✅ notify coding listeners too
    applyLangToCoding(newLang);
  };

  return (
    <div
      className="lang-icon-container"
      onClick={toggleLang}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggleLang();
      }}
    >
      <i className="bi bi-translate lang-icon"></i>
      <small className="lang-label">{currentLang === "en" ? "ENG" : "KM"}</small>
    </div>
  );
};

export default LanguageSwitcher;
