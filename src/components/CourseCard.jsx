import React, { useEffect, useMemo, useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import api from "../lib/api";
import "./CourseCard.css";

const FALLBACK_IMG =
  "https://via.placeholder.com/1200x700.png?text=Course+Thumbnail";

const showNum = (v) => (v === null || v === undefined ? "—" : v);

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

  // ✅ backend truth (from Courses.jsx)
  isSaved,
  isFavourite,
}) => {
  // =========================
  // Language
  // =========================
  const [lang, setLang] = useState(
    () => localStorage.getItem("app_lang") || "en"
  );

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const pickText = (en, km) =>
    lang === "km" ? km || en || "" : en || km || "";

  // =========================
  // Hover
  // =========================
  const [hovered, setHovered] = useState(false);

  // =========================
  // 🔐 Authoritative state
  // =========================
  const [saved, setSaved] = useState(null);
  const [favourite, setFavourite] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Sync local state from backend props
  useEffect(() => {
    if (typeof isSaved === "boolean") {
      setSaved(isSaved);
    }
    if (typeof isFavourite === "boolean") {
      setFavourite(isFavourite);
    }
  }, [isSaved, isFavourite]);

  const courseKey = slug ?? id;
  const coursePath = `/courses/${courseKey}`;

  // =========================
  // UI TEXT
  // =========================
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

  // =========================
  // 🔥 ACTIONS
  // =========================

  const toggleSave = async () => {
    if (loading || saved === null) return;

    const prev = saved;
    setSaved(!prev);
    setLoading(true);

    try {
      if (!prev) {
        await api.post(`/auth/courses/${courseKey}/save`);
      } else {
        await api.delete(`/auth/courses/${courseKey}/save`);
        setFavourite(false); // cannot favourite without save
      }
    } catch (e) {
      setSaved(prev);
      console.error("SAVE ERROR:", e.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavourite = async () => {
    if (loading || !saved || favourite === null) return;

    const prev = favourite;
    setFavourite(!prev);
    setLoading(true);

    try {
      const res = await api.post(
        `/auth/courses/${courseKey}/favourite`
      );

      if (typeof res.data?.is_favourite === "boolean") {
        setFavourite(res.data.is_favourite);
      }
    } catch (e) {
      setFavourite(prev);
      console.error("FAV ERROR:", e.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ⛔ Wait for backend truth
  // =========================
  if (saved === null || favourite === null) {
    return null;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <Card
      className={`course-card ${hovered ? "hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow */}
      <div className={`card-glow ${hovered ? "active" : ""}`} />

      {/* ACTION BUTTONS */}
      <div className="action-buttons">
        <button
          className={`action-btn save-btn ${saved ? "active" : ""}`}
          onClick={toggleSave}
          disabled={loading}
          title={saved ? "Saved" : "Save"}
        >
          ❤️
        </button>

        <button
          className={`action-btn fav-btn ${favourite ? "active" : ""}`}
          onClick={toggleFavourite}
          disabled={!saved || loading}
          title={!saved ? "Save first" : "Favourite"}
        >
          ⭐
        </button>
      </div>

      {/* IMAGE */}
      <Link to={coursePath} className="image-wrapper">
        <img
          src={image || FALLBACK_IMG}
          alt={title}
          className="card-image"
          onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
        />
        <div className="image-overlay" />
        <div className={`shimmer-effect ${hovered ? "active" : ""}`} />
      </Link>

      {/* CONTENT */}
      <div className="card-content">
        <h5 className="card-title-custom">
          {pickText(title, title_km)}
        </h5>

        <p className="card-description">
          {pickText(description, description_km) || ui.noDesc}
        </p>

        <Link to={coursePath} className="read-more-link">
          {ui.readMore}
        </Link>

        {/* META */}
        <div className="meta-row">
          <span className="meta-item">
            📂 {showNum(units)} {ui.units}
          </span>
          <span className="meta-item">
            📘 {showNum(lessons)} {ui.lessons}
          </span>
        </div>

        {/* EXERCISES */}
        <div className="exercise-row">
          <span className="exercise-item">
            📝 {showNum(qcm)} {ui.qcm}
          </span>
          <span className="exercise-item">
            💻 {showNum(coding)} {ui.coding}
          </span>
        </div>

        {/* CTA */}
        <Button as={Link} to={coursePath} className="start-btn">
          ✨ {ui.start}
        </Button>
      </div>
    </Card>
  );
};

export default CourseCard;
