import "./LanguageSwitcher.css";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language; // "en" or "kh"

  const toggleLang = () => {
    const newLang = currentLang === "en" ? "kh" : "en";
    i18n.changeLanguage(newLang); // switch i18next language
  };

  return (
    <div className="lang-icon-container" onClick={toggleLang}>
      <i className="bi bi-translate lang-icon"></i>
      <small className="lang-label">
        {currentLang === "en" ? "ENG" : "KH"}
      </small>
    </div>
  );
};

export default LanguageSwitcher;
