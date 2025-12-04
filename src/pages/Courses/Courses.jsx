import React, { useMemo, useState } from "react";
import CourseCard from "../../components/CourseCard";
import courses from "../../data/courses"; // ✔ correct path
import "./Courses.css";

const Courses = () => {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  const allTags = useMemo(() => {
  // count tags by frequency
  const counts = new Map();
  courses.forEach((c) => {
    (c.tags || []).forEach((t) => {
      counts.set(t, (counts.get(t) || 0) + 1);
    });
  });

  // sort by frequency desc
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  // show only top N tags
  const TOP_N = 8; // change to 6 / 10 if you want
  return ["all", ...sorted.slice(0, TOP_N)];
}, []);


  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return courses.filter((c) => {
      const matchesQuery =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        (c.tags || []).some((x) => x.toLowerCase().includes(query));

      const matchesTag = tag === "all" ? true : (c.tags || []).includes(tag);

      return matchesQuery && matchesTag;
    });
  }, [q, tag]);

  return (
    <div className="courses-page">
      <div className="courses-container">
        <div className="courses-hero">
          <h1 className="courses-title">Course Paths</h1>
          <p className="courses-subtitle">
            Choose your path and follow the required courses.
          </p>

          {/* ✅ COOL SEARCH + FILTER (Tips style) */}
          <div className="courses-controls">
            <input
              className="courses-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: React, CSS, API, SQL..."
            />

            <select
              className="courses-select"
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

        <div className="courses-grid mt-4">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              image={course.image}
              title={course.title}
              description={course.description}
              lessons={course.lessons}
              units={course.units}
              qcm={course.qcm}
              coding={course.coding}
              tags={course.tags} // optional
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="courses-empty">No courses found. Try a different keyword.</div>
        )}
      </div>
    </div>
  );
};

export default Courses;
