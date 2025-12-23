import React, { useMemo, useState, useEffect, useCallback } from "react";
import CourseCard from "../../components/CourseCard";
import "./Courses.css";
import api from "../../lib/api";

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  // ✅ language reactive (en / km)
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

  // ✅ load courses
  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get("/courses")
      .then((res) => {
        if (!alive) return;
        setCourses(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to load /courses", err);
        if (!alive) return;
        setCourses([]);
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
    const counts = new Map();
    courses.forEach((c) => {
      (Array.isArray(c.tags) ? c.tags : []).forEach((t) =>
        counts.set(t, (counts.get(t) || 0) + 1)
      );
    });

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    return ["all", ...sorted.slice(0, 8)];
  }, [courses]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return courses.filter((c) => {
      const title = pickText(c.title, c.title_km).toLowerCase();
      const description = pickText(c.description, c.description_km).toLowerCase();
      const tagsArr = Array.isArray(c.tags) ? c.tags : [];

      const matchesQuery =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        tagsArr.some((x) => (x || "").toLowerCase().includes(query));

      const matchesTag = tag === "all" ? true : tagsArr.includes(tag);

      return matchesQuery && matchesTag;
    });
  }, [courses, q, tag, pickText]);

  if (loading) return <div style={{ padding: 24 }}>{lang === "km" ? "កំពុងផ្ទុក..." : "Loading..."}</div>;

  return (
    <div className="courses-page">
      <div className="courses-container">
        <div className="courses-hero">
          <h1 className="courses-title">
            {lang === "km" ? "វគ្គសិក្សាទាំងអស់" : "Course Paths"}
          </h1>

          <p className="courses-subtitle">
            {lang === "km"
              ? "ជ្រើសរើសវគ្គសិក្សាដែលត្រូវការ។"
              : "Choose your path and follow the required courses."}
          </p>

          <div className="courses-controls">
            <input
              className="courses-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                lang === "km"
                  ? "ស្វែងរក៖ React, CSS, API, SQL..."
                  : "Search: React, CSS, API, SQL..."
              }
            />

            <select
              className="courses-select"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t === "all"
                    ? lang === "km"
                      ? "វគ្គសិក្សាទាំងអស់"
                      : "All topics"
                    : t}
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
              slug={course.slug}
              image={course.thumbnail_url}
              title={course.title}
              title_km={course.title_km}
              description={course.description}
              description_km={course.description_km}
              lessons={course.lessons_count}
              units={course.units_count}
              qcm={course.qcm_count}
              coding={course.coding_count || 0}
            />

          ))}
        </div>

        {filtered.length === 0 && (
          <div className="courses-empty">
            {lang === "km" ? "រកមិនឃើញវគ្គសិក្សា។ សាកល្បងពាក្យផ្សេង។" : "No courses found. Try a different keyword."}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
