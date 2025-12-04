// src/pages/Tips/Tips.jsx
import React, { useMemo, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import tipsData from "../../data/tipsData";
import "./Tips.css";

export default function Tips() {
    const [q, setQ] = useState("");
    const [tag, setTag] = useState("all");

    const allTags = useMemo(() => {
        const set = new Set();
        tipsData.forEach((t) => t.tags.forEach((x) => set.add(x)));
        return ["all", ...Array.from(set)];
    }, []);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        return tipsData.filter((t) => {
            const matchesQuery =
                !query ||
                t.title.toLowerCase().includes(query) ||
                t.summary.toLowerCase().includes(query) ||
                t.tags.some((x) => x.toLowerCase().includes(query));

            const matchesTag = tag === "all" ? true : t.tags.includes(tag);
            return matchesQuery && matchesTag;
        });
    }, [q, tag]);

    return (
        <div className="tips-page">
            <Container className="tips-container">
                <div className="tips-hero">
                    <h1 className="tips-title">Tips & Mini Tutorials</h1>
                    <p className="tips-subtitle">
                        Quick solutions for common coding problems (CSS, HTML, Bootstrap, etc.)
                    </p>

                    <div className="tips-controls">
                        <input
                            className="tips-search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search: center div, bootstrap install, text-align..."
                        />

                        <select
                            className="tips-select"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                        >
                            {allTags.map((t) => (
                                <option key={t} value={t}>
                                    {t === "all" ? "All topics" : t}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <Row className="gy-4">
                    {filtered.map((tip) => (
                        <Col key={tip.slug} md={6} lg={4}>
                            <Link to={`/tips/${tip.slug}`} className="tips-card">
                                {tip.cover && (
                                    <div className="tips-card-cover">
                                        <img src={tip.cover} alt={tip.title} />
                                    </div>
                                )}
                                <div className="tips-card-top">
                                    <div className="tips-chip">{tip.level}</div>
                                    <div className="tips-date">{tip.date}</div>
                                </div>
                                <h3 className="tips-card-title">{tip.title}</h3>
                                <p className="tips-card-summary">{tip.summary}</p>
                                <div className="tips-tags">
                                    {tip.tags.slice(0, 3).map((t) => (
                                        <span key={t} className="tips-tag">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                <div className="tips-read">Read →</div>
                            </Link>
                        </Col>
                    ))}
                </Row>

                {filtered.length === 0 && (
                    <div className="tips-empty">No tips found. Try a different keyword.</div>
                )}
            </Container>
        </div>
    );
}
