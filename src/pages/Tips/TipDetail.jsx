// src/pages/Tips/TipDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import tipsData from "../../data/tipsData";
import "./TipDetail.css";

export default function TipDetail() {
  const { slug } = useParams();
  const tip = tipsData.find((t) => t.slug === slug);

  const [activeId, setActiveId] = useState("");

  // build ids for each section
  const sections = useMemo(() => {
    if (!tip) return [];
    return tip.sections.map((s, idx) => ({
      ...s,
      _id: `section-${idx + 1}`,
      _index: idx,
    }));
  }, [tip]);

  // Highlight active section while scrolling
  useEffect(() => {
    if (!sections.length) return;

    const ids = sections.map((s) => s._id);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // pick the visible one with highest intersection
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: "-20% 0px -60% 0px", // makes highlighting feel nicer
      }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    // account for sticky navbar height
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (!tip) {
    return (
      <div className="tipdetail-page">
        <Container className="tipdetail-container">
          <h2 style={{ color: "white" }}>Tip not found</h2>
          <Link to="/tips" className="tipdetail-back">
            ← Back to Tips
          </Link>
        </Container>
      </div>
    );
  }

  return (
    <div className="tipdetail-page">
      <Container className="tipdetail-container">
        <Link to="/tips" className="tipdetail-back">
          ← Back to Tips
        </Link>

        <div className="tipdetail-layout">
          {/* LEFT: Sidebar */}
          <aside className="tipdetail-sidebar">
            <div className="tipdetail-side-title">On this page</div>

            <div className="tipdetail-side-list">
              {sections.map((s) => (
                <button
                  key={s._id}
                  className={`tipdetail-side-item ${
                    activeId === s._id ? "active" : ""
                  }`}
                  onClick={() => scrollTo(s._id)}
                  type="button"
                >
                  {s._index + 1}. {s.heading}
                </button>
              ))}
            </div>
          </aside>

          {/* RIGHT: Content */}
          <main className="tipdetail-main">
            {/* HEADER CARD */}
            <div className="tipdetail-head">
              <div className="tipdetail-meta">
                <span className="tipdetail-chip">{tip.level}</span>
                <span className="tipdetail-date">{tip.date}</span>
              </div>

              <h1 className="tipdetail-title">{tip.title}</h1>
              <p className="tipdetail-summary">{tip.summary}</p>

              {/* Optional top cover image for the whole tip */}
              {tip.cover && (
                <div className="tipdetail-cover">
                  <img src={tip.cover} alt={tip.title} />
                </div>
              )}
            </div>

            {/* SECTIONS */}
            <div className="tipdetail-body">
              {sections.map((s) => (
                <div key={s._id} id={s._id} className="tipdetail-section">
                  <h3>{s.heading}</h3>
                  <p>{s.text}</p>
                
                  {s.code && (
                    <pre className="tipdetail-code">
                      <code>{s.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </main>
        </div>
      </Container>
    </div>
  );
}
