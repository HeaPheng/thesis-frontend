import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonContent from "./LessonContent";
import "./LessonPage.css";
import api from "../../lib/api";

/* ---------------------------------
   Helpers (Coding hasOne, backward compatible)
---------------------------------- */
const getUnitCodingEn = (unitObj) =>
  unitObj?.codingExerciseEn ??
  unitObj?.coding_exercise_en ??
  unitObj?.codingExercise ??
  unitObj?.coding_exercise ??
  null;

const getUnitCodingKm = (unitObj) =>
  unitObj?.codingExerciseKm ??
  unitObj?.coding_exercise_km ??
  null;

const hasUnitCoding = (unitObj) => !!getUnitCodingEn(unitObj);

export default function LessonPage() {
  const { courseId, unitId, lessonId } = useParams(); // courseId is SLUG
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const menuRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // enrollment guard (NO auto-enroll)
  const [enrollCheckLoading, setEnrollCheckLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // progress from DB
  const [progressLoading, setProgressLoading] = useState(true);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [unitProgressMap, setUnitProgressMap] = useState({});

  // saving flags
  const [savingLesson, setSavingLesson] = useState(false);

  const toastLock = useCallback(
    (msg) => {
      setLockMsg(msg);
      window.clearTimeout(window.__lock_toast);
      window.__lock_toast = window.setTimeout(() => setLockMsg(""), 1800);
    },
    []
  );

  /* ----------------------------
     Load course detail (by slug)
  ---------------------------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/courses/${courseId}`)
      .then((res) => {
        if (!alive) return;
        setCourse(res.data);
      })
      .catch((err) => {
        console.error("Failed to load course:", err);
        if (!alive) return;
        setCourse(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [courseId]);

  // ✅ slug everywhere
  const courseKey = useMemo(() => String(course?.slug || courseId), [course?.slug, courseId]);

  const units = useMemo(() => (Array.isArray(course?.units) ? course.units : []), [course]);

  const unitIdNum = Number(unitId);
  const lessonIdNum = Number(lessonId);

  const currentUnitIndex = units.findIndex((u) => Number(u.id) === unitIdNum);
  const unit = currentUnitIndex >= 0 ? units[currentUnitIndex] : null;

  const lessonIndex = unit?.lessons ? unit.lessons.findIndex((l) => Number(l.id) === lessonIdNum) : -1;
  const lesson = unit && lessonIndex >= 0 ? unit.lessons[lessonIndex] : null;

  const lastLessonIndex = (unit?.lessons?.length || 1) - 1;
  const isLastLesson = lessonIndex === lastLessonIndex;

  const hasCoding = useMemo(() => hasUnitCoding(unit), [unit]);

  // ✅ quiz presence: unit-based now
  const quizCountForUI = Number(unit?.qcm_count || 0);
  const hasQcm = quizCountForUI > 0;

  /* ----------------------------
     ✅ Local resume keys (FRONTEND)
     courseKey is slug, so it matches CourseDetail continueLearning()
  ---------------------------- */
  const setLocalResume = useCallback(
    (type, uId, lId) => {
      try {
        localStorage.setItem(`resume_type_v1:${courseKey}`, String(type || ""));
        localStorage.setItem(`resume_unit_v1:${courseKey}`, String(uId || ""));
        if (lId != null) localStorage.setItem(`resume_lesson_v1:${courseKey}`, String(lId));
      } catch {}
    },
    [courseKey]
  );

  // ✅ When lesson page opens, mark resume as "lesson"
  useEffect(() => {
    if (!courseKey) return;
    if (!unitIdNum || !lessonIdNum) return;
    setLocalResume("lesson", unitIdNum, lessonIdNum);
  }, [courseKey, unitIdNum, lessonIdNum, setLocalResume]);

  // helper to tell Dashboard/CourseDetail to refresh later (✅ set BOTH keys)
  const markProgressDirty = useCallback(() => {
    try {
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));
    } catch {}
  }, [courseKey]);

  /* ----------------------------
     Enrollment check (NO auto-enroll)
     - if progress succeeds => enrolled
     - if 403 => not enrolled (redirect to CourseDetail)
  ---------------------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseKey) return;

      setEnrollCheckLoading(true);
      try {
        await api.get(`/progress/course/${courseKey}`);
        if (!alive) return;
        setIsEnrolled(true);
      } catch (e) {
        if (!alive) return;
        setIsEnrolled(false);
      } finally {
        if (alive) setEnrollCheckLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseKey]);

  /* ----------------------------
     Refresh DB progress (ONLY if enrolled)
  ---------------------------- */
  const refreshProgress = useCallback(async () => {
    if (!courseKey || !isEnrolled) return;
    setProgressLoading(true);
    try {
      const { data } = await api.get(`/progress/course/${courseKey}`);
      const ids = Array.isArray(data?.completed_lesson_ids) ? data.completed_lesson_ids : [];
      setCompletedLessonIds(new Set(ids.map((x) => Number(x))));
      setUnitProgressMap(data?.unit_progress || {});
    } catch (e) {
      console.error("Failed to load course progress:", e);
    } finally {
      setProgressLoading(false);
    }
  }, [courseKey, isEnrolled]);

  useEffect(() => {
    if (!isEnrolled) return;
    refreshProgress();
  }, [isEnrolled, refreshProgress]);

  /* ----------------------------
     Resume ping (backend)
     NOTE: backend only stores unit_id + lesson_id (no type)
  ---------------------------- */
  const pingResume = useCallback(async () => {
    try {
      await api.post(`/progress/course/${courseKey}/resume`, {
        unit_id: Number(unitIdNum),
        lesson_id: Number(lessonIdNum),
      });
    } catch {}
  }, [courseKey, unitIdNum, lessonIdNum]);

  useEffect(() => {
    if (!isEnrolled) return;
    if (!courseKey || !unitIdNum || !lessonIdNum) return;
    pingResume();
  }, [isEnrolled, courseKey, unitIdNum, lessonIdNum, pingResume]);

  /* ----------------------------
     Guards (DB)
  ---------------------------- */
  const isUnitCompleted = useCallback(
    (unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.completed,
    [unitProgressMap]
  );

  const isLessonCompleted = useCallback(
    (lessonIdNumArg) => completedLessonIds.has(Number(lessonIdNumArg)),
    [completedLessonIds]
  );

  const canOpenUnit = useCallback(
    (uIndex) => {
      if (!isEnrolled) return false;
      if (uIndex <= 0) return true;
      const prevUnit = units[uIndex - 1];
      if (!prevUnit) return false;
      return isUnitCompleted(prevUnit.id);
    },
    [isEnrolled, units, isUnitCompleted]
  );

  const canOpenLessonDB = useCallback(
    (uIndex, unitObj, lIndex, completedSetOverride) => {
      if (!isEnrolled) return false;
      if (!unitObj?.lessons?.length) return false;
      if (!canOpenUnit(uIndex)) return false;
      if (lIndex <= 0) return true;

      const setToUse = completedSetOverride || completedLessonIds;
      const prevLesson = unitObj.lessons[lIndex - 1];
      if (!prevLesson) return false;

      return setToUse.has(Number(prevLesson.id));
    },
    [isEnrolled, canOpenUnit, completedLessonIds]
  );

  const canOpenCodingDB = useCallback(
    (uIndex, unitObj, completedSetOverride) => {
      if (!isEnrolled) return false;
      if (!unitObj?.lessons?.length) return false;
      if (!canOpenUnit(uIndex)) return false;

      const setToUse = completedSetOverride || completedLessonIds;
      return unitObj.lessons.every((l) => setToUse.has(Number(l.id)));
    },
    [isEnrolled, canOpenUnit, completedLessonIds]
  );

  const canOpenQCMDB = useCallback(
    (uIndex, unitObj, hasCodingArg, completedSetOverride) => {
      if (!isEnrolled) return false;
      if (!unitObj?.lessons?.length) return false;
      if (!canOpenUnit(uIndex)) return false;

      const setToUse = completedSetOverride || completedLessonIds;
      const lessonsDone = unitObj.lessons.every((l) => setToUse.has(Number(l.id)));
      if (!lessonsDone) return false;

      if (hasCodingArg) {
        const up = unitProgressMap?.[String(unitObj.id)];
        return !!up?.coding_completed;
      }

      return true;
    },
    [isEnrolled, canOpenUnit, completedLessonIds, unitProgressMap]
  );

  /* ----------------------------
     URL typing guard: if lesson locked, redirect to last unlocked
  ---------------------------- */
  useEffect(() => {
    if (!unit || lessonIndex < 0) return;
    if (enrollCheckLoading || progressLoading) return;
    if (!isEnrolled) return;

    const allowed = canOpenLessonDB(currentUnitIndex, unit, lessonIndex);
    if (allowed) return;

    let fallbackIdx = 0;
    for (let i = 0; i < unit.lessons.length; i++) {
      if (canOpenLessonDB(currentUnitIndex, unit, i)) fallbackIdx = i;
    }

    const fallbackLessonId = unit.lessons[fallbackIdx]?.id;
    if (fallbackLessonId) {
      navigate(`/course/${courseKey}/unit/${unit.id}/lesson/${fallbackLessonId}`, { replace: true });
    }
  }, [
    unit,
    lessonIndex,
    enrollCheckLoading,
    progressLoading,
    isEnrolled,
    currentUnitIndex,
    canOpenLessonDB,
    navigate,
    courseKey,
  ]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ----------------------------
     ✅ Completion helper (supports background save)
  ---------------------------- */
  const completeCurrentLesson = useCallback(
    async ({ refresh = true } = {}) => {
      if (!lesson?.id) return;
      const idNum = Number(lesson.id);
      if (!idNum) return;
      if (!isEnrolled) return;

      // optimistic update
      if (!isLessonCompleted(idNum)) {
        setCompletedLessonIds((prev) => {
          const next = new Set(prev);
          next.add(idNum);
          return next;
        });
      } else {
        return;
      }

      if (savingLesson) return;

      setSavingLesson(true);
      try {
        await api.post("/progress/lesson/complete", { unit_lesson_id: idNum });
        markProgressDirty();

        // ✅ only refresh when needed (next/prev gating)
        if (refresh) await refreshProgress();
      } catch (e) {
        console.error("Failed to complete lesson:", e);
        toastLock(pickText("❌ Failed to save progress.", "❌ រក្សាទុកវឌ្ឍនភាពបរាជ័យ។"));
      } finally {
        setSavingLesson(false);
      }
    },
    [
      lesson?.id,
      isEnrolled,
      isLessonCompleted,
      savingLesson,
      markProgressDirty,
      refreshProgress,
      toastLock,
      pickText,
    ]
  );

  /* ----------------------------
     Helper: temp completed set (fix double-click)
  ---------------------------- */
  const makeTempCompletedSet = useCallback(() => {
    const temp = new Set(completedLessonIds);
    if (lesson?.id) temp.add(Number(lesson.id)); // treat current as completed immediately
    return temp;
  }, [completedLessonIds, lesson?.id]);

  /* ----------------------------
     Navigation actions
     NOTE: For in-course navigation we still await save/refresh (to keep guards correct)
  ---------------------------- */
  const goLesson = useCallback(
    async (toLessonId) => {
      if (!unit?.lessons?.length) return;

      const toIndex = unit.lessons.findIndex((l) => Number(l.id) === Number(toLessonId));
      const ok = canOpenLessonDB(currentUnitIndex, unit, toIndex);
      if (!ok) return toastLock(pickText("🔒 Complete the previous lesson first.", "🔒 សូមបញ្ចប់មេរៀនមុនសិន។"));

      await completeCurrentLesson({ refresh: true });
      setLocalResume("lesson", unitIdNum, Number(toLessonId));
      navigate(`/course/${courseKey}/unit/${unit.id}/lesson/${toLessonId}`);
    },
    [
      unit,
      currentUnitIndex,
      canOpenLessonDB,
      completeCurrentLesson,
      navigate,
      courseKey,
      toastLock,
      pickText,
      setLocalResume,
      unitIdNum,
    ]
  );

  const goPrev = useCallback(async () => {
    if (!unit?.lessons?.length) return;
    if (lessonIndex <= 0) return toastLock(pickText("You're on the first lesson.", "អ្នកនៅមេរៀនដំបូង។"));

    const prev = unit.lessons[lessonIndex - 1];
    if (!prev?.id) return;

    await completeCurrentLesson({ refresh: true });
    setLocalResume("lesson", unitIdNum, Number(prev.id));
    navigate(`/course/${courseKey}/unit/${unit.id}/lesson/${prev.id}`);
  }, [
    unit,
    lessonIndex,
    completeCurrentLesson,
    navigate,
    courseKey,
    toastLock,
    pickText,
    setLocalResume,
    unitIdNum,
  ]);

  const goCoding = useCallback(async () => {
    if (!unit) return;

    const tempCompleted = makeTempCompletedSet();
    const ok = canOpenCodingDB(currentUnitIndex, unit, tempCompleted);

    if (!ok) {
      return toastLock(
        pickText("🔒 Finish all lessons to unlock Coding.", "🔒 សូមបញ្ចប់មេរៀនទាំងអស់សិន ដើម្បីដោះសោ Coding។")
      );
    }

    await completeCurrentLesson({ refresh: true });
    setLocalResume("coding", unitIdNum, lessonIdNum);
    navigate(`/course/${courseKey}/unit/${unit.id}/coding`);
  }, [
    unit,
    makeTempCompletedSet,
    canOpenCodingDB,
    currentUnitIndex,
    completeCurrentLesson,
    navigate,
    courseKey,
    toastLock,
    pickText,
    setLocalResume,
    unitIdNum,
    lessonIdNum,
  ]);

  const goQCM = useCallback(async () => {
    if (!unit) return;
    if (!hasQcm) return toastLock(pickText("❗ No quiz found for this unit.", "❗ មិនមានសំណួរសម្រាប់ជំពូកនេះទេ។"));

    const tempCompleted = makeTempCompletedSet();
    const ok = canOpenQCMDB(currentUnitIndex, unit, hasCoding, tempCompleted);

    if (!ok) {
      return toastLock(
        hasCoding
          ? pickText("🔒 Finish Coding to unlock Quiz.", "🔒 សូមបញ្ចប់ Coding សិន ដើម្បីដោះសោសំណួរ។")
          : pickText("🔒 Complete all lessons to unlock Quiz.", "🔒 សូមបញ្ចប់មេរៀនទាំងអស់សិន ដើម្បីដោះសោសំណួរ។")
      );
    }

    await completeCurrentLesson({ refresh: true });
    setLocalResume("qcm", unitIdNum, lessonIdNum);
    navigate(`/course/${courseKey}/unit/${unit.id}/qcm`);
  }, [
    unit,
    hasQcm,
    makeTempCompletedSet,
    canOpenQCMDB,
    currentUnitIndex,
    hasCoding,
    completeCurrentLesson,
    navigate,
    courseKey,
    toastLock,
    pickText,
    setLocalResume,
    unitIdNum,
    lessonIdNum,
  ]);

  const goNext = useCallback(async () => {
    if (!unit?.lessons?.length) return;

    await completeCurrentLesson({ refresh: true });

    // next lesson
    if (lessonIndex < lastLessonIndex) {
      const next = unit.lessons[lessonIndex + 1];
      setLocalResume("lesson", unitIdNum, Number(next.id));
      navigate(`/course/${courseKey}/unit/${unit.id}/lesson/${next.id}`);
      return;
    }

    // last lesson → coding if exists
    if (hasCoding) {
      await goCoding();
      return;
    }

    // last lesson → quiz if exists
    if (hasQcm) {
      await goQCM();
      return;
    }

    toastLock(pickText("✅ Unit completed.", "✅ បានបញ្ចប់ជំពូក។"));
  }, [
    unit,
    completeCurrentLesson,
    lessonIndex,
    lastLessonIndex,
    navigate,
    courseKey,
    hasCoding,
    hasQcm,
    goCoding,
    goQCM,
    toastLock,
    pickText,
    setLocalResume,
    unitIdNum,
  ]);

  /* ----------------------------
     Enrollment redirect
  ---------------------------- */
  useEffect(() => {
    if (enrollCheckLoading) return;
    if (loading) return;
    if (!course) return;
    if (isEnrolled) return;

    navigate(`/courses/${courseKey}`, { replace: true });
  }, [enrollCheckLoading, loading, course, isEnrolled, navigate, courseKey]);

  /* ----------------------------
     Render guards
  ---------------------------- */
  if (loading) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Loading...", "កំពុងផ្ទុក...")}</h2>;
  if (!course) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Course not found", "រកមិនឃើញវគ្គសិក្សា")}</h2>;
  if (!unit) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Unit not found", "រកមិនឃើញជំពូក")}</h2>;
  if (!lesson) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Lesson not found", "រកមិនឃើញមេរៀន")}</h2>;

  // ✅ bilingual display values
  const courseTitleUI = pickText(course?.title, course?.title_km);
  const unitTitleUI = pickText(unit?.title, unit?.title_km);
  const lessonTitleUI = pickText(lesson?.title, lesson?.title_km);
  const lessonContentUI = pickText(lesson?.content, lesson?.content_km);

  const codingEn = getUnitCodingEn(unit);
  const codingKm = getUnitCodingKm(unit);
  const codingTitleUI = pickText(codingEn?.title, codingKm?.title_km || codingKm?.title);

  return (
    <div className="lesson-page">
      <div className="lesson-header">
        <code>{`import Lesson from '${courseTitleUI}'`}</code>
      </div>

      <div className="lesson-content-wrapper">
        <h1 className="lesson-title">{lessonTitleUI}</h1>

        <div className="lesson-breadcrumb">
          <span className="crumb-course">{courseTitleUI}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-unit">{unitTitleUI}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-lesson">{pickText(`Lesson ${lessonIndex + 1}`, `មេរៀន ${lessonIndex + 1}`)}</span>
        </div>

        <div className="lesson-content">
          <LessonContent content={lessonContentUI} />
        </div>
      </div>

      {lockMsg && <div className="lock-toast">{lockMsg}</div>}

      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button
            className="lf-btn"
            onClick={() => {
              // ✅ save resume now
              setLocalResume("lesson", unitIdNum, lessonIdNum);

              // ✅ navigate immediately (no lag)
              navigate(`/courses/${courseKey}`);

              // ✅ save progress in background (don’t await)
              completeCurrentLesson({ refresh: false });
            }}
            type="button"
            disabled={savingLesson}
            title={pickText("Back to course", "ត្រឡប់ទៅវគ្គសិក្សា")}
          >
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu((v) => !v)} type="button">
              <i className="bi bi-list"></i>
            </button>

            {openMenu && (
              <div className="lesson-dropdown">
                <h4>{unitTitleUI}</h4>
                <ul>
                  {unit.lessons.map((l, idx) => {
                    const locked = enrollCheckLoading || progressLoading ? true : !canOpenLessonDB(currentUnitIndex, unit, idx);
                    const completed = isLessonCompleted(l.id);
                    const titleUI = pickText(l?.title, l?.title_km);

                    return (
                      <li key={l.id}>
                        <button
                          className={`lesson-dd-btn ${locked ? "locked" : ""}`}
                          onClick={async () => {
                            setOpenMenu(false);
                            await goLesson(l.id);
                          }}
                          type="button"
                        >
                          {locked ? "🔒 " : completed ? "✅ " : ""}
                          {titleUI}
                        </button>
                      </li>
                    );
                  })}

                  {hasCoding && (
                    <li style={{ marginTop: 10 }}>
                      <button
                        className={`lesson-dd-btn ${!canOpenCodingDB(currentUnitIndex, unit) ? "locked" : ""}`}
                        onClick={async () => {
                          setOpenMenu(false);
                          await goCoding();
                        }}
                        type="button"
                      >
                        💻 {pickText("Coding Exercise", "លំហាត់ Coding")}
                        {codingTitleUI ? ` — ${codingTitleUI}` : ""}
                      </button>
                    </li>
                  )}

                  {hasQcm && (
                    <li>
                      <button
                        className={`lesson-dd-btn ${!canOpenQCMDB(currentUnitIndex, unit, hasCoding) ? "locked" : ""}`}
                        onClick={async () => {
                          setOpenMenu(false);
                          await goQCM();
                        }}
                        type="button"
                      >
                        ✅ {pickText("Quiz (QCM)", "សំណួរ (QCM)")} ({quizCountForUI})
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title" type="button" onClick={() => setOpenMenu((v) => !v)}>
            {unitTitleUI}
          </button>
        </div>

        <div className="lf-right">
          <button className="lf-nav" onClick={goPrev} type="button" disabled={lessonIndex <= 0 || savingLesson}>
            ← {pickText("Prev", "ថយក្រោយ")}
          </button>

          <span className="lf-count">
            {lessonIndex + 1} / {unit.lessons.length}
          </span>

          <button className="lf-nav" onClick={goNext} type="button" disabled={savingLesson}>
            {!isLastLesson
              ? savingLesson
                ? pickText("Saving…", "កំពុងរក្សាទុក…")
                : pickText("Next →", "បន្ទាប់ →")
              : hasCoding
              ? pickText("Start Coding →", "ចាប់ផ្តើម Coding →")
              : hasQcm
              ? savingLesson
                ? pickText("Saving…", "កំពុងរក្សាទុក…")
                : pickText("Start Quiz →", "ចាប់ផ្តើមសំណួរ →")
              : pickText("Finish →", "បញ្ចប់ →")}
          </button>
        </div>
      </div>
    </div>
  );
}
