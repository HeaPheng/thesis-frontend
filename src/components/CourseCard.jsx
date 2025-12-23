import React, { useEffect, useMemo, useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import "./CourseCard.css";

const FALLBACK_IMG =
  "https://via.placeholder.com/1200x700.png?text=Course+Thumbnail";

const toNumOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const showNum = (v) => (v === null ? "—" : v);

const CourseCard = ({
  id,
  slug,
  image,
  title,
  title_km, 
  description,
  description_km,
  lessons,
  units,
  qcm,
  coding,
}) => {
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

  // ✅ Khmer mode when lang === 'km'
  const pickText = (en, km) => (lang === "km" ? km || en || "" : en || km || "");

  const coursePath = `/courses/${slug ?? id}`;

  const lessonsN = toNumOrNull(lessons);  
  const unitsN = toNumOrNull(units);
  const qcmN = toNumOrNull(qcm);
  const codingN = toNumOrNull(coding);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        readMore: "អានបន្ថែម →",
        start: "ចាប់ផ្តើមរៀន",
        lessons: "មេរៀន",
        units: "ជំពូក",
        qcm: "សំណួរ QCM",
        coding: "Coding",
        noDesc: "មិនទាន់មានការពិពណ៌នាទេ។",
      };
    }
    return {
      readMore: "Read More →",
      start: "Start Learning",
      lessons: "Lessons",
      units: "Units",
      qcm: "QCM",
      coding: "Coding",
      noDesc: "No description yet.",
    };
  }, [lang]);

  const displayTitle = pickText(title, title_km) || "Course";
  const displayDesc = pickText(description, description_km);

  return (
    <Card className="course-card shadow-sm">
      <Link to={coursePath} className="course-img-wrapper">
        <Card.Img
          variant="top"
          src={image || FALLBACK_IMG}
          className="course-img"
          alt={displayTitle}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMG;
          }}
        />
      </Link>

      <div className="course-body">
        <h5 className="course-title">{displayTitle}</h5>

        <p className="course-description">{displayDesc || ui.noDesc}</p>

        <Link to={coursePath} className="read-more">
          {ui.readMore}
        </Link>

        <div className="course-meta mt-3">
          <span>📂 {showNum(unitsN)} {ui.units}</span>
          <span>📘 {showNum(lessonsN)} {ui.lessons}</span>
        </div>

        <div className="exercise-info mt-3">
          <span>📝 {showNum(qcmN)} {ui.qcm}</span>
          <span>💻 {showNum(codingN)} {ui.coding}</span>
        </div>

        <div className="course-card-footer">
          <Button as={Link} to={coursePath} className="exercise-btn">
            {ui.start}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
