import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import "./Dashboard.css"; // ✅ reuse dashboard styles

/* ===================== CACHE ===================== */
const MY_LEARNING_CACHE_KEY = "my_learning_cache_v1";
const MY_LEARNING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readMyLearningCache() {
  try {
    const raw = localStorage.getItem(MY_LEARNING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = parsed?.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
    if (!ts) return null;
    if (Date.now() - ts > MY_LEARNING_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeMyLearningCache(items) {
  try {
    localStorage.setItem(
      MY_LEARNING_CACHE_KEY,
      JSON.stringify({ items: items || [], updatedAt: new Date().toISOString() })
    );
  } catch {}
}

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

// ✅ progress percent counts BOTH units + lessons combined
const calcCoursePctCombined = ({ completedUnits, totalUnits, completedLessons, totalLessons }) => {
  const tu = Number(totalUnits || 0);
  const tl = Number(totalLessons || 0);

  const cu = clampCount(completedUnits, tu);
  const cl = clampCount(completedLessons, tl);

  const totalItems = tu + tl;
  const doneItems = cu + cl;

  if (totalItems <= 0) return 0;
  return clampPct(Math.round((doneItems / totalItems) * 100));
};

function badgeLabelFromPct(pct, ui) {
  const p = clampPct(pct);
  if (p >= 100) return ui.badgeCompleted;
  if (p >= 70) return ui.badgeAlmost;
  if (p >= 35) return ui.badgeInProgress;
  return ui.badgeGettingStarted;
}

function badgeIconFromPct(pct) {
  const p = clampPct(pct);
  if (p >= 100) return "bi-patch-check-fill";
  if (p >= 70) return "bi-rocket-takeoff";
  if (p >= 35) return "bi-lightning-charge-fill";
  return "bi-play-circle-fill";
}

/* ===================== ANIMATION HOOK ===================== */
function useAnimatedNumber(targetValue, duration = 450) {
  const [val, setVal] = useState(() => Number(targetValue || 0));
  const lastTargetRef = useRef(Number(targetValue || 0));

  useEffect(() => {
    const target = Number(targetValue || 0);
    const start = Number(lastTargetRef.current || 0);

    if (start === target) {
      setVal(target);
      return;
    }

    lastTargetRef.current = target;

    const startTs = performance.now();
    let raf = 0;

    const tick = (t) => {
      const p = Math.min(1, (t - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, duration]);

  return val;
}

/* ===================== CONCURRENCY ===================== */
async function runWithLimit(items, limit, worker) {
  const results = [];
  let idx = 0;

  const runners = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
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

/* ===================== CARD ===================== */
function CourseCardDash({ c, onContinue, onDetails, ui }) {
  const pct = clampPct(c.progressPct);
  const badgeLabel = badgeLabelFromPct(pct, ui);
  const badgeIcon = badgeIconFromPct(pct);
  const animatedCardPct = useAnimatedNumber(pct, 450);

  return (
    <Card className="dash-course-card">
      <div className="dash-course-cover">
        {c.thumbnail ? (
          <img src={c.thumbnail} alt={c.title} className="dash-course-img" />
        ) : (
          <div className="dash-course-img dash-course-img-fallback">
            <i className="bi bi-journal-code" />
          </div>
        )}

        <div className="dash-course-overlay" />

        <div className="dash-course-badge">
          <i className={`bi ${badgeIcon}`} />
          <span>{badgeLabel}</span>
        </div>

        <div className="dash-course-pct">{Math.round(animatedCardPct)}%</div>
      </div>

      <div className="dash-course-body">
        <div className="dash-course-title" title={c.title}>
          {c.title}
        </div>

        <div className="dash-course-meta">
          <span className="dash-pill">
            <i className="bi bi-journals" /> {c.completedLessons}/{c.totalLessons} {ui.lessons}
          </span>
          <span className="dash-pill">
            <i className="bi bi-layers" /> {c.completedUnits}/{c.totalUnits} {ui.units}
          </span>
        </div>

        <div className="dash-course-progress">
          <div className="dash-course-progress-row">
            <span className="dash-muted" style={{ fontSize: 12 }}>
              {ui.progress}
            </span>
            <span className="dash-course-progress-value">{Math.round(animatedCardPct)}%</span>
          </div>
          <ProgressBar className="dash-progress-anim" now={Math.round(animatedCardPct)} />
        </div>

        <div className="dash-course-actions">
          <Button variant="primary" className="dash-course-cta" onClick={() => onContinue(c)}>
            <i className="bi bi-play-fill" /> {ui.continue}
          </Button>

          <Button variant="outline-light" className="dash-course-secondary" onClick={() => onDetails(c)}>
            {ui.details}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ===================== PAGE ===================== */
export default function MyLearning() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  // ✅ language reactive
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        pageTitle: "ការរៀនរបស់ខ្ញុំ",
        subtitle: "តម្រៀបតាមវឌ្ឍនភាពខ្ពស់ជាងគេ •",
        back: "ត្រឡប់ក្រោយ",
        browseCourses: "រកមើលវគ្គសិក្សា",
        refresh: "ធ្វើបច្ចុប្បន្នភាព",
        loading: "កំពុងផ្ទុក...",
        empty: "មិនទាន់មានវគ្គដែលបានចាប់ផ្តើមទេ។",
        started: "បានចាប់ផ្តើម",
        failed: "មិនអាចផ្ទុកវឌ្ឍនភាពការរៀនបានទេ។",

        // card labels
        lessons: "មេរៀន",
        units: "ជំពូក",
        progress: "វឌ្ឍនភាព",
        continue: "បន្ត​រៀន",
        details: "លម្អិត",

        // badges
        badgeCompleted: "បានបញ្ចប់",
        badgeAlmost: "ជិតបញ្ចប់",
        badgeInProgress: "កំពុងរៀន",
        badgeGettingStarted: "ទើបចាប់ផ្តើម",
      };
    }
    return {
      pageTitle: "My Learning",
      subtitle: "Sorted by most progress •",
      back: "Back",
      browseCourses: "Browse Courses",
      refresh: "Refresh",
      loading: "Loading...",
      empty: "No started courses yet.",
      started: "started",
      failed: "Failed to load your learning progress.",

      // card labels
      lessons: "lessons",
      units: "units",
      progress: "Progress",
      continue: "Continue",
      details: "Details",

      // badges
      badgeCompleted: "Completed",
      badgeAlmost: "Almost",
      badgeInProgress: "In Progress",
      badgeGettingStarted: "Getting Started",
    };
  }, [lang]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [items, setItems] = useState([]);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr(null);

    try {
      const res = await api.get("/my/courses");
      const allCourses = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const results = await runWithLimit(allCourses, 6, async (c) => {
        const key = String(c?.slug || c?.id);

        const pr = await api.get(`/progress/course/${key}`);
        const data = pr?.data || {};

        const completedLessonIds = Array.isArray(data?.completed_lesson_ids)
          ? data.completed_lesson_ids.map((x) => Number(x))
          : [];

        const unitProg = data?.unit_progress || {};
        const completedUnitsRaw = Object.values(unitProg).filter((up) => up?.completed).length;

        const totalUnits = Number(c?.units_count || 0);
        const totalLessons = Number(c?.lessons_count || 0);

        const completedLessons = clampCount(completedLessonIds.length, totalLessons);
        const completedUnits = clampCount(completedUnitsRaw, totalUnits);

        const progressPct = calcCoursePctCombined({
          completedUnits,
          totalUnits,
          completedLessons,
          totalLessons,
        });

        return {
          courseKey: key,
          title: c?.title || "Untitled",
          thumbnail: c?.thumbnail_url || "",
          completedLessons,
          totalLessons,
          completedUnits,
          totalUnits,
          progressPct,
          lastUnitId: data?.last_unit_id ? Number(data.last_unit_id) : null,
          lastLessonId: data?.last_lesson_id ? Number(data.last_lesson_id) : null,
        };
      });

      const startedCourses = results
        .filter(Boolean)
        .sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));

      if (!isMountedRef.current) return;

      setItems(startedCourses);
      writeMyLearningCache(startedCourses);
    } catch (e) {
      if (!isMountedRef.current) return;
      setErr(ui.failed);
      setItems([]);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  }, [ui.failed]);

  // ✅ cache first, then background refresh
  useEffect(() => {
    isMountedRef.current = true;

    const cached = readMyLearningCache();
    if (cached?.items?.length) {
      setItems(cached.items);
      setLoading(false);
      loadAll({ silent: true });
    } else {
      loadAll({ silent: false });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAll]);

  // ✅ refresh when progress changed
  useEffect(() => {
    const refreshIfDirty = () => {
      const dirty = localStorage.getItem("progress_dirty") === "1";
      if (!dirty) return;

      localStorage.removeItem("progress_dirty");
      loadAll({ silent: true });
    };

    const onFocus = () => refreshIfDirty();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshIfDirty();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadAll]);

  const handleContinue = useCallback(
    async (c) => {
      if (!c?.courseKey) return;

      if (c?.lastUnitId && c?.lastLessonId) {
        navigate(`/course/${c.courseKey}/unit/${c.lastUnitId}/lesson/${c.lastLessonId}`);
        return;
      }

      try {
        const cr = await api.get(`/courses/${c.courseKey}`);
        const course = cr?.data || {};
        const units = Array.isArray(course?.units) ? course.units : [];

        const firstUnit = units[0];
        const lessons = Array.isArray(firstUnit?.lessons) ? firstUnit.lessons : [];
        const firstLesson = lessons[0];

        if (firstUnit?.id && firstLesson?.id) {
          navigate(`/course/${c.courseKey}/unit/${firstUnit.id}/lesson/${firstLesson.id}`);
          return;
        }

        navigate(`/courses/${c.courseKey}`);
      } catch {
        navigate(`/courses/${c.courseKey}`);
      }
    },
    [navigate]
  );

  const countText = useMemo(() => {
    if (loading) return "…";
    return `${items.length} ${ui.started}`;
  }, [loading, items.length, ui.started]);

  return (
    <div className="dash-page">
      <Container className="dash-container">
        {err && <Alert variant="danger">{err}</Alert>}

        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h2 style={{ margin: 0, color: "#fff" }}>{ui.pageTitle}</h2>
            <div className="dash-muted" style={{ fontSize: 12 }}>
              {ui.subtitle} {countText}
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-light" onClick={() => navigate("/dashboard")}>
              <i className="bi bi-arrow-left" /> {ui.back}
            </Button>

            <Button variant="outline-light" onClick={() => navigate("/courses")}>
              {ui.browseCourses}
            </Button>

            <Button variant="outline-light" onClick={() => loadAll({ silent: false })} disabled={loading}>
              {ui.refresh}
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 16, color: "#fff" }}>{ui.loading}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16, color: "#fff" }}>{ui.empty}</div>
        ) : (
          <Row className="g-3">
            {items.map((c) => (
              <Col md={6} key={c.courseKey}>
                <CourseCardDash
                  c={c}
                  ui={ui}
                  onContinue={handleContinue}
                  onDetails={(course) => navigate(`/courses/${course.courseKey}`)}
                />
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}
