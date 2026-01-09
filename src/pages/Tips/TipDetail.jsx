import React, { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import "./TipDetail.css";

export default function TipDetail() {
  const { slug } = useParams();

  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/tips/${slug}`)
      .then((res) => {
        if (!alive) return;
        setTip(res.data);
      })
      .catch((err) => {
        console.error("Failed to load tip detail:", err);
        if (!alive) return;
        setTip(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  const sections = useMemo(() => {
    if (!tip) return [];
    const raw = Array.isArray(tip.sections) ? tip.sections : [];
    return raw.map((s, idx) => ({
      ...s,
      _id: `section-${idx + 1}`,
      _index: idx,
    }));
  }, [tip]);

  useEffect(() => {
    if (!sections.length) return;

    const ids = sections.map((s) => s._id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { threshold: [0.2, 0.35, 0.5, 0.65], rootMargin: "-20% 0px -60% 0px" }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="tips-page">
        <Container className="tips-container">
          <div className="tips-loader">
            <div className="loader-wrapper">
              <div className="loader"></div>
              <div className="letter-wrapper">
                {"Loading...".split("").map((char, i) => (
                  <span key={i} className="loader-letter">
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

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
          <aside className="tipdetail-sidebar">
            <div className="tipdetail-side-title">On this page</div>

            <div className="tipdetail-side-list">
              {sections.map((s) => (
                <button
                  key={s._id}
                  className={`tipdetail-side-item ${activeId === s._id ? "active" : ""
                    }`}
                  onClick={() => scrollTo(s._id)}
                  type="button"
                >
                  {s._index + 1}. {s.heading}
                </button>
              ))}
            </div>
          </aside>

          <main className="tipdetail-main">
            <div className="tipdetail-head">
              <div className="tipdetail-meta">
                <span className="tipdetail-chip">{tip.level || "Beginner"}</span>
                <span className="tipdetail-date">
                  {(() => {
                    const d = tip.published_at || tip.created_at;
                    if (!d) return "";
                    const date = new Date(d);
                    if (Number.isNaN(date.getTime())) return String(d);

                    return date.toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    });
                  })()}
                </span>
              </div>

              <h1 className="tipdetail-title">{tip.title}</h1>
              <p className="tipdetail-summary">{tip.summary}</p>

              {(() => {
                const coverSrc = tip.cover_url
                  ? tip.cover_url.startsWith("http")
                    ? tip.cover_url
                    : tip.cover_url.startsWith("/storage/")
                      ? `http://127.0.0.1:8000${tip.cover_url}`
                      : `http://127.0.0.1:8000/storage/${tip.cover_url}`
                  : null;

                return coverSrc ? (
                  <div className="tipdetail-cover">
                    <img src={coverSrc} alt={tip.title} />
                  </div>
                ) : null;
              })()}
            </div>

            <div className="tipdetail-body">
              {sections.map((s) => (
                <div key={s._id} id={s._id} className="tipdetail-section">
                  <h3>{s.heading}</h3>

                  <div
                    className="tipdetail-rich"
                    dangerouslySetInnerHTML={{ __html: s.html || "" }}
                  />
                </div>
              ))}
            </div>
          </main>
        </div>
      </Container>
    </div>
  );
}
