import React, { useEffect, useMemo, useState, useCallback } from "react";
import CareerCard from "../../components/CareerCard";
import api from "../../lib/api";
import "./Careers.css";

const Careers = () => {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ our language state (en / kh)
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLangChanged = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
      else setLang(localStorage.getItem("app_lang") || "en");
    };
    window.addEventListener("app-lang-changed", onLangChanged);
    return () => window.removeEventListener("app-lang-changed", onLangChanged);
  }, []);

  const pickText = useCallback(
    (en, km) => (lang === "km" ? km || en || "" : en || km || ""),
    [lang]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await api.get("/career-paths");
        if (!alive) return;
        setCareers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load career paths", err);
        if (!alive) return;
        setCareers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Top tags
  const allTags = useMemo(() => {
    const counts = new Map();
    careers.forEach((c) => {
      (c.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    const TOP_N = 8;
    return ["all", ...sorted.slice(0, TOP_N)];
  }, [careers]);

  // ✅ Search in BOTH languages (title + description)
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return careers.filter((c) => {
      const titleEn = String(c.title || "").toLowerCase();
      const titleKm = String(c.title_km || "").toLowerCase();
      const descEn = String(c.description || "").toLowerCase();
      const descKm = String(c.description_km || "").toLowerCase();

      const matchesQuery =
        !query ||
        titleEn.includes(query) ||
        titleKm.includes(query) ||
        descEn.includes(query) ||
        descKm.includes(query) ||
        (c.tags || []).some((x) => String(x).toLowerCase().includes(query));

      const matchesTag = tag === "all" ? true : (c.tags || []).includes(tag);

      return matchesQuery && matchesTag;
    });
  }, [q, tag, careers]);

  return (
    <div className="careers-page">
      <div className="careers-container">
        <div className="careers-hero">
          <h1 className="careers-title">
            {lang === "km" ? "ជំនាញ" : "Career Paths"}
          </h1>

          <p className="careers-subtitle">
            {lang === "km"
              ? "ជ្រើសរើសទិសដៅជំនាញ ហើយចាប់ផ្តើមរៀនវគ្គសិក្សាដែលត្រូវការ។"
              : "Choose a career direction and start learning the required skills."}
          </p>

          <div className="careers-controls">
            <input
              className="careers-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                lang === "km"
                  ? "ស្វែងរក: frontend, mobile, data, security..."
                  : "Search: frontend, mobile, data, security..."
              }
            />

            <select
              className="careers-select"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? (lang === "km" ? "ជំនាញទាំងអស់" : "All topics") : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="careers-empty">{lang === "km" ? "កំពុងផ្ទុក..." : "Loading..."}</div>
        ) : (
          <>
            <div className="careers-grid">
              {filtered.map((career) => (
                <CareerCard
                  key={career.id}
                  id={career.slug}
                  title={pickText(career.title, career.title_km)}
                  description={pickText(career.description, career.description_km)}
                  image={career.image_url}
                  courses={career.courses || []} // now array of objects from API
                  lang={lang} // optional: if your CareerCard wants it
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="careers-empty">
                {lang === "km"
                  ? "រកមិនឃើញជំនាញទេ។ សូមសាកល្បងពាក្យផ្សេង។"
                  : "No careers found. Try a different keyword."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Careers;
