import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, ProgressBar } from "react-bootstrap";
import api from "../../lib/api";
import "./CareerDetail.css";

/* ===================== HELPERS ===================== */
const clampPct = (n) => {
  const v = Number(n || 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

const clampCount = (done, total) => {
  const d = Number(done || 0);
  const t = Number(total || 0);
  if (t <= 0) return Math.max(0, d);
  return Math.max(0, Math.min(d, t));
};

// ✅ percent based on BOTH units + lessons combined
const calcCoursePctCombined = ({ completedUnits, totalUnits, completedLessons, totalLessons }) => {
  const tu = Number(totalUnits || 0);
  const tl = Number(totalLessons || 0);

  const cu = clampCount(completedUnits, tu);
  const cl = clampCount(completedLessons, tl);

  const totalItems = tu + tl;
  if (totalItems <= 0) return 0;

  return clampPct(Math.round(((cu + cl) / totalItems) * 100));
};

async function runWithLimit(items, limit, worker) {
  const results = [];
  let idx = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const cur = idx++;
      try {
        results[cur] = await worker(items[cur], cur);
      } catch {
        results[cur] = null;
      }
    }
  });

  await Promise.all(runners);
  return results;
}

const CareerDetail = () => {
  const { id } = useParams(); // career slug
  const navigate = useNavigate();

  const isMountedRef = useRef(true);

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

  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);

  // enriched course cards (with progress)
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // enrolled courses (to know which ones user can continue)
  const [enrolledSlugs, setEnrolledSlugs] = useState(() => new Set());
  const [enrolledMap, setEnrolledMap] = useState({}); // slug -> course object from /my/courses

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1) load career
  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const { data } = await api.get(`/career-paths/${id}`);
        if (!alive) return;
        setCareer(data || null);
      } catch (err) {
        console.error("Failed to load career path detail:", err);
        if (!alive) return;
        setCareer(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const courses = useMemo(() => {
    if (!career) return [];
    return Array.isArray(career.courses) ? career.courses : [];
  }, [career]);

  // 2) load enrolled courses once
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get("/my/courses");
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];

        if (!alive) return;

        const s = new Set();
        const map = {};
        list.forEach((c) => {
          const slug = String(c?.slug || "");
          if (!slug) return;
          s.add(slug);
          map[slug] = c;
        });

        setEnrolledSlugs(s);
        setEnrolledMap(map);
      } catch {
        if (!alive) return;
        setEnrolledSlugs(new Set());
        setEnrolledMap({});
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // 3) enrich career courses with progress/resume pointers
  useEffect(() => {
    if (!courses.length) {
      setItems([]);
      setLoadingItems(false);
      return;
    }

    let alive = true;
    setLoadingItems(true);

    (async () => {
      try {
        // IMPORTANT: keep original career order using pathIndex
        const base = courses.map((c, pathIndex) => ({
          id: c.id,
          slug: String(c.slug || ""),
          title: c.title || "Untitled",
          title_km: c.title_km || null,
          description: c.description || "",
          description_km: c.description_km || null,
          thumbnail_url: c.thumbnail_url || "",
          units_count: Number(c.units_count || 0),
          lessons_count: Number(c.lessons_count || 0),
          qcm_count: Number(c.qcm_count || 0),
          coding_count: Number(enrolledMap?.[String(c.slug || "")]?.coding_count || c.coding_count || 0),
          pathIndex,
        }));

        const results = await runWithLimit(base, 4, async (c) => {
          const courseKey = c.slug;
          const isEnrolled = enrolledSlugs.has(courseKey);
          const fromMy = enrolledMap?.[courseKey];

          const totalUnits = Number(fromMy?.units_count || c.units_count || 0);
          const totalLessons = Number(fromMy?.lessons_count || c.lessons_count || 0);

          // default values if not enrolled (still show card)
          if (!isEnrolled) {
            return {
              ...c,
              thumbnail_url: fromMy?.thumbnail_url || c.thumbnail_url,
              isEnrolled: false,
              completedLessons: 0,
              completedUnits: 0,
              totalLessons,
              totalUnits,
              progressPct: 0,
              lastUnitId: null,
              lastLessonId: null,
            };
          }

          // enrolled → real progress
          const pr = await api.get(`/progress/course/${courseKey}`);
          const data = pr?.data || {};

          const completedLessonIds = Array.isArray(data?.completed_lesson_ids)
            ? data.completed_lesson_ids.map((x) => Number(x))
            : [];

          const unitProg = data?.unit_progress || {};
          const completedUnitsRaw = Object.values(unitProg).filter((up) => up?.completed).length;

          const completedLessons = clampCount(completedLessonIds.length, totalLessons);
          const completedUnits = clampCount(completedUnitsRaw, totalUnits);

          const progressPct = calcCoursePctCombined({
            completedUnits,
            totalUnits,
            completedLessons,
            totalLessons,
          });

          return {
            ...c,
            thumbnail_url: fromMy?.thumbnail_url || c.thumbnail_url,
            isEnrolled: true,
            completedLessons,
            completedUnits,
            totalLessons,
            totalUnits,
            progressPct,
            lastUnitId: data?.last_unit_id ? Number(data.last_unit_id) : null,
            lastLessonId: data?.last_lesson_id ? Number(data.last_lesson_id) : null,
          };
        });

        if (!alive || !isMountedRef.current) return;

        // For cards: show most progressed first (nice UI)
        const sortedForUI = (results || [])
          .filter(Boolean)
          .sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));

        setItems(sortedForUI);
      } catch (err) {
        console.error("Failed to build career course progress:", err);
        if (!alive || !isMountedRef.current) return;
        setItems([]);
      } finally {
        if (!alive || !isMountedRef.current) return;
        setLoadingItems(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courses, enrolledSlugs, enrolledMap]);

  // ✅ ordered list by career sequence (for Start Learning logic)
  const pathOrderedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.pathIndex ?? 0) - (b.pathIndex ?? 0));
  }, [items]);

  const enrolledCount = useMemo(() => items.filter((x) => x?.isEnrolled).length, [items]);
  const totalCoursesCount = items.length;

  // ✅ Career Total Progress (average of ENROLLED courses in this career)
  const careerProgressPct = useMemo(() => {
    const enrolledCourses = items.filter((x) => x?.isEnrolled);
    if (!enrolledCourses.length) return 0;

    const avg =
      enrolledCourses.reduce((sum, c) => sum + Number(c?.progressPct || 0), 0) / enrolledCourses.length;

    return clampPct(Math.round(avg));
  }, [items]);

  const handleContinueCourse = useCallback(
    (course) => {
      if (course?.isEnrolled && course?.lastUnitId && course?.lastLessonId) {
        navigate(`/course/${course.slug}/unit/${course.lastUnitId}/lesson/${course.lastLessonId}`);
        return;
      }
      navigate(`/courses/${course.slug}`);
    },
    [navigate]
  );

  // ✅ Start/Continue Path button logic (career order)
  const handleStartPath = useCallback(() => {
    if (!pathOrderedItems.length) return;

    const hasAnyEnrolled = pathOrderedItems.some((c) => !!c?.isEnrolled);
    if (!hasAnyEnrolled) {
      const first = pathOrderedItems[0];
      if (first?.slug) navigate(`/courses/${first.slug}`);
      return;
    }

    let target = pathOrderedItems.find((c) => clampPct(c?.progressPct) < 100);

    if (!target) {
      target = pathOrderedItems[pathOrderedItems.length - 1];
      if (target?.slug) navigate(`/courses/${target.slug}`);
      return;
    }

    if (target?.isEnrolled && target?.lastUnitId && target?.lastLessonId) {
      navigate(`/course/${target.slug}/unit/${target.lastUnitId}/lesson/${target.lastLessonId}`);
      return;
    }

    navigate(`/courses/${target.slug}`);
  }, [navigate, pathOrderedItems]);

  const startBtnLabel = useMemo(() => {
    if (!pathOrderedItems.length) return lang === "km" ? "ចាប់ផ្តើមរៀន" : "Start Learning";

    const hasAnyEnrolled = pathOrderedItems.some((c) => !!c?.isEnrolled);
    if (!hasAnyEnrolled) return lang === "km" ? "ចាប់ផ្តើមរៀន" : "Start Learning";

    const hasIncomplete = pathOrderedItems.some((c) => clampPct(c?.progressPct) < 100);
    return hasIncomplete
      ? lang === "km"
        ? "បន្តរៀនជំនាញ"
        : "Continue Path"
      : lang === "km"
      ? "មើលវគ្គសិក្សាចុងក្រោយ"
      : "View Last Course";
  }, [pathOrderedItems, lang]);

  if (loading) return <h2 className="text-center mt-5">{lang === "km" ? "កំពុងផ្ទុក..." : "Loading..."}</h2>;
  if (!career) return <h2 className="text-center mt-5">{lang === "km" ? "រកមិនឃើញជំនាញ" : "Career Not Found"}</h2>;

  const headerTitle = pickText(career.title, career.title_km);
  const headerDesc = pickText(career.description, career.description_km);

  return (
    <div className="career-detail-page">
      <Container className="cd-container">
        <div className="cd-desc-box">
          <h1 className="cd-title">{headerTitle}</h1>
          <p>{headerDesc}</p>

          {/* ✅ Career Total Progress */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                {lang === "km" ? "វឌ្ឍនភាពសរុប" : "Total Progress"}
              </div>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#ffffff",
                  textShadow: "0 1px 10px rgba(0,0,0,0.45)",
                  letterSpacing: 0.2,
                }}
              >
                {careerProgressPct}%
              </div>
            </div>

            <ProgressBar
              now={careerProgressPct}
              style={{
                height: 10,
                borderRadius: 999,
                marginTop: 8,
                background: "rgba(255,255,255,0.12)",
              }}
            />

            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              {lang === "km" ? (
                <>
                  បានចុះឈ្មោះ <b>{enrolledCount}</b> / {totalCoursesCount} វគ្គសិក្សា​ ក្នុងជំនាញនេះ
                </>
              ) : (
                <>
                  Enrolled in <b>{enrolledCount}</b> / {totalCoursesCount} courses in this path
                </>
              )}
            </div>

            {/* ✅ START / CONTINUE PATH BUTTON */}
            <div className="mt-3 d-grid">
              <button
                className="career-primary-cta"
                onClick={handleStartPath}
                disabled={loadingItems || !pathOrderedItems.length}
              >
                <span className="cta-glow" />
                <span className="cta-content">
                  <i className="bi bi-rocket-takeoff-fill" />
                  {loadingItems ? (lang === "km" ? "កំពុងផ្ទុក..." : "Loading...") : startBtnLabel}
                </span>
              </button>
            </div>
          </div>
        </div>

        <h3 className="cd-courses-title">{lang === "km" ? "វគ្គសិក្សាក្នុងជំនាញនេះ" : "Learning Path Courses"}</h3>

        {loadingItems ? (
          <div className="careers-empty mt-4">{lang === "km" ? "កំពុងផ្ទុកវឌ្ឍនភាព..." : "Loading your progress..."}</div>
        ) : (
          <Row className="gy-4">
            {items.map((course) => {
              const courseTitle = pickText(course.title, course.title_km);
              const courseDesc = pickText(course.description, course.description_km);

              return (
                <Col key={course.id} md={6} lg={4} className="d-flex">
                  <Card className="cd-course-card flex-fill">
                    <Link to={`/courses/${course.slug}`} className="cd-course-card-link w-100">
                      <Card.Img
                        variant="top"
                        src={course.thumbnail_url || "/placeholder-course.png"}
                        className="cd-course-img"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-course.png";
                        }}
                      />
                    </Link>

                    <Card.Body>
                      <h5 className="cd-course-title">{courseTitle}</h5>
                      <p className="cd-course-desc">{courseDesc}</p>

                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            opacity: 0.95,
                            color: "rgba(255,255,255,0.9)",
                            fontWeight: 700,
                          }}
                        >
                          <span>{course.isEnrolled ? (lang === "km" ? "វឌ្ឍនភាពរបស់អ្នក" : "Your Progress") : lang === "km" ? "មិនទាន់ចុះឈ្មោះ" : "Not enrolled"}</span>
                          <span style={{ color: "#fff", fontWeight: 900 }}>
                            {course.isEnrolled ? `${course.progressPct}%` : ""}
                          </span>
                        </div>

                        <ProgressBar
                          now={course.isEnrolled ? course.progressPct : 0}
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.12)",
                          }}
                        />
                      </div>

                      <div className="cd-course-meta">
                        <span>📂 {course.totalUnits ?? course.units_count ?? 0} {lang === "km" ? "ជំពូក" : "Units"}</span>
                        <span>📘 {course.totalLessons ?? course.lessons_count ?? 0} {lang === "km" ? "មេរៀន" : "Lessons"}</span>
                        <span>📝 {course.qcm_count ?? 0} QCM</span>
                        <span>💻 {course.coding_count ?? 0} {lang === "km" ? "កូដ" : "Coding"}</span>
                      </div>

                      {course.isEnrolled ? (
                        <Button
                          className="cd-course-btn w-100 mt-2"
                          onClick={(e) => {
                            e.preventDefault();
                            handleContinueCourse(course);
                          }}
                        >
                          {lang === "km" ? "បន្ត" : "Continue"}
                        </Button>
                      ) : (
                        <Button className="cd-course-btn w-100 mt-2" onClick={() => navigate(`/courses/${course.slug}`)}>
                          {lang === "km" ? "ចាប់ផ្តើមរៀន" : "Start Learning"}
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {!loadingItems && items.length === 0 && (
          <div className="careers-empty mt-4">{lang === "km" ? "មិនទាន់មានវគ្គភ្ជាប់ទេ។" : "No courses attached yet."}</div>
        )}
      </Container>
    </div>
  );
};

export default CareerDetail;
