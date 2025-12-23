import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Container, Accordion, ProgressBar, Button, Alert } from "react-bootstrap";
import CertificateModal from "../../components/CertificateModal";
import "./CourseDetail.css";
import api from "../../lib/api";

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

export default function CourseDetail() {
  const { id } = useParams(); // slug
  const navigate = useNavigate();
  const location = useLocation();
  const aliveRef = useRef(true);

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

  const pickText = useCallback(
    (en, km) => (lang === "km" ? km || en || "" : en || km || ""),
    [lang]
  );

  // certificate popup state
  const [showCert, setShowCert] = useState(false);
  const [spentMinutes, setSpentMinutes] = useState(0);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Enrollment state (NO auto-enroll)
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollCheckLoading, setEnrollCheckLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollErr, setEnrollErr] = useState(null);

  // user profile (DB)
  const [userName, setUserName] = useState("Student");

  // certificate (DB)
  const [certLoading, setCertLoading] = useState(false);
  const [certCompleted, setCertCompleted] = useState(false);

  // DB progress
  const [progressLoading, setProgressLoading] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [unitProgressMap, setUnitProgressMap] = useState({});

  /* ----------------------------
     Derived
  ---------------------------- */
  const units = useMemo(() => (Array.isArray(course?.units) ? course.units : []), [course]);

  const courseSlug = course?.slug || id;
  const courseKey = String(courseSlug);

  const courseTitleUI = useMemo(
    () => pickText(course?.title, course?.title_km),
    [course, pickText]
  );

  /* ----------------------------
     Load course detail
  ---------------------------- */
  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    setEnrollErr(null);

    api
      .get(`/courses/${id}`)
      .then((res) => {
        if (!aliveRef.current) return;
        setCourse(res.data);
      })
      .catch((err) => {
        console.error("Failed to load course detail:", err);
        if (!aliveRef.current) return;
        setCourse(null);
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
     Load user profile name
  ---------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/profile");
        if (!alive) return;
        setUserName(data?.name || "Student");
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * ✅ Enrollment check
   */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseKey) return;

      setEnrollCheckLoading(true);
      try {
        await api.get(`/progress/course/${courseKey}`);
        if (!alive) return;
        setIsEnrolled(true);
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
  }, [courseKey]);

  /* ----------------------------
     Refresh progress (ONLY if enrolled)
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
      console.error("Failed to load progress:", e);
    } finally {
      setProgressLoading(false);
    }
  }, [courseKey, isEnrolled]);

  /* ----------------------------
     ✅ Certificate
  ---------------------------- */
  const certShownKey = useMemo(() => `certificate_shown_v1:${courseKey}`, [courseKey]);

  const refreshCertificate = useCallback(async () => {
    if (!courseKey || !isEnrolled) return;

    setCertLoading(true);
    try {
      const { data } = await api.get(`/certificates/course/${courseKey}`);
      const done = !!data?.completed;
      setCertCompleted(done);

      if (done && data?.time_spent_minutes != null) {
        setSpentMinutes(Number(data.time_spent_minutes || 0));
      }

      const shouldTryPopup = !!location.state?.showCertificate;
      const alreadyShown = localStorage.getItem(certShownKey) === "1";

      if (done && shouldTryPopup && !alreadyShown) {
        setShowCert(true);
        localStorage.setItem(certShownKey, "1");
      }
    } catch {
      setCertCompleted(false);
    } finally {
      setCertLoading(false);

      if (location.state?.showCertificate) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [courseKey, isEnrolled, location.state, location.pathname, navigate, certShownKey]);

  useEffect(() => {
    if (!isEnrolled) return;
    refreshProgress();
    refreshCertificate();
  }, [isEnrolled, refreshProgress, refreshCertificate]);

  // ✅ enroll only when user clicks Start Learning
  const enrollAndStart = useCallback(async () => {
    if (!course?.id) return;

    setEnrollLoading(true);
    setEnrollErr(null);

    try {
      await api.post("/enroll", { course_id: course.id });
      setIsEnrolled(true);

      // mark dirty
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));

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
          pickText(
            "Failed to enroll. Please try again.",
            "បរាជ័យក្នុងការចុះឈ្មោះ។ សូមសាកល្បងម្ដងទៀត។"
          )
      );
    } finally {
      setEnrollLoading(false);
    }
  }, [course?.id, units, navigate, courseSlug, courseKey, pickText]);

  /* ----------------------------
     Progress helpers
  ---------------------------- */
  const isLessonCompleted = useCallback(
    (lessonIdNum) => completedLessonIds.has(Number(lessonIdNum)),
    [completedLessonIds]
  );

  const isUnitCompleted = useCallback(
    (unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.completed,
    [unitProgressMap]
  );

  const isCodingCompleted = useCallback(
    (unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.coding_completed,
    [unitProgressMap]
  );

  const isQcmCompleted = useCallback(
    (unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.quiz_passed,
    [unitProgressMap]
  );

  /* ----------------------------
     ✅ REAL Continue Learning
  ---------------------------- */
  const continueLearning = useCallback(async () => {
    if (!isEnrolled) return;

    await refreshProgress();

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
          if (prevLessons[0]?.id)
            return navigate(`/course/${courseSlug}/unit/${prev.id}/lesson/${prevLessons[0].id}`);
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

    navigate(`/courses/${courseSlug}`, { state: { showCertificate: true } });
  }, [
    isEnrolled,
    refreshProgress,
    units,
    isUnitCompleted,
    isLessonCompleted,
    isCodingCompleted,
    isQcmCompleted,
    navigate,
    courseSlug,
  ]);

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
  if (loading) return <h2 className="text-center mt-5">{pickText("Loading...", "កំពុងផ្ទុក...")}</h2>;
  if (!course) return <h2 className="text-center mt-5">{pickText("Course not found", "រកមិនឃើញវគ្គសិក្សា")}</h2>;

  /* ----------------------------
     Numbers
  ---------------------------- */
  const totalUnits = units.length;
  const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
  const totalQcmQuestions = units.reduce((acc, u) => acc + (Number(u.qcm_count) || 0), 0);
  const totalCoding = units.reduce((acc, u) => acc + unitCodingCount(u), 0);

  // ✅ Dashboard-style totals (QUIZ is counted per-unit, NOT per-question)
  const totalQuizSteps = units.reduce((acc, u) => acc + ((Number(u.qcm_count) || 0) > 0 ? 1 : 0), 0);
  const totalCodingSteps = units.reduce((acc, u) => acc + (hasUnitCoding(u) ? 1 : 0), 0);

  const completedLessonsCount = completedLessonIds.size;

  const completedQuizSteps = units.reduce(
    (acc, u) => acc + (((Number(u.qcm_count) || 0) > 0 && isQcmCompleted(u.id)) ? 1 : 0),
    0
  );

  const completedCodingSteps = units.reduce(
    (acc, u) => acc + ((hasUnitCoding(u) && isCodingCompleted(u.id)) ? 1 : 0),
    0
  );

  const totalSteps = totalLessons + totalQuizSteps + totalCodingSteps;
  const completedSteps = completedLessonsCount + completedQuizSteps + completedCodingSteps;

  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const showProgress = !enrollCheckLoading && isEnrolled;

  const rightText = progressLoading ? pickText("Loading...", "កំពុងផ្ទុក...") : showProgress ? `${progressPercent}%` : "";
  const barNow = progressLoading ? 0 : showProgress ? progressPercent : 0;

  const subText = progressLoading
    ? ""
    : showProgress
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

  // Simple unlock logic for UI
  const canOpenUnitUI = (idx) => {
    if (!isEnrolled) return false;
    if (idx <= 0) return true;
    const prev = units[idx - 1];
    return prev ? isUnitCompleted(prev.id) : false;
  };

  return (
    <div className="course-detail-page">
      <Container className="cd-container">
        <h1 className="course-premium-title">{courseTitleUI}</h1>

        <div className="cd-desc-box">
          <p>{pickText(course?.description, course?.description_km)}</p>
        </div>

        {/* Start Learning */}
        {!enrollCheckLoading && !isEnrolled && (
          <div
            className="mt-3 p-4 rounded"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(124,58,237,0.22))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
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
                {enrollLoading ? pickText("Starting…", "កំពុងចាប់ផ្តើម…") : `▶ ${pickText("Start Learning", "ចាប់ផ្តើមរៀន")}`}
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
            <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{pickText("Your Progress", "វឌ្ឍនភាពការរៀន")}</div>
            <div style={{ color: "rgba(255,255,255,0.75)" }}>{rightText}</div>
          </div>

          <ProgressBar now={barNow} />
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{subText}</div>

          {!certLoading && showProgress && (
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              {certCompleted ? pickText("🎉 Certificate available!", "🎉 មានវិញ្ញាបនបត្រ!") : ""}
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

        {/* ✅ Continue Learning button */}
        {!enrollCheckLoading && isEnrolled && (
          <div style={{ marginTop: 10, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="success"
              onClick={continueLearning}
              disabled={progressLoading}
              style={{ borderRadius: 999, fontWeight: 800, padding: "10px 18px" }}
            >
              {progressLoading ? pickText("Loading…", "កំពុងផ្ទុក…") : `▶ ${pickText("Continue Learning", "បន្តរៀន")}`}
            </Button>

            <Button
              variant="outline-light"
              onClick={() => refreshProgress()}
              disabled={progressLoading}
              style={{ borderRadius: 999, fontWeight: 800, padding: "10px 18px" }}
            >
              {pickText("Refresh", "ធ្វើបច្ចុប្បន្នភាព")}
            </Button>
          </div>
        )}

        <div className="cd-syllabus-box">
          <Accordion alwaysOpen>
            {units.map((unitObj, unitIndex) => {
              const hasCodingFlag = hasUnitCoding(unitObj);
              const unitUnlocked = canOpenUnitUI(unitIndex);

              const allLessonsDone = (unitObj.lessons || []).every((l) => isLessonCompleted(l.id));
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
                      const unlocked = unitUnlocked && (lessonIndex === 0 || isLessonCompleted(unitObj.lessons[lessonIndex - 1]?.id));
                      const completed = isLessonCompleted(lessonObj.id);
                      const lessonTitleUI = pickText(lessonObj?.title, lessonObj?.title_km);

                      return (
                        <div className="cd-lesson-row" key={lessonObj.id}>
                          <div className="cd-lesson-info">
                            <button
                              type="button"
                              className={`cd-lesson-title-btn ${!unlocked ? "is-locked" : ""}`}
                              onClick={() => unlocked && navigate(`/course/${courseSlug}/unit/${unitObj.id}/lesson/${lessonObj.id}`)}
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

                          <div className={`cd-lesson-meta ${quizUnlocked ? "" : "locked"}`}>
                            {qcmMetaLabel(quizUnlocked, qcmDone)}
                          </div>
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
