import React, { useMemo, useState } from "react";
import CareerCard from "../../components/CareerCard";
import careers from "../../data/careers";
import "./Careers.css";

const Careers = () => {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  // ✅ Show fewer values but still useful (Top tags)
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
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return careers.filter((c) => {
      const matchesQuery =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        (c.tags || []).some((x) => x.toLowerCase().includes(query)) ||
        (c.courses || []).some((x) => x.toLowerCase().includes(query));

      const matchesTag = tag === "all" ? true : (c.tags || []).includes(tag);

      return matchesQuery && matchesTag;
    });
  }, [q, tag]);

  return (
    <div className="careers-page">
      <div className="careers-container">
        {/* Hero (same search UI style as Courses) */}
        <div className="careers-hero">
          <h1 className="careers-title">Career Paths</h1>
          <p className="careers-subtitle">
            Choose a career direction and start learning the required skills.
          </p>

          <div className="careers-controls">
            <input
              className="careers-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: frontend, mobile, data, security..."
            />

            <select
              className="careers-select"
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

        {/* Cards grid (same behavior as Courses grid) */}
        <div className="careers-grid">
          {filtered.map((career) => (
            <CareerCard key={career.id} {...career} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="careers-empty">No careers found. Try a different keyword.</div>
        )}
      </div>
    </div>
  );
};

export default Careers;
