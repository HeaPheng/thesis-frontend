import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import "./Dashboard.css"; // ✅ reuse dashboard styles

import html2canvas from "html2canvas";
import CertificateSheet from "../../components/CertificateSheet";

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
      JSON.stringify({ items: Array.isArray(items) ? items : [], updatedAt: new Date().toISOString() })
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

/* ===================== COURSE DETAIL CONTINUE HELPERS ===================== */
const getUnitCodingEn = (unitObj) =>
  unitObj?.codingExerciseEn ??
  unitObj?.coding_exercise_en ??
  unitObj?.codingExercise ??
  unitObj?.coding_exercise ??
  null;

const hasUnitCoding = (unitObj) => !!getUnitCodingEn(unitObj);

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

/* ===================== CARD ===================== */
function CourseCardDash({ c, downloading, onContinue, onDetails, onDownloadCert, ui, pickText }) {
  const pct = clampPct(c.progressPct);
  const badgeLabel = badgeLabelFromPct(pct, ui);
  const badgeIcon = badgeIconFromPct(pct);
  const animatedCardPct = useAnimatedNumber(pct, 450);

  const displayTitle = pickText(c.title, c.title_km) || ui.untitled;

  return (
    <Card className="dash-course-card">
      <div className="dash-course-cover">
        {c.thumbnail ? (
          <img src={c.thumbnail} alt={displayTitle} className="dash-course-img" />
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
        <div className="dash-course-title" title={displayTitle}>
          {displayTitle}
        </div>

        <div className="dash-course-meta">
          <span className="dash-pill">
            <i className="bi bi-journals" /> {c.completedLessons}/{c.totalLessons} {ui.lessons}
          </span>
          <span className="dash-pill">
            <i className="bi bi-layers" /> {c.completedUnits}/{c.totalUnits} {ui.units}
          </span>

          {c.isCompletedCourse && (
            <span className="dash-pill dash-pill-success">
              <i className="bi bi-award-fill" /> {ui.certificate}
            </span>
          )}
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

        {/* ✅ Download cert button */}
        {c.isCompletedCourse && (
          <div className="mt-2 d-grid">
            <Button
              variant="outline-success"
              className="dash-cert-btn"
              disabled={!!downloading[c.courseKey]}
              onClick={() => onDownloadCert(c)}
            >
              {downloading[c.courseKey] ? (
                ui.downloading
              ) : (
                <>
                  <i className="bi bi-download" /> {ui.downloadCertificate}
                </>
              )}
            </Button>
          </div>
        )}
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

  const pickText = useCallback((en, km) => (lang === "km" ? km || en || "" : en || km || ""), [lang]);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        pageTitle: "ការរៀនរបស់ខ្ញុំ",
        subtitle: "តម្រៀបតាមវឌ្ឍនភាពខ្ពស់ជាងគេ •",
        back: "ត្រឡប់ក្រោយ",
        browseCourses: "រកមើលវគ្គសិក្សា",
        loading: "កំពុងផ្ទុក...",
        empty: "មិនទាន់មានវគ្គដែលបានចាប់ផ្តើមទេ។",
        started: "បានចាប់ផ្តើម",
        failed: "មិនអាចផ្ទុកវឌ្ឍនភាពការរៀនបានទេ។",

        lessons: "មេរៀន",
        units: "ជំពូក",
        progress: "វឌ្ឍនភាព",
        continue: "បន្ត​រៀន",
        details: "លម្អិត",

        badgeCompleted: "បានបញ្ចប់",
        badgeAlmost: "ជិតបញ្ចប់",
        badgeInProgress: "កំពុងរៀន",
        badgeGettingStarted: "ទើបចាប់ផ្តើម",

        certificate: "វិញ្ញាបនបត្រ",
        downloading: "កំពុងទាញយក…",
        downloadCertificate: "ទាញយកវិញ្ញាបនបត្រ",
        untitled: "មិនមានចំណងជើង",

        certNotReady: "វិញ្ញាបនបត្រមិនទាន់រួចទេ។",
        certPreviewNotReady: "មើលមុនវិញ្ញាបនបត្រមិនទាន់រួច។",
        certDownloadFail: "មិនអាចទាញយកវិញ្ញាបនបត្រ។ ពិនិត្យ API /certificates/course/:slug",

        continueFail: "មិនអាចបន្តបានទេ។ សូមចូលទៅកាន់ទំព័រលម្អិតវគ្គសិក្សា។",
        continueLoading: "កំពុងរៀបចំ…",
      };
    }
    return {
      pageTitle: "My Learning",
      subtitle: "Sorted by most progress •",
      back: "Back",
      browseCourses: "Browse Courses",
      loading: "Loading...",
      empty: "No started courses yet.",
      started: "started",
      failed: "Failed to load your learning progress.",

      lessons: "lessons",
      units: "units",
      progress: "Progress",
      continue: "Continue",
      details: "Details",

      badgeCompleted: "Completed",
      badgeAlmost: "Almost",
      badgeInProgress: "In Progress",
      badgeGettingStarted: "Getting Started",

      certificate: "Certificate",
      downloading: "Downloading…",
      downloadCertificate: "Download Certificate",
      untitled: "Untitled",

      certNotReady: "Certificate not ready yet.",
      certPreviewNotReady: "Certificate preview not ready.",
      certDownloadFail: "Could not download certificate. Check /certificates/course/:slug API.",

      continueFail: "Could not continue. Please open the course details page.",
      continueLoading: "Preparing…",
    };
  }, [lang]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [items, setItems] = useState([]);

  // ✅ cert download state
  const [downloading, setDownloading] = useState({});
  const [statsErr, setStatsErr] = useState(null);

  const [certPreview, setCertPreview] = useState(null);
  const certRef = useRef(null);

  // ✅ Continue loading per course
  const [continuing, setContinuing] = useState({});

  // ✅ user name for certificate
  const [userName, setUserName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.name || "Student";
    } catch {
      return "Student";
    }
  });
  useEffect(() => {
  api.get("/my-learning")
    .then(res => {
      console.log("MY LEARNING:", res.data);
    })
    .catch(err => {
      console.error("ERROR:", err.response?.data || err);
    });
}, []);


  useEffect(() => {
    const sync = () => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        setUserName(u?.name || "Student");
      } catch {
        setUserName("Student");
      }
    };
    sync();
    window.addEventListener("auth-changed", sync);
    return () => window.removeEventListener("auth-changed", sync);
  }, []);

  /* =====================
     FAST loader:
     - Only calls /my/courses (1 request)
     - Uses completed_*_count from backend
  ===================== */
  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setErr(null);

      try {
        const res = await api.get("/my/courses");
        const allCourses = Array.isArray(res.data) ? res.data : res.data?.data || [];

        const mapped = allCourses
          .map((c) => {
            const key = String(c?.slug || c?.id);
            if (!key) return null;

            const totalUnits = Number(c?.units_count || 0);
            const totalLessons = Number(c?.lessons_count || 0);

            const completedUnits = clampCount(Number(c?.completed_units_count || 0), totalUnits);
            const completedLessons = clampCount(Number(c?.completed_lessons_count || 0), totalLessons);

            const progressPct = calcCoursePctCombined({
              completedUnits,
              totalUnits,
              completedLessons,
              totalLessons,
            });

            const isCompletedCourse = totalUnits > 0 && completedUnits >= totalUnits;

            return {
              courseKey: key,
              title: c?.title || ui.untitled,
              title_km: c?.title_km || null,
              thumbnail: c?.thumbnail_url || "",
              completedLessons,
              totalLessons,
              completedUnits,
              totalUnits,
              progressPct,
              isCompletedCourse,
            };
          })
          .filter(Boolean)
          .sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));

        if (!isMountedRef.current) return;
        setItems(mapped);
        writeMyLearningCache(mapped);
      } catch (e) {
        if (!isMountedRef.current) return;
        setErr(ui.failed);
        setItems([]);
      } finally {
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [ui.failed, ui.untitled]
  );

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

  // ✅ auto refresh when progress changes
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
    const onDirtyEvent = () => refreshIfDirty();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("progress-dirty", onDirtyEvent);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("progress-dirty", onDirtyEvent);
    };
  }, [loadAll]);

  /* ===================== download certificate (same as Dashboard) ===================== */
  const onDownloadCert = useCallback(
    async (courseObj) => {
      const courseKey = String(courseObj?.courseKey || "");
      if (!courseKey) return;

      setDownloading((p) => ({ ...p, [courseKey]: true }));
      setStatsErr(null);

      try {
        const { data } = await api.get(`/certificates/course/${courseKey}`);
        if (!data?.completed) {
          setStatsErr(ui.certNotReady);
          return;
        }

        const courseTitle = data?.course_title || courseObj?.title || ui.untitled;
        const timeSpentMinutes = Number(data?.time_spent_minutes || 0);

        setCertPreview({
          userName: userName || "Student",
          courseTitle,
          timeSpentMinutes,
        });

        await new Promise((r) => setTimeout(r, 60));

        if (!certRef.current) {
          setStatsErr(ui.certPreviewNotReady);
          return;
        }

        const canvas = await html2canvas(certRef.current, {
          scale: 2.5,
          backgroundColor: "#ffffff",
          useCORS: true,
        });

        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `Certificate - ${courseTitle}.png`;
        link.click();
      } catch (e) {
        console.error(e);
        setStatsErr(ui.certDownloadFail);
      } finally {
        setDownloading((p) => ({ ...p, [courseKey]: false }));
        setCertPreview(null);
      }
    },
    [ui, userName]
  );

  /* ==========================================================
      ✅ Continue Learning (SAME as CourseDetail)
      - Progress-driven (not localStorage resume)
      - Handles lessons -> coding -> qcm
  ========================================================== */
  const handleContinue = useCallback(
    async (c) => {
      const courseSlug = String(c?.courseKey || "");
      if (!courseSlug) return;

      setStatsErr(null);
      setContinuing((p) => ({ ...p, [courseSlug]: true }));

      try {
        // 1) Load course detail (units/lessons)
        const cr = await api.get(`/courses/${courseSlug}`);
        const course = cr?.data || {};
        const units = Array.isArray(course?.units) ? course.units : [];

        // 2) Load progress (completed lessons + unit_progress flags)
        let progressData = null;
        try {
          const pr = await api.get(`/progress/course/${courseSlug}`);
          progressData = pr?.data || null;
        } catch {
          // not enrolled or progress not available -> send to course detail page
          navigate(`/courses/${courseSlug}`);
          return;
        }

        const completedIds = Array.isArray(progressData?.completed_lesson_ids)
          ? progressData.completed_lesson_ids.map((x) => Number(x))
          : [];
        const completedLessonIds = new Set(completedIds);

        const unitProgressMap = progressData?.unit_progress || {};

        const isLessonCompleted = (lessonId) => completedLessonIds.has(Number(lessonId));
        const isUnitCompleted = (unitId) => !!unitProgressMap?.[String(unitId)]?.completed;
        const isCodingCompleted = (unitId) => !!unitProgressMap?.[String(unitId)]?.coding_completed;
        const isQcmCompleted = (unitId) => !!unitProgressMap?.[String(unitId)]?.quiz_passed;

        // 3) SAME loop logic as CourseDetail continueLearning()
        for (let uIndex = 0; uIndex < units.length; uIndex++) {
          const u = units[uIndex];
          const lessons = Array.isArray(u?.lessons) ? u.lessons : [];
          const unitIdStr = String(u?.id);

          // Ensure previous unit isn't incomplete (same as CourseDetail)
          if (uIndex > 0) {
            const prev = units[uIndex - 1];
            if (prev && !isUnitCompleted(prev.id)) {
              const prevLessons = Array.isArray(prev?.lessons) ? prev.lessons : [];

              for (let i = 0; i < prevLessons.length; i++) {
                if (!isLessonCompleted(prevLessons[i].id)) {
                  navigate(`/course/${courseSlug}/unit/${prev.id}/lesson/${prevLessons[i].id}`);
                  return;
                }
              }

              if (hasUnitCoding(prev) && !isCodingCompleted(prev.id)) {
                navigate(`/course/${courseSlug}/unit/${prev.id}/coding`);
                return;
              }

              if ((Number(prev?.qcm_count) || 0) > 0 && !isQcmCompleted(prev.id)) {
                navigate(`/course/${courseSlug}/unit/${prev.id}/qcm`);
                return;
              }

              if (prevLessons[0]?.id) {
                navigate(`/course/${courseSlug}/unit/${prev.id}/lesson/${prevLessons[0].id}`);
                return;
              }
            }
          }

          // next incomplete lesson
          for (let lIndex = 0; lIndex < lessons.length; lIndex++) {
            const lid = lessons[lIndex]?.id;
            if (!lid) continue;
            if (!isLessonCompleted(lid)) {
              navigate(`/course/${courseSlug}/unit/${u.id}/lesson/${lid}`);
              return;
            }
          }

          // coding step
          if (hasUnitCoding(u) && !isCodingCompleted(unitIdStr)) {
            navigate(`/course/${courseSlug}/unit/${u.id}/coding`);
            return;
          }

          // qcm step
          if ((Number(u?.qcm_count) || 0) > 0 && !isQcmCompleted(unitIdStr)) {
            navigate(`/course/${courseSlug}/unit/${u.id}/qcm`);
            return;
          }
        }

        // If everything is done, send them to course detail page (or certificate view there)
        navigate(`/courses/${courseSlug}`);
      } catch (e) {
        console.error(e);
        setStatsErr(ui.continueFail);
        navigate(`/courses/${courseSlug}`);
      } finally {
        setContinuing((p) => ({ ...p, [courseSlug]: false }));
      }
    },
    [navigate, ui.continueFail]
  );

  const countText = useMemo(() => {
    if (loading) return "…";
    return `${items.length} ${ui.started}`;
  }, [loading, items.length, ui.started]);

  return (
    <div className="dash-page">
      <Container className="dash-container">
        {err && <Alert variant="danger">{err}</Alert>}
        {statsErr && <Alert variant="warning">{statsErr}</Alert>}

        {/* ✅ Hidden certificate render for download */}
        <div style={{ position: "fixed", left: "-99999px", top: 0, background: "#fff" }}>
          <div ref={certRef}>
            {certPreview && (
              <CertificateSheet
                userName={certPreview.userName}
                courseTitle={certPreview.courseTitle}
                timeSpentMinutes={certPreview.timeSpentMinutes}
              />
            )}
          </div>
        </div>

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
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 16, color: "#fff" }}>{ui.loading}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16, color: "#fff" }}>{ui.empty}</div>
        ) : (
          <Row className="g-3">
            {items.map((c) => {
              const courseKey = String(c.courseKey);
              const isContinuing = !!continuing[courseKey];

              return (
                <Col md={6} key={c.courseKey}>
                  {/* Wrap card to override Continue button label/disable while continuing */}
                  <CourseCardDash
                    c={{
                      ...c,
                      // keep same data
                    }}
                    downloading={downloading}
                    onContinue={() => !isContinuing && handleContinue(c)}
                    onDetails={(course) => navigate(`/courses/${course.courseKey}`)}
                    onDownloadCert={onDownloadCert}
                    ui={{
                      ...ui,
                      // optional: swap button text while loading
                      continue: isContinuing ? ui.continueLoading : ui.continue,
                    }}
                    pickText={pickText}
                  />
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </div>
  );
}
