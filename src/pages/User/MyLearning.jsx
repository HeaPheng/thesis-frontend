import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import "./MyLearning.css";

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
      JSON.stringify({
        items: Array.isArray(items) ? items : [],
        updatedAt: new Date().toISOString(),
      })
    );
  } catch { }
}

/* ===================== HELPERS ===================== */
const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";

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

/* ===================== CARD: FULL (In Progress / Completed) ===================== */
function CourseCardFull({ c, downloading, isContinuing, onContinue, onDetails, onDownloadCert, ui, pickText }) {
  const pct = clampPct(c.progressPct);
  const animatedCardPct = useAnimatedNumber(pct, 450);

  const badgeLabel = badgeLabelFromPct(pct, ui);
  const badgeIcon = badgeIconFromPct(pct);

  const displayTitle = pickText(c.title, c.title_km) || ui.untitled;

  return (
    <Card className="ml-card">
      <div className="ml-card-cover">
        {c.thumbnail ? (
          <img src={c.thumbnail} alt={displayTitle} className="ml-card-img" />
        ) : (
          <div className="ml-card-img ml-card-img-fallback">
            <i className="bi bi-journal-code" />
          </div>
        )}

        <div className="ml-card-cover-overlay" />

        <div className="ml-card-badge">
          <i className={`bi ${badgeIcon}`} />
          <span>{badgeLabel}</span>
        </div>

        <div className="ml-card-pct">{Math.round(animatedCardPct)}%</div>
      </div>

      <div className="ml-card-body">
        <div className="ml-card-title" title={displayTitle}>
          {displayTitle}
        </div>

        <div className="ml-card-meta">
          <span className="ml-pill">
            <i className="bi bi-journals" /> {c.completedLessons}/{c.totalLessons} {ui.lessons}
          </span>
          <span className="ml-pill">
            <i className="bi bi-layers" /> {c.completedUnits}/{c.totalUnits} {ui.units}
          </span>

          {c.isCompletedCourse && (
            <span className="ml-pill ml-pill-success">
              <i className="bi bi-award-fill" /> {ui.certificate}
            </span>
          )}
        </div>

        <div className="ml-progress">
          <div className="ml-progress-row">
            <span className="ml-muted">{ui.progress}</span>
            <span className="ml-progress-val">{Math.round(animatedCardPct)}%</span>
          </div>
          <ProgressBar now={Math.round(animatedCardPct)} />
        </div>

        <div className="ml-actions">
          <Button variant="primary" className="ml-btn-primary" disabled={!!isContinuing} onClick={onContinue}>
            <i className="bi bi-play-fill" /> {isContinuing ? ui.continueLoading : ui.continue}
          </Button>

          <Button variant="outline-light" className="ml-btn-secondary" onClick={onDetails}>
            {ui.details}
          </Button>
        </div>

        {c.isCompletedCourse && (
          <div className="mt-2 d-grid">
            <Button
              variant="outline-success"
              className="ml-btn-cert"
              disabled={!!downloading[c.courseKey]}
              onClick={onDownloadCert}
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

/* ===================== CARD: SIMPLE (Saved for Later, no Continue) ===================== */
/* ===================== CARD: SAVED (same look as FULL, but no Continue) ===================== */
function CourseCardSaved({ c, onDetails, ui, pickText }) {
  const displayTitle = pickText(c.title, c.title_km) || ui.untitled;

  return (
    <Card className="ml-card">
      {/* Cover */}
      <div className="ml-card-cover">
        {c.thumbnail ? (
          <img src={c.thumbnail} alt={displayTitle} className="ml-card-img" />
        ) : (
          <div className="ml-card-img ml-card-img-fallback">
            <i className="bi bi-journal-code" />
          </div>
        )}

        <div className="ml-card-cover-overlay" />

        {/* Badge */}
        <div className="ml-card-badge">
          <i className="bi bi-bookmark-fill" />
          <span>{ui.savedForLater}</span>
        </div>
      </div>

      {/* Body */}
      <div className="ml-card-body">
        <div className="ml-card-title" title={displayTitle}>
          {displayTitle}
        </div>

        <div className="ml-card-meta">
          <span className="ml-pill">
            <i className="bi bi-journals" /> {c.totalLessons} {ui.lessons}
          </span>
          <span className="ml-pill">
            <i className="bi bi-layers" /> {c.totalUnits} {ui.units}
          </span>
          <span className="ml-pill ml-pill-muted">
            <i className="bi bi-bookmark" /> {ui.savedForLater}
          </span>
        </div>

        {/* Actions (Start Learning + Details) */}
        <div className="ml-actions">
          <Button variant="primary" className="ml-btn-primary" onClick={onDetails}>
            <i className="bi bi-play-fill" /> {ui.startLearning}
          </Button>

          <Button variant="outline-light" className="ml-btn-secondary" onClick={onDetails}>
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

  const pickText = useCallback((en, km) => (lang === "km" ? km || en || "" : en || km || ""), [lang]);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        pageTitle: "ការរៀនរបស់ខ្ញុំ",
        subtitle: "តម្រៀបតាមវឌ្ឍនភាពខ្ពស់ជាងគេ •",
        back: "ត្រឡប់ក្រោយ",
        browseCourses: "រកមើលវគ្គសិក្សា",
        loading: "កំពុងផ្ទុក...",
        empty: "មិនមានវគ្គសិក្សានៅទីនេះទេ។",
        started: "បានចាប់ផ្តើម",
        failed: "មិនអាចផ្ទុកវឌ្ឍនភាពការរៀនបានទេ។",

        tabInProgress: "កំពុងរៀន",
        tabCompleted: "បានបញ្ចប់",
        tabSaved: "រក្សាទុកក្រោយ",
        savedForLater: "រក្សាទុកក្រោយ",

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
        startLearning: "ចាប់ផ្តើមរៀន",

      };
    }
    return {
      startLearning: "Start Learning",
      pageTitle: "My Learning",
      subtitle: "Sorted by most progress •",
      back: "Back",
      browseCourses: "Browse Courses",
      loading: "Loading...",
      empty: "No courses here yet.",
      started: "started",
      failed: "Failed to load your learning progress.",

      tabInProgress: "In Progress",
      tabCompleted: "Completed",
      tabSaved: "Saved for Later",
      savedForLater: "Saved for Later",

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

  // merged list (progress + saved-only)
  const [items, setItems] = useState([]);

  // cert download state
  const [downloading, setDownloading] = useState({});
  const [statsErr, setStatsErr] = useState(null);

  const [certPreview, setCertPreview] = useState(null);
  const certRef = useRef(null);

  // Continue loading per course
  const [continuing, setContinuing] = useState({});

  // user name for certificate
  const [userName, setUserName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.name || "Student";
    } catch {
      return "Student";
    }
  });

  // ✅ modern tabs (no react-bootstrap Nav)
  const [activeTab, setActiveTab] = useState("inprogress");

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
     data loading + cache
     ✅ uses /my/courses (enrolled/progress) + /courses (is_saved truth)
  ===================== */
  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setErr(null);

      try {
        const [myRes, coursesRes] = await Promise.allSettled([api.get("/my/courses"), api.get("/courses")]);

        const myCourses =
          myRes.status === "fulfilled"
            ? Array.isArray(myRes.value.data)
              ? myRes.value.data
              : Array.isArray(myRes.value.data?.data)
                ? myRes.value.data.data
                : []
            : [];

        const allCourses =
          coursesRes.status === "fulfilled"
            ? Array.isArray(coursesRes.value.data)
              ? coursesRes.value.data
              : Array.isArray(coursesRes.value.data?.data)
                ? coursesRes.value.data.data
                : []
            : [];

        // saved truth from /courses
        const savedMap = new Map();
        allCourses.forEach((c) => {
          const key = String(c?.slug || c?.id || "");
          if (!key) return;
          savedMap.set(key, {
            is_saved: toBool(c?.is_saved),
            title: c?.title || ui.untitled,
            title_km: c?.title_km || null,
            thumbnail: c?.thumbnail_url || "",
            totalUnits: Number(c?.units_count || 0),
            totalLessons: Number(c?.lessons_count || 0),
          });
        });

        // 1) enrolled/progress courses
        const progressItems = myCourses
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
            const saved = savedMap.get(key);

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

              // truth
              is_saved: saved ? !!saved.is_saved : false,

              // ✅ IMPORTANT: enrolled -> NEVER show in Saved for Later
              isEnrolled: true,
            };
          })
          .filter(Boolean);

        const enrolledKeys = new Set(progressItems.map((x) => String(x.courseKey)));

        // 2) saved-only courses (saved but NOT enrolled)
        const savedOnlyItems = [];
        for (const [key, s] of savedMap.entries()) {
          if (!s?.is_saved) continue;
          if (enrolledKeys.has(String(key))) continue;

          savedOnlyItems.push({
            courseKey: String(key),
            title: s.title,
            title_km: s.title_km,
            thumbnail: s.thumbnail,

            completedLessons: 0,
            totalLessons: s.totalLessons,
            completedUnits: 0,
            totalUnits: s.totalUnits,
            progressPct: 0,
            isCompletedCourse: false,

            is_saved: true,
            isEnrolled: false,
          });
        }

        const merged = [...progressItems, ...savedOnlyItems].sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));

        if (!isMountedRef.current) return;
        setItems(merged);
        writeMyLearningCache(merged);
      } catch (e) {
        console.error(e);
        if (!isMountedRef.current) return;
        setErr(ui.failed);
        setItems([]);
      } finally {
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [ui.failed, ui.untitled]
  );

  // cache first, then background refresh
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

  // auto refresh when progress OR saved changes
  useEffect(() => {
    const refreshIfDirty = () => {
      const dirtyProgress = localStorage.getItem("progress_dirty") === "1";
      const dirtySaved = localStorage.getItem("courses_dirty") === "1";
      if (!dirtyProgress && !dirtySaved) return;

      localStorage.removeItem("progress_dirty");
      localStorage.removeItem("courses_dirty");
      loadAll({ silent: true });
    };

    const onFocus = () => refreshIfDirty();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshIfDirty();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("progress-dirty", refreshIfDirty);
    window.addEventListener("courses-changed", refreshIfDirty);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("progress-dirty", refreshIfDirty);
      window.removeEventListener("courses-changed", refreshIfDirty);
    };
  }, [loadAll]);

  /* ===================== certificate download ===================== */
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

  /* =====================
     continue resolver (unchanged)
  ===================== */
  const handleContinue = useCallback(
    async (c) => {
      const courseSlug = String(c?.courseKey || "");
      if (!courseSlug) return;

      setStatsErr(null);
      setContinuing((p) => ({ ...p, [courseSlug]: true }));

      try {
        const cr = await api.get(`/courses/${courseSlug}`);
        const course = cr?.data || {};
        const units = Array.isArray(course?.units) ? course.units : [];

        let progressData = null;
        try {
          const pr = await api.get(`/progress/course/${courseSlug}`);
          progressData = pr?.data || null;
        } catch {
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

        for (let uIndex = 0; uIndex < units.length; uIndex++) {
          const u = units[uIndex];
          const lessons = Array.isArray(u?.lessons) ? u.lessons : [];
          const unitIdStr = String(u?.id);

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

          for (let lIndex = 0; lIndex < lessons.length; lIndex++) {
            const lid = lessons[lIndex]?.id;
            if (!lid) continue;
            if (!isLessonCompleted(lid)) {
              navigate(`/course/${courseSlug}/unit/${u.id}/lesson/${lid}`);
              return;
            }
          }

          if (hasUnitCoding(u) && !isCodingCompleted(unitIdStr)) {
            navigate(`/course/${courseSlug}/unit/${u.id}/coding`);
            return;
          }

          if ((Number(u?.qcm_count) || 0) > 0 && !isQcmCompleted(unitIdStr)) {
            navigate(`/course/${courseSlug}/unit/${u.id}/qcm`);
            return;
          }
        }

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

  /* =====================
     TAB subsets (filtered + sorted subset)
  ===================== */
  const inProgressItems = useMemo(() => {
    return items
      .filter((c) => c.isEnrolled && !c.isCompletedCourse && (c.progressPct || 0) > 0)
      .slice()
      .sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));
  }, [items]);

  const completedItems = useMemo(() => {
    return items
      .filter((c) => c.isEnrolled && !!c.isCompletedCourse)
      .slice()
      .sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));
  }, [items]);

  const savedForLaterItems = useMemo(() => {
    // ✅ Saved for Later = saved AND NOT enrolled
    return items
      .filter((c) => !!c.is_saved && !c.isEnrolled)
      .slice()
      .sort((a, b) => (b.totalLessons || 0) - (a.totalLessons || 0));
  }, [items]);

  const tabCounts = useMemo(() => {
    return {
      inprogress: inProgressItems.length,
      completed: completedItems.length,
      saved: savedForLaterItems.length,
    };
  }, [inProgressItems.length, completedItems.length, savedForLaterItems.length]);

  const renderGrid = (list, mode) => {
    if (loading) return <div className="ml-empty">{ui.loading}</div>;
    if (!list.length) return <div className="ml-empty">{ui.empty}</div>;

    return (
      <Row className="g-3">
        {list.map((c) => {
          const courseKey = String(c.courseKey);
          const isContinuing = !!continuing[courseKey];

          return (
            <Col md={6} key={courseKey}>
              {mode === "saved" ? (
                <CourseCardSaved
                  c={c}
                  ui={ui}
                  pickText={pickText}
                  onDetails={() => navigate(`/courses/${courseKey}`)}
                />
              ) : (
                <CourseCardFull
                  c={c}
                  downloading={downloading}
                  isContinuing={isContinuing}
                  ui={ui}
                  pickText={pickText}
                  onContinue={() => !isContinuing && handleContinue(c)}
                  onDetails={() => navigate(`/courses/${courseKey}`)}
                  onDownloadCert={() => onDownloadCert(c)}
                />
              )}
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div className="ml-page">
      <Container className="ml-container">
        {err && <Alert variant="danger">{err}</Alert>}
        {statsErr && <Alert variant="warning">{statsErr}</Alert>}

        {/* Hidden certificate render for download */}
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

        {/* Header */}
        <div className="ml-header">
          <div>
            <h2 className="ml-title">{ui.pageTitle}</h2>
            <div className="ml-subtitle">{ui.subtitle}</div>
          </div>

          <div className="ml-header-actions">
            <Button variant="outline-light" onClick={() => navigate("/dashboard")}>
              <i className="bi bi-arrow-left" /> {ui.back}
            </Button>
            <Button variant="outline-light" onClick={() => navigate("/courses")}>
              {ui.browseCourses}
            </Button>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="ml-tabsBar">
          <button
            type="button"
            className={`ml-tabBtn ${activeTab === "inprogress" ? "is-active" : ""}`}
            onClick={() => setActiveTab("inprogress")}
          >
            {ui.tabInProgress}
            <span className="ml-tabCount">{tabCounts.inprogress}</span>
          </button>

          <button
            type="button"
            className={`ml-tabBtn ${activeTab === "completed" ? "is-active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            {ui.tabCompleted}
            <span className="ml-tabCount">{tabCounts.completed}</span>
          </button>

          <button
            type="button"
            className={`ml-tabBtn ${activeTab === "saved" ? "is-active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            {ui.tabSaved}
            <span className="ml-tabCount">{tabCounts.saved}</span>
          </button>
        </div>

        {/* Content */}
        <div className="ml-content">
          {activeTab === "inprogress" && renderGrid(inProgressItems, "full")}
          {activeTab === "completed" && renderGrid(completedItems, "full")}
          {activeTab === "saved" && renderGrid(savedForLaterItems, "saved")}
        </div>
      </Container>
    </div>
  );
}
