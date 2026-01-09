import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Container, Accordion, ProgressBar, Button, Alert } from "react-bootstrap";
import CertificateModal from "../../components/CertificateModal";
import "./CourseDetail.css";
import api from "../../lib/api";

// ✅ Use UserContext instead of calling /auth/me here
import { useUser } from "../../context/UserContext";

/* ---------------------------------
   Helpers
---------------------------------- */
const getUnitCodingEn = (unitObj) =>
  unitObj?.codingExerciseEn ??
  unitObj?.coding_exercise_en ??
  unitObj?.codingExercise ??
  unitObj?.coding_exercise ??
  null;

const hasUnitCoding = (unitObj) => !!getUnitCodingEn(unitObj);
const unitCodingCount = (unitObj) => (hasUnitCoding(unitObj) ? 1 : 0);

/* ---------------------------------
   XP Milestone helper (every 500 XP)
---------------------------------- */
const getMilestoneCrossed = (oldXp, newXp) => {
  const oldLevel = Math.floor(Number(oldXp || 0) / 500);
  const newLevel = Math.floor(Number(newXp || 0) / 500);
  return newLevel > oldLevel ? newLevel * 500 : null;
};

/* ---------------------------------
   Certificate popup helper
---------------------------------- */
const certSeenKey = (courseKey, completedAt, userKey) =>
  `cert_seen_v3:${userKey}:${courseKey}:${completedAt || "unknown"}`;

/* ---------------------------------
   ✅ User key helper (so cache is per-user)
---------------------------------- */
function readLocalUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
function getUserKeyFromUser(user) {
  if (!user) return "anon";
  if (user?.id != null) return `uid:${user.id}`;
  if (user?.email) return `email:${user.email}`;
  if (user?.name) return `name:${user.name}`;
  return "anon";
}

/* ---------------------------------
   ✅ Course detail cache (per course)
---------------------------------- */
const COURSE_DETAIL_CACHE_KEY = "course_detail_v1";
const COURSE_DETAIL_TTL_MS = 30 * 60 * 1000;

function readCourseCache(courseKey) {
  try {
    const raw = localStorage.getItem(COURSE_DETAIL_CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    const item = all?.[courseKey];
    if (!item) return null;
    const ts = item?.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (!ts || Date.now() - ts > COURSE_DETAIL_TTL_MS) return null;
    return item?.course || null;
  } catch {
    return null;
  }
}
function writeCourseCache(courseKey, course) {
  try {
    const raw = localStorage.getItem(COURSE_DETAIL_CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[courseKey] = { course, updatedAt: new Date().toISOString() };
    localStorage.setItem(COURSE_DETAIL_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

/* ---------------------------------
   ✅ Progress cache (per user + per course)
---------------------------------- */
const PROGRESS_CACHE_KEY = "course_progress_v3";
const PROGRESS_CACHE_TTL_MS = 10 * 60 * 1000;

function readProgressCache(userKey, courseKey) {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    if (!raw) return null;

    const all = JSON.parse(raw);
    const courseCache = all?.[userKey]?.[courseKey];
    if (!courseCache) return null;

    const ts = courseCache?.updatedAt ? new Date(courseCache.updatedAt).getTime() : 0;
    if (!ts || Date.now() - ts > PROGRESS_CACHE_TTL_MS) return null;

    return {
      isEnrolled: !!courseCache.isEnrolled,
      completedLessonIds: Array.isArray(courseCache.completedLessonIds) ? courseCache.completedLessonIds : [],
      unitProgressMap: courseCache.unitProgressMap || {},
      certCompleted: !!courseCache.certCompleted,
      certCompletedAt: courseCache.certCompletedAt || null,
      spentMinutes: Number(courseCache.spentMinutes || 0),
    };
  } catch {
    return null;
  }
}

function writeProgressCache(userKey, courseKey, data) {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[userKey]) all[userKey] = {};

    all[userKey][courseKey] = {
      isEnrolled: !!data.isEnrolled,
      completedLessonIds: data.completedLessonIds || [],
      unitProgressMap: data.unitProgressMap || {},
      certCompleted: !!data.certCompleted,
      certCompletedAt: data.certCompletedAt || null,
      spentMinutes: Number(data.spentMinutes || 0),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

function clearProgressCacheForCourse(userKey, courseKey) {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    if (!all?.[userKey]?.[courseKey]) return;
    delete all[userKey][courseKey];
    localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

/* ---------------------------------
   ✅ Broadcast channel (instant sync)
---------------------------------- */
const PROGRESS_CHANNEL = "course_progress_channel_v1";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const aliveRef = useRef(true);

  // ✅ Global user (no /auth/me here)
  const { user } = useUser();

  const userKeyRef = useRef(getUserKeyFromUser(user));
  const [userName, setUserName] = useState(() => user?.name || readLocalUser()?.name || "Student");

  // keep userKey fresh
  useEffect(() => {
    userKeyRef.current = getUserKeyFromUser(user);
    setUserName(user?.name || readLocalUser()?.name || "Student");
  }, [user]);

  // ✅ Accordion
  const [openUnitKey, setOpenUnitKey] = useState("0");

  // ✅ language
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

  const pickText = useCallback((en, km) => (lang === "km" ? km || en || "" : en || km || ""), [lang]);

  // course cache first
  const initialCourseKey = String(id);
  const [course, setCourse] = useState(() => readCourseCache(initialCourseKey));
  const [loading, setLoading] = useState(() => !readCourseCache(initialCourseKey));

  const units = useMemo(() => (Array.isArray(course?.units) ? course.units : []), [course]);
  const courseSlug = course?.slug || id;
  const courseKey = String(courseSlug);

  // ✅ reset accordion on course change
  useEffect(() => setOpenUnitKey("0"), [courseKey]);

  const courseTitleUI = useMemo(() => pickText(course?.title, course?.title_km), [course, pickText]);

  // ✅ XP cache
  const [xpBalance, setXpBalance] = useState(() => {
    const v = localStorage.getItem("xp_balance_cache_v1");
    return v ? Number(v) : 0;
  });
  const [xpMilestone, setXpMilestone] = useState(null);

  // ✅ progress state - init from cache instantly
  const cachedInitial = useMemo(() => readProgressCache(userKeyRef.current, initialCourseKey), [initialCourseKey]);

  const [isEnrolled, setIsEnrolled] = useState(() => cachedInitial?.isEnrolled || false);
  const [enrollCheckLoading, setEnrollCheckLoading] = useState(true);

  const [progressLoading, setProgressLoading] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set(cachedInitial?.completedLessonIds || []));
  const [unitProgressMap, setUnitProgressMap] = useState(() => cachedInitial?.unitProgressMap || {});

  const [certLoading, setCertLoading] = useState(false);
  const [certCompleted, setCertCompleted] = useState(() => cachedInitial?.certCompleted || false);
  const [certCompletedAt, setCertCompletedAt] = useState(() => cachedInitial?.certCompletedAt || null);
  const [spentMinutes, setSpentMinutes] = useState(() => cachedInitial?.spentMinutes || 0);
  const [showCert, setShowCert] = useState(false);

  // refs (latest values)
  const isEnrolledRef = useRef(isEnrolled);
  const completedLessonIdsRef = useRef(completedLessonIds);
  const unitProgressMapRef = useRef(unitProgressMap);
  const certCompletedRef = useRef(certCompleted);
  const certCompletedAtRef = useRef(certCompletedAt);
  const spentMinutesRef = useRef(spentMinutes);

  useEffect(() => void (isEnrolledRef.current = isEnrolled), [isEnrolled]);
  useEffect(() => void (completedLessonIdsRef.current = completedLessonIds), [completedLessonIds]);
  useEffect(() => void (unitProgressMapRef.current = unitProgressMap), [unitProgressMap]);
  useEffect(() => void (certCompletedRef.current = certCompleted), [certCompleted]);
  useEffect(() => void (certCompletedAtRef.current = certCompletedAt), [certCompletedAt]);
  useEffect(() => void (spentMinutesRef.current = spentMinutes), [spentMinutes]);

  // prevent spamming
  const progressBusyRef = useRef(false);
  const certBusyRef = useRef(false);

  /* ----------------------------
     Load course detail (cache first, fetch in background)
  ---------------------------- */
  useEffect(() => {
    aliveRef.current = true;

    const cached = readCourseCache(String(id));
    if (cached) {
      setCourse(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    api
      .get(`/courses/${id}`)
      .then((res) => {
        if (!aliveRef.current) return;
        setCourse(res.data);
        setLoading(false);
        const slug = String(res.data?.slug || id);
        writeCourseCache(String(id), res.data);
        writeCourseCache(slug, res.data);
      })
      .catch((err) => {
        console.error("Failed to load course detail:", err);
        if (!aliveRef.current) return;
        if (!readCourseCache(String(id))) setCourse(null);
      })
      .finally(() => {
        if (!aliveRef.current) return;
        setLoading(false);
      });

    return () => {
      aliveRef.current = false;
    };
  }, [id]);

  /* ----------------------------
     Refresh XP (no /auth/me)
     - uses UserContext user.xp_balance if available
     - otherwise keeps local cache value
  ---------------------------- */
  const refreshXp = useCallback(async () => {
    const newXp = Number(user?.xp_balance ?? xpBalance ?? 0) || 0;

    setXpBalance((oldXp) => {
      const crossed = getMilestoneCrossed(oldXp, newXp);
      if (crossed) setXpMilestone(crossed);
      return newXp;
    });

    try {
      localStorage.setItem("xp_balance_cache_v1", String(newXp));
    } catch {}
  }, [user, xpBalance]);

  useEffect(() => {
    const onXpUpdated = () => refreshXp();
    window.addEventListener("xp-updated", onXpUpdated);
    return () => window.removeEventListener("xp-updated", onXpUpdated);
  }, [refreshXp]);

  useEffect(() => {
    // keep xp in sync whenever user changes
    refreshXp();
  }, [refreshXp]);

  /* ----------------------------
     ✅ Apply cache instantly (NO LOADING)
  ---------------------------- */
  const applyCachedProgress = useCallback(() => {
    const uKey = userKeyRef.current;
    const cached = readProgressCache(uKey, courseKey);
    if (!cached) return false;

    setIsEnrolled(!!cached.isEnrolled);
    setCompletedLessonIds(new Set(cached.completedLessonIds || []));
    setUnitProgressMap(cached.unitProgressMap || {});
    setCertCompleted(!!cached.certCompleted);
    setCertCompletedAt(cached.certCompletedAt || null);
    setSpentMinutes(Number(cached.spentMinutes || 0));

    return true;
  }, [courseKey]);

  /* ----------------------------
     Enrollment check (cache first, then background)
  ---------------------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseKey) return;

      // ✅ apply cache instantly so UI never waits
      const hadCache = applyCachedProgress();
      setEnrollCheckLoading(!hadCache);

      try {
        await api.get(`/progress/course/${courseKey}`);
        if (!alive) return;
        setIsEnrolled(true);

        // update cache enrollment only
        const uKey = userKeyRef.current;
        const cached = readProgressCache(uKey, courseKey);
        writeProgressCache(uKey, courseKey, {
          completedLessonIds: cached?.completedLessonIds || Array.from(completedLessonIdsRef.current || []),
          unitProgressMap: cached?.unitProgressMap || unitProgressMapRef.current || {},
          isEnrolled: true,
          certCompleted: cached?.certCompleted ?? certCompletedRef.current,
          certCompletedAt: cached?.certCompletedAt ?? certCompletedAtRef.current,
          spentMinutes: cached?.spentMinutes ?? spentMinutesRef.current,
        });
      } catch {
        if (!alive) return;
        setIsEnrolled(false);
      } finally {
        if (alive) setEnrollCheckLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseKey]);

  /* ----------------------------
     ✅ refreshProgress (supports silent)
  ---------------------------- */
  const refreshProgress = useCallback(
    async ({ silent = false } = {}) => {
      const uKey = userKeyRef.current;
      if (!courseKey || !isEnrolledRef.current) return;

      if (progressBusyRef.current) return;
      progressBusyRef.current = true;

      // ✅ instantly apply cache (no loading)
      applyCachedProgress();

      if (!silent) setProgressLoading(true);

      try {
        const { data } = await api.get(`/progress/course/${courseKey}`);
        const ids = Array.isArray(data?.completed_lesson_ids) ? data.completed_lesson_ids : [];
        const idsArray = ids.map((x) => Number(x));

        setCompletedLessonIds(new Set(idsArray));
        setUnitProgressMap(data?.unit_progress || {});

        writeProgressCache(uKey, courseKey, {
          completedLessonIds: idsArray,
          unitProgressMap: data?.unit_progress || {},
          isEnrolled: true,
          certCompleted: certCompletedRef.current,
          certCompletedAt: certCompletedAtRef.current,
          spentMinutes: spentMinutesRef.current,
        });
      } catch (e) {
        console.error("Failed to load progress:", e);
      } finally {
        if (!silent) setProgressLoading(false);
        progressBusyRef.current = false;
      }
    },
    [courseKey, applyCachedProgress]
  );

  /* ----------------------------
     ✅ refreshCertificate (supports silent)
  ---------------------------- */
  const refreshCertificate = useCallback(
    async ({ silent = false } = {}) => {
      const uKey = userKeyRef.current;
      if (!courseKey || !isEnrolledRef.current) return;

      if (certBusyRef.current) return;
      certBusyRef.current = true;

      // ✅ instantly apply cache (no loading)
      applyCachedProgress();

      if (!silent) setCertLoading(true);

      try {
        const { data } = await api.get(`/certificates/course/${courseKey}`);

        const done = !!data?.completed;
        setCertCompleted(done);

        const completedAt = data?.completed_at || data?.completedAt || null;
        setCertCompletedAt(completedAt);

        const minutes = Number(data?.time_spent_minutes || 0);
        setSpentMinutes(minutes);

        writeProgressCache(uKey, courseKey, {
          completedLessonIds: Array.from(completedLessonIdsRef.current || []),
          unitProgressMap: unitProgressMapRef.current || {},
          isEnrolled: isEnrolledRef.current,
          certCompleted: done,
          certCompletedAt: completedAt,
          spentMinutes: minutes,
        });

        if (done) {
          const key = certSeenKey(courseKey, completedAt || "done", uKey);
          const alreadySeen = localStorage.getItem(key) === "1";
          if (!alreadySeen) {
            setShowCert(true);
            localStorage.setItem(key, "1");
          }
        }

        if (location.state?.showCertificate) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      } catch {
        setCertCompleted(false);

        if (location.state?.showCertificate) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      } finally {
        if (!silent) setCertLoading(false);
        certBusyRef.current = false;
      }
    },
    [courseKey, applyCachedProgress, location.state, location.pathname, navigate]
  );

  /* ----------------------------
     ✅ When enrolled: background refresh once
  ---------------------------- */
  useEffect(() => {
    if (!isEnrolled) return;
    let mounted = true;

    const loadAll = async () => {
      if (!mounted) return;
      await Promise.all([refreshProgress({ silent: true }), refreshCertificate({ silent: true }), refreshXp()]);
    };

    loadAll();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnrolled]);

  /* ----------------------------
     ✅ When user comes back to CourseDetail:
     1) Apply cache instantly (NO loading)
     2) Refresh silently in background
     Also listens to BroadcastChannel from learning pages
  ---------------------------- */
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel(PROGRESS_CHANNEL);
    } catch {
      bc = null;
    }

    const handleIncoming = (msg) => {
      const data = msg?.data;
      if (!data) return;
      if (String(data.courseKey) !== String(courseKey)) return;
      // 1) update UI instantly from cache
      applyCachedProgress();
      // 2) silent refresh (optional)
      refreshProgress({ silent: true });
      refreshCertificate({ silent: true });
    };

    const onFocus = () => {
      // instantly apply cache first
      applyCachedProgress();

      // if dirty marker exists for this course -> refresh silently
      const dirtyCourse = localStorage.getItem("progress_dirty_course");
      if (dirtyCourse === String(courseKey)) {
        setTimeout(() => {
          refreshProgress({ silent: true });
          refreshCertificate({ silent: true });
        }, 80);

        localStorage.removeItem("progress_dirty");
        localStorage.removeItem("progress_dirty_course");
      }
    };

    const onStorage = () => {
      // other tab updated localStorage: apply cache instantly
      applyCachedProgress();
    };

    if (bc) bc.addEventListener("message", handleIncoming);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      if (bc) bc.removeEventListener("message", handleIncoming);
      try {
        if (bc) bc.close();
      } catch {}
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseKey]);

  /* ----------------------------
     Enroll and start
  ---------------------------- */
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollErr, setEnrollErr] = useState(null);

  const enrollAndStart = useCallback(async () => {
    if (!course?.id) return;

    setEnrollLoading(true);
    setEnrollErr(null);

    try {
      await api.post("/enroll", { course_id: course.id });
      setIsEnrolled(true);

      // mark dirty (for focus return)
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));

      // clear cache so next refresh gets fresh (optional)
      clearProgressCacheForCourse(userKeyRef.current, courseKey);

      refreshXp();

      const firstUnit = units?.[0];
      const firstLesson = firstUnit?.lessons?.[0];

      if (firstUnit?.id && firstLesson?.id) {
        navigate(`/course/${courseSlug}/unit/${firstUnit.id}/lesson/${firstLesson.id}`);
        return;
      }
      navigate(`/courses/${courseSlug}`);
    } catch (e) {
      setEnrollErr(
        e?.response?.data?.message ||
          pickText("Failed to enroll. Please try again.", "បរាជ័យក្នុងការចុះឈ្មោះ។ សូមសាកល្បងម្ដងទៀត។")
      );
    } finally {
      setEnrollLoading(false);
    }
  }, [course?.id, units, navigate, courseSlug, courseKey, pickText, refreshXp]);

  /* ----------------------------
     Progress helpers
  ---------------------------- */
  const isLessonCompleted = useCallback((lessonIdNum) => completedLessonIds.has(Number(lessonIdNum)), [completedLessonIds]);
  const isUnitCompleted = useCallback((unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.completed, [unitProgressMap]);
  const isCodingCompleted = useCallback((unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.coding_completed, [unitProgressMap]);
  const isQcmCompleted = useCallback((unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.quiz_passed, [unitProgressMap]);

  const canOpenUnitUI = useCallback(
    (idx) => {
      if (!isEnrolled) return false;
      if (idx <= 0) return true;
      const prev = units[idx - 1];
      return prev ? isUnitCompleted(prev.id) : false;
    },
    [isEnrolled, units, isUnitCompleted]
  );

  const continueLearning = useCallback(async () => {
    if (!isEnrolled) return;
    await refreshProgress({ silent: true });

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
              return navigate(`/course/${courseSlug}/unit/${prev.id}/lesson/${prevLessons[i].id}`);
            }
          }
          if (hasUnitCoding(prev) && !isCodingCompleted(prev.id)) {
            return navigate(`/course/${courseSlug}/unit/${prev.id}/coding`);
          }
          if ((Number(prev.qcm_count) || 0) > 0 && !isQcmCompleted(prev.id)) {
            return navigate(`/course/${courseSlug}/unit/${prev.id}/qcm`);
          }
          if (prevLessons[0]?.id) return navigate(`/course/${courseSlug}/unit/${prev.id}/lesson/${prevLessons[0].id}`);
        }
      }

      for (let lIndex = 0; lIndex < lessons.length; lIndex++) {
        const lid = lessons[lIndex]?.id;
        if (!lid) continue;
        if (!isLessonCompleted(lid)) {
          return navigate(`/course/${courseSlug}/unit/${u.id}/lesson/${lid}`);
        }
      }

      if (hasUnitCoding(u) && !isCodingCompleted(unitIdStr)) {
        return navigate(`/course/${courseSlug}/unit/${u.id}/coding`);
      }
      if ((Number(u?.qcm_count) || 0) > 0 && !isQcmCompleted(unitIdStr)) {
        return navigate(`/course/${courseSlug}/unit/${u.id}/qcm`);
      }
    }
  }, [isEnrolled, refreshProgress, units, isUnitCompleted, isLessonCompleted, isCodingCompleted, isQcmCompleted, navigate, courseSlug]);

  /* ----------------------------
     Labels
  ---------------------------- */
  const lessonMetaLabel = useCallback(
    (unlocked, completed) => {
      if (!unlocked) return pickText("Locked 🔒", "បានចាក់សោ 🔒");
      if (completed) return pickText("Completed ✅", "បានបញ្ចប់ ✅");
      return pickText("Open", "បើក");
    },
    [pickText]
  );

  const codingMetaLabel = useCallback(
    (unlocked, completed) => {
      if (!unlocked) return pickText("Locked 🔒", "បានចាក់សោ 🔒");
      if (completed) return pickText("Completed ✅", "បានបញ្ចប់ ✅");
      return pickText("Open", "បើក");
    },
    [pickText]
  );

  const qcmMetaLabel = useCallback(
    (unlocked, completed) => {
      if (!unlocked) return pickText("Locked 🔒", "បានចាក់សោ 🔒");
      if (completed) return pickText("Completed ✅", "បានបញ្ចប់ ✅");
      return pickText("Quiz", "សំណួរ");
    },
    [pickText]
  );

  /* ----------------------------
     Early returns
  ---------------------------- */
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
  if (!course) return <h2 className="text-center mt-5">{pickText("Course not found", "រកមិនឃើញវគ្គសិក្សា")}</h2>;

  /* ----------------------------
     Numbers
  ---------------------------- */
  const totalUnits = units.length;
  const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
  const totalQcmQuestions = units.reduce((acc, u) => acc + (Number(u.qcm_count) || 0), 0);
  const totalCoding = units.reduce((acc, u) => acc + unitCodingCount(u), 0);

  const totalQuizSteps = units.reduce((acc, u) => acc + ((Number(u.qcm_count) || 0) > 0 ? 1 : 0), 0);
  const totalCodingSteps = units.reduce((acc, u) => acc + (hasUnitCoding(u) ? 1 : 0), 0);

  const completedLessonsCount = completedLessonIds.size;
  const completedQuizSteps = units.reduce(
    (acc, u) => acc + ((Number(u.qcm_count) || 0) > 0 && isQcmCompleted(u.id) ? 1 : 0),
    0
  );
  const completedCodingSteps = units.reduce(
    (acc, u) => acc + (hasUnitCoding(u) && isCodingCompleted(u.id) ? 1 : 0),
    0
  );

  const totalSteps = totalLessons + totalQuizSteps + totalCodingSteps;
  const completedSteps = completedLessonsCount + completedQuizSteps + completedCodingSteps;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const showProgress = !enrollCheckLoading && isEnrolled;

  // ✅ Notice: we no longer show "Loading..." when returning; cache is applied first
  const rightText = showProgress ? `${progressPercent}%` : "";
  const barNow = showProgress ? progressPercent : 0;

  const subText =
    showProgress
      ? pickText(
          `${completedSteps} / ${totalSteps} steps completed • ` +
            `${completedLessonsCount}/${totalLessons} lessons • ` +
            `${completedQuizSteps}/${totalQuizSteps} quizzes • ` +
            `${completedCodingSteps}/${totalCodingSteps} coding`,
          `${completedSteps} / ${totalSteps} ជំហានបានបញ្ចប់ • ` +
            `${completedLessonsCount}/${totalLessons} មេរៀន • ` +
            `${completedQuizSteps}/${totalQuizSteps} សំណួរ • ` +
            `${completedCodingSteps}/${totalCodingSteps} Coding`
        )
      : "";

  const isCourseCompleted = showProgress && progressPercent >= 100 && certCompleted;

  return (
    <div className="course-detail-page">
      <Container className="cd-container">
        <h1 className="course-premium-title">{courseTitleUI}</h1>

        <div className="cd-desc-box">
          <p>{pickText(course?.description, course?.description_km)}</p>
        </div>

        {xpMilestone && (
          <Alert
            variant="warning"
            style={{
              marginTop: 12,
              background: "rgba(255, 193, 7, 0.15)",
              border: "1px solid rgba(255, 193, 7, 0.35)",
              color: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <b>🎉 {pickText("Milestone reached!", "🎉 សម្រេចបានគោលដៅ!")}</b>{" "}
                {pickText("You hit", "អ្នកបានឈានដល់")} <b>{xpMilestone} XP</b>.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button size="sm" variant="light" onClick={() => navigate("/avatar")}>
                  {pickText("Go to Avatar", "ទៅកាន់ Avatar")}
                </Button>
                <Button size="sm" variant="outline-light" onClick={() => setXpMilestone(null)}>
                  {pickText("Continue", "បន្ត")}
                </Button>
              </div>
            </div>
            <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>
              {pickText(`Current XP: ${xpBalance}`, `XP បច្ចុប្បន្ន: ${xpBalance}`)}
            </div>
          </Alert>
        )}

        {!enrollCheckLoading && !isEnrolled && (
          <div
            className="mt-3 p-4 rounded"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(124,58,237,0.22))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ color: "rgba(255,255,255,0.95)", fontWeight: 900, fontSize: 18 }}>
                  {pickText("Start learning", "ចាប់ផ្តើមរៀន")}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                  {pickText(
                    "Unlock Unit 1 • Lesson 1 and begin tracking your progress.",
                    "ដោះសោជំពូក 1 • មេរៀន 1 ហើយចាប់ផ្តើមកត់ត្រាការរីកចម្រើន។"
                  )}
                </div>
              </div>

              <Button
                size="lg"
                disabled={enrollLoading}
                onClick={enrollAndStart}
                style={{ borderRadius: 999, padding: "12px 22px", fontWeight: 800, letterSpacing: 0.2 }}
              >
                {enrollLoading
                  ? pickText("Starting…", "កំពុងចាប់ផ្តើម…")
                  : `▶ ${pickText("Start Learning", "ចាប់ផ្តើមរៀន")}`}
              </Button>
            </div>
          </div>
        )}

        {enrollErr && (
          <Alert variant="danger" className="mt-2">
            {enrollErr}
          </Alert>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              {pickText("Your Progress", "វឌ្ឍនភាពការរៀន")}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)" }}>{rightText}</div>
          </div>

          <ProgressBar now={barNow} />
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{subText}</div>

          {!certLoading && showProgress && (
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              {certCompleted ? pickText("🎉 Certificate available!", "🎉 មានវិញ្ញាបនបត្រ!") : ""}
            </div>
          )}
          {certCompleted && certCompletedAt && (
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              {pickText("Completed on", "បានបញ្ចប់នៅ")} {new Date(certCompletedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="cd-stats-row">
          <div className="cd-stat-box">
            <span className="cd-stat-label">{pickText("Units", "ជំពូក")}</span>
            <span className="cd-stat-value">{totalUnits}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">{pickText("Lessons", "មេរៀន")}</span>
            <span className="cd-stat-value">{totalLessons}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">{pickText("QCM", "សំណួរ")}</span>
            <span className="cd-stat-value">{totalQcmQuestions}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">{pickText("Coding", "Coding")}</span>
            <span className="cd-stat-value">{totalCoding}</span>
          </div>
        </div>

        <h3 className="cd-syllabus-title">{pickText("Course Syllabus", "មាតិកាវគ្គសិក្សា")}</h3>

        {!enrollCheckLoading && isEnrolled && (
          <div style={{ marginTop: 10, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!isCourseCompleted ? (
              <Button
                variant="success"
                onClick={continueLearning}
                disabled={progressLoading}
                style={{ borderRadius: 999, fontWeight: 800, padding: "10px 18px" }}
              >
                {progressLoading ? pickText("Loading…", "កំពុងផ្ទុក…") : `▶ ${pickText("Continue Learning", "បន្តរៀន")}`}
              </Button>
            ) : (
              <div
                className="p-3 rounded"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, rgba(16,185,129,0.20), rgba(34,197,94,0.12))",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.92)" }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    🏁 {pickText("Course Completed!", "🏁 វគ្គសិក្សាបានបញ្ចប់!")}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 2, fontSize: 13 }}>
                    {pickText(
                      "Great job — you can review lessons anytime or download your certificate.",
                      "ល្អណាស់ — អ្នកអាចមើលមេរៀនឡើងវិញបានគ្រប់ពេល ឬទាញយកវិញ្ញាបនបត្រ។"
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="light"
                    onClick={() => setShowCert(true)}
                    disabled={certLoading || !certCompleted}
                    style={{ borderRadius: 999, fontWeight: 800, padding: "10px 16px" }}
                  >
                    🏅 {pickText("View Certificate", "មើលវិញ្ញាបនបត្រ")}
                  </Button>
                  <Button
                    variant="outline-light"
                    onClick={() => navigate("/my-learning")}
                    style={{ borderRadius: 999, fontWeight: 800, padding: "10px 16px" }}
                  >
                    {pickText("Back to My Learning", "ត្រលប់ទៅ My Learning")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="cd-syllabus-box">
          <Accordion activeKey={openUnitKey} onSelect={(k) => setOpenUnitKey((prev) => (prev === k ? null : k))}>
            {units.map((unitObj, unitIndex) => {
              const hasCodingFlag = hasUnitCoding(unitObj);
              const unitUnlocked = canOpenUnitUI(unitIndex);

              const allLessonsDone = (unitObj.lessons || []).every((l) => completedLessonIds.has(Number(l.id)));
              const codingUnlocked = unitUnlocked && allLessonsDone;
              const quizUnlocked = unitUnlocked && allLessonsDone && (!hasCodingFlag || isCodingCompleted(unitObj.id));

              const codingDone = isCodingCompleted(unitObj.id);
              const qcmDone = isQcmCompleted(unitObj.id);

              const quizCount = Number(unitObj.qcm_count) || 0;
              const hasQuiz = quizCount > 0;
              const unitTitleUI = pickText(unitObj?.title, unitObj?.title_km);

              return (
                <Accordion.Item eventKey={String(unitIndex)} key={unitObj.id}>
                  <Accordion.Header>
                    <div className="cd-unit-header">
                      <div className="cd-unit-index">{unitIndex + 1}</div>
                      <div className="cd-unit-text">
                        <div className="cd-unit-title">{unitTitleUI}</div>
                        <div className="cd-unit-meta">
                          {(unitObj.lessons || []).length} {pickText("lessons", "មេរៀន")} • {quizCount} QCM
                          {hasCodingFlag ? ` • ${pickText("Coding", "Coding")}` : ""}
                        </div>
                      </div>
                    </div>
                  </Accordion.Header>

                  <Accordion.Body>
                    {(unitObj.lessons || []).map((lessonObj, lessonIndex) => {
                      const unlocked =
                        unitUnlocked &&
                        (lessonIndex === 0 || completedLessonIds.has(Number(unitObj.lessons[lessonIndex - 1]?.id)));
                      const completed = completedLessonIds.has(Number(lessonObj.id));
                      const lessonTitleUI = pickText(lessonObj?.title, lessonObj?.title_km);

                      return (
                        <div className="cd-lesson-row" key={lessonObj.id}>
                          <div className="cd-lesson-info">
                            <button
                              type="button"
                              className={`cd-lesson-title-btn ${!unlocked ? "is-locked" : ""}`}
                              onClick={() =>
                                unlocked && navigate(`/course/${courseSlug}/unit/${unitObj.id}/lesson/${lessonObj.id}`)
                              }
                              disabled={!unlocked}
                            >
                              <i className="bi bi-play-fill cd-open-icon"></i>
                              {lessonTitleUI}
                            </button>

                            <div className={`cd-lesson-meta ${unlocked ? "" : "locked"}`}>
                              {lessonMetaLabel(unlocked, completed)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {hasCodingFlag && (
                      <div className="cd-lesson-row qcm-row">
                        <div className="cd-lesson-info">
                          <button
                            type="button"
                            className={`cd-lesson-title-btn ${!codingUnlocked ? "is-locked" : ""}`}
                            onClick={() => codingUnlocked && navigate(`/course/${courseSlug}/unit/${unitObj.id}/coding`)}
                            disabled={!codingUnlocked}
                          >
                            <i className="bi bi-code-slash cd-open-icon"></i>
                            {pickText("Coding Exercise", "លំហាត់ Coding")}
                          </button>

                          <div className={`cd-lesson-meta ${codingUnlocked ? "" : "locked"}`}>
                            {codingMetaLabel(codingUnlocked, codingDone)}
                          </div>
                        </div>
                      </div>
                    )}

                    {hasQuiz && (
                      <div className="cd-lesson-row qcm-row">
                        <div className="cd-lesson-info">
                          <button
                            type="button"
                            className={`cd-lesson-title-btn ${!quizUnlocked ? "is-locked" : ""}`}
                            onClick={() => quizUnlocked && navigate(`/course/${courseSlug}/unit/${unitObj.id}/qcm`)}
                            disabled={!quizUnlocked}
                          >
                            <i className="bi bi-question-circle cd-open-icon"></i>
                            {pickText("QCM Quiz", "សំណួរ QCM")} ({quizCount} {pickText("questions", "សំណួរ")})
                          </button>

                          <div className={`cd-lesson-meta ${quizUnlocked ? "" : "locked"}`}>{qcmMetaLabel(quizUnlocked, qcmDone)}</div>
                        </div>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </div>

        <CertificateModal
          show={showCert}
          onHide={() => setShowCert(false)}
          userName={userName}
          courseTitle={courseTitleUI}
          timeSpentMinutes={spentMinutes}
        />
      </Container>
    </div>
  );
}
