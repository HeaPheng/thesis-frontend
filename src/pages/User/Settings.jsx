import React from "react";
import { Container, Card, Button } from "react-bootstrap";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "./User.css";

export default function Settings({ lang, setLang }) {
  const clearLocal = () => {
    const keep = ["isLoggedIn"]; // keep login if you want
    const copy = {};
    keep.forEach((k) => (copy[k] = localStorage.getItem(k)));

    localStorage.clear();

    keep.forEach((k) => {
      if (copy[k] !== null) localStorage.setItem(k, copy[k]);
    });

    alert("Settings cleared (localStorage).");
  };

  return (
    <div className="user-page">
      <Container className="user-container">
        <div className="user-header">
          <h2 className="user-title">Settings</h2>
          <div className="user-sub">Preferences and app options</div>
        </div>

        <Card className="user-card user-panel">
          <h4 className="user-panel-title">Language</h4>
          <div className="user-muted">Choose English or Khmer.</div>

          <div className="user-row">
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>
        </Card>

        <Card className="user-card user-panel mt-3">
          <h4 className="user-panel-title">Danger zone</h4>
          <div className="user-muted">
            This clears saved demo data from localStorage.
          </div>

          <div className="user-actions mt-3">
            <Button variant="danger" onClick={clearLocal}>
              Clear local data
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
}
