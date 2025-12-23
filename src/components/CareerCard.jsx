import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "./CareerCard.css";

const CareerCard = ({
  id, // slug
  title,
  description,
  image,
  image_url, // optional if API returns image_url
  courses = [], // ✅ can be array of strings OR array of objects
}) => {
  const imgSrc = image || image_url || "/placeholder-career.png";

  // ✅ our language switch (en / km)
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

  // ✅ normalize courses (support old + new API)
  const normalizedCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];

    // old: ["HTML", "CSS"]
    if (courses.length > 0 && typeof courses[0] === "string") {
      return courses.map((t, idx) => ({
        key: `s-${idx}`,
        text: String(t),
      }));
    }

    // new: [{id, slug, title, title_km, thumbnail_url}]
    return courses
      .filter((c) => c && typeof c === "object")
      .map((c, idx) => ({
        key: c.slug || c.id || `o-${idx}`,
        text: pickText(c.title, c.title_km),
      }));
  }, [courses, pickText]);

  return (
    <Link to={`/careers/${id}`} className="career-card-link">
      <div className="career-card">
        {/* IMAGE */}
        <div className="career-img-wrapper">
          <img
            src={imgSrc}
            alt={title}
            className="career-img"
            onError={(e) => {
              e.currentTarget.src = "/placeholder-career.png";
            }}
          />
        </div>

        {/* BODY */}
        <div className="career-body">
          <h3 className="career-title">
            <i className="bi bi-briefcase-fill career-icon-title"></i>
            {title}
          </h3>

          <p className="career-description">{description}</p>

          <h5 className="career-subtitle">
            <i className="bi bi-book-fill career-icon-sub"></i>
            {lang === "km" ? "វគ្គដែលត្រូវរៀន" : "Required Courses"}
          </h5>

          <ul className="career-course-list">
            {normalizedCourses.map((c) => (
              <li key={c.key}>
                <i className="bi bi-check-circle-fill career-course-icon"></i>
                {c.text}
              </li>
            ))}
          </ul>

          <button className="career-btn" type="button">
            {lang === "km" ? "ចាប់ផ្តើមរៀនជំនាញ" : "Start Learning Path"}{" "}
            <i className="bi bi-arrow-right-short"></i>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default CareerCard;
