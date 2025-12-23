import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import "./Tips.css";

export default function Tips() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ language reactive (en / km) via localStorage + CustomEvent
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
      else setLang(localStorage.getItem("app_lang") || "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const pickText = useCallback(
    (en, km) => (lang === "km" ? km || en || "" : en || km || ""),
    [lang]
  );

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        loading: "កំពុងផ្ទុក...",
        title: "គន្លឹះ និងមេរៀនខ្លីៗ",
        subtitle: "ដំណោះស្រាយរហ័សសម្រាប់បញ្ហាកូដទូទៅ (CSS, HTML, Bootstrap...)",
        searchPh: "ស្វែងរក៖ center div, bootstrap install, text-align...",
        allTopics: "ប្រធានបទទាំងអស់",
        read: "អានបន្ត →",
        empty: "រកមិនឃើញគន្លឹះទេ។ សូមសាកពាក្យផ្សេង។",
        beginner: "អ្នកចាប់ផ្តើម",
      };
    }
    return {
      loading: "Loading...",
      title: "Tips & Mini Tutorials",
      subtitle: "Quick solutions for common coding problems (CSS, HTML, Bootstrap, etc.)",
      searchPh: "Search: center div, bootstrap install, text-align...",
      allTopics: "All topics",
      read: "Read →",
      empty: "No tips found. Try a different keyword.",
      beginner: "Beginner",
    };
  }, [lang]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get("/tips")
      .then((res) => {
        if (!alive) return;
        setTips(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to load /tips", err);
        if (!alive) return;
        setTips([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set();
    tips.forEach((t) => (Array.isArray(t.tags) ? t.tags : []).forEach((x) => set.add(x)));
    return ["all", ...Array.from(set)];
  }, [tips]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return tips.filter((t) => {
      // If later you add title_km/summary_km in backend, this will start working automatically
      const title = pickText(t.title, t.title_km).toLowerCase();
      const summary = pickText(t.summary, t.summary_km).toLowerCase();
      const tagsArr = Array.isArray(t.tags) ? t.tags : [];

      const matchesQuery =
        !query ||
        title.includes(query) ||
        summary.includes(query) ||
        tagsArr.some((x) => (x || "").toLowerCase().includes(query));

      const matchesTag = tag === "all" ? true : tagsArr.includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [tips, q, tag, pickText]);

  if (loading) {
    return (
      <div className="tips-page">
        <Container className="tips-container">
          <div style={{ padding: 24, color: "white" }}>{ui.loading}</div>
        </Container>
      </div>
    );
  }

  return (
    <div className="tips-page">
      <Container className="tips-container">
        <div className="tips-hero">
          <h1 className="tips-title">{ui.title}</h1>
          <p className="tips-subtitle">{ui.subtitle}</p>

          <div className="tips-controls">
            <input
              className="tips-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ui.searchPh}
            />

            <select className="tips-select" value={tag} onChange={(e) => setTag(e.target.value)}>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? ui.allTopics : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Row className="gy-4">
          {filtered.map((tip) => {
            const title = pickText(tip.title, tip.title_km);
            const summary = pickText(tip.summary, tip.summary_km);

            const coverSrc = tip.cover_url
              ? tip.cover_url.startsWith("http")
                ? tip.cover_url
                : tip.cover_url.startsWith("/storage/")
                ? `http://127.0.0.1:8000${tip.cover_url}`
                : `http://127.0.0.1:8000/storage/${tip.cover_url}`
              : null;

            const dateText = (() => {
              const d = tip.published_at || tip.created_at;
              if (!d) return "";
              const date = new Date(d);
              if (Number.isNaN(date.getTime())) return String(d);

              // ✅ Locale changes date language (km vs en)
              const locale = lang === "km" ? "km-KH" : "en-GB";
              return date.toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "2-digit",
              });
            })();

            return (
              <Col key={tip.slug} md={6} lg={4}>
                <Link to={`/tips/${tip.slug}`} className="tips-card">
                  {coverSrc ? (
                    <div className="tips-card-cover">
                      <img src={coverSrc} alt={title} />
                    </div>
                  ) : null}

                  <div className="tips-card-top">
                    <div className="tips-chip">{tip.level || ui.beginner}</div>
                    <div className="tips-date">{dateText}</div>
                  </div>

                  <h3 className="tips-card-title">{title}</h3>
                  <p className="tips-card-summary">{summary}</p>

                  <div className="tips-tags">
                    {(Array.isArray(tip.tags) ? tip.tags : []).slice(0, 3).map((t) => (
                      <span key={t} className="tips-tag">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="tips-read">{ui.read}</div>
                </Link>
              </Col>
            );
          })}
        </Row>

        {filtered.length === 0 && <div className="tips-empty">{ui.empty}</div>}
      </Container>
    </div>
  );
}
