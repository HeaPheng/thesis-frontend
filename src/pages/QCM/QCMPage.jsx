// QCMPage.jsx (FULL FIXED + MODIFIED)
// ✅ Works with lesson-based route: /course/:courseId/unit/:unitId/qcm/:lessonId
// ✅ Uses slug-based courseKey (courseId is slug)
// ✅ NO auto-enroll (matches your CourseDetail behavior)
// ✅ Marks QCM as completed in DB (2 options: /progress/qcm/complete OR /progress/unit/quiz-passed fallback)
// ✅ Updates resume pointer to "qcm" so Continue Learning can land on QCM
// ✅ Fixes guard + back nav uses the :lessonId from URL
// ✅ Keeps your UI + burger menu + footer

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./QCMPage.css";
import api from "../../lib/api";

export default function QCMPage() {
  // ✅ lesson-based route params
  const { courseId, unitId, lessonId } = useParams();
  const navigate = useNavigate();

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

  // ✅ consistent keys
  const courseKey = useMemo(() => String(courseId || ""), [courseId]); // slug
  const unitIdNum = Number(unitId);
  const lessonIdNum = Number(lessonId);

  // ======= FOOTER BURGER MENU =======
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markProgressDirty = useCallback(() => {
    try {
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));
      window.dispatchEvent(new Event("progress-dirty"));
    } catch { }
  }, [courseKey]);

  // ======= API DATA =======
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);

  // enrollment + progress from DB
  const [enrollCheckLoading, setEnrollCheckLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [progressLoading, setProgressLoading] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [unitProgressMap, setUnitProgressMap] = useState({});

  // ✅ 0) enrollment check (NO auto-enroll)
  useEffect(() => {
    try {
      localStorage.setItem(`resume_type_v1:${courseKey}`, "qcm");
      localStorage.setItem(`resume_unit_v1:${courseKey}`, String(unitIdNum));
    } catch { }
  }, [courseKey, unitIdNum]);


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

  // ======= 1) quiz by UNIT =======
  useEffect(() => {
    if (!unitIdNum) return;

    let alive = true;
    setLoadingQuiz(true);

    api
      .get(`/units/${unitIdNum}/quiz`)
      .then((res) => {
        if (!alive) return;
        setQuiz(res.data || null);
      })
      .catch((err) => {
        console.error("Failed to load quiz:", err);
        if (!alive) return;
        setQuiz(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingQuiz(false);
      });

    return () => {
      alive = false;
    };
  }, [unitIdNum]);

  // ======= 2) fetch course (for titles + next unit) =======
  useEffect(() => {
    if (!courseKey) return;

    let alive = true;
    setLoadingCourse(true);

    api
      .get(`/courses/${courseKey}`)
      .then((res) => {
        if (!alive) return;
        setCourse(res.data || null);
      })
      .catch((err) => {
        console.error("Failed to load course:", err);
        if (!alive) return;
        setCourse(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingCourse(false);
      });

    return () => {
      alive = false;
    };
  }, [courseKey]);

  const units = useMemo(() => (Array.isArray(course?.units) ? course.units : []), [course]);

  const currentUnitIndex = useMemo(
    () => units.findIndex((u) => Number(u.id) === unitIdNum),
    [units, unitIdNum]
  );
  const unit = currentUnitIndex >= 0 ? units[currentUnitIndex] : null;

  const hasCoding = useMemo(() => {
    // support both new/old shapes
    const up = unitProgressMap?.[String(unitIdNum)];
    const hasCodingFlag = !!(unit?.codingExerciseEn || unit?.coding_exercise_en || unit?.codingExercise || unit?.coding_exercise);
    const hasCodingArray = !!(unit?.coding && Array.isArray(unit.coding) && unit.coding.length > 0);
    // prefer course/unit structure; progress map only for "completed" flags
    return hasCodingFlag || hasCodingArray || !!up?.has_coding;
  }, [unit, unitIdNum, unitProgressMap]);

  // ✅ fallback lesson for "Back" if lessonId not in URL
  const lastLessonId = useMemo(() => {
    const list = unit?.lessons || [];
    return list.length ? list[list.length - 1]?.id : null;
  }, [unit]);

  const fallbackLessonId = useMemo(() => {
    return lessonIdNum || lastLessonId || unit?.lessons?.[0]?.id || null;
  }, [lessonIdNum, lastLessonId, unit]);

  // ✅ refresh progress (ONLY if enrolled)
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

  // ✅ keep resume pointer on QCM (so Continue Learning can land here)
  useEffect(() => {
    if (!courseKey || !unitIdNum) return;
    if (!isEnrolled) return;

    api
      .post(`/progress/course/${courseKey}/resume`, {
        unit_id: Number(unitIdNum),
        lesson_id: Number(fallbackLessonId || 0),
        type: "qcm", // ✅ important
      })
      .catch(() => { });
  }, [courseKey, unitIdNum, fallbackLessonId, isEnrolled]);

  // ======= QUIZ DATA (supports multiple shapes) =======
  const questions = useMemo(() => {
    const data = quiz || {};
    const qs =
      Array.isArray(data?.questions)
        ? data.questions
        : Array.isArray(data?.quiz?.questions)
          ? data.quiz.questions
          : Array.isArray(data?.data?.questions)
            ? data.data.questions
            : Array.isArray(data?.questions?.data)
              ? data.questions.data
              : [];
    return [...qs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0));
  }, [quiz]);

  const total = questions.length;

  // ======= GUARDS =======
  const isUnitCompleted = useCallback(
    (unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.completed,
    [unitProgressMap]
  );

  const isLessonCompleted = useCallback((id) => completedLessonIds.has(Number(id)), [completedLessonIds]);

  const canOpenUnit = useCallback(
    (uIndex) => {
      if (uIndex <= 0) return true;
      const prevUnit = units[uIndex - 1];
      if (!prevUnit) return false;
      return isUnitCompleted(prevUnit.id);
    },
    [units, isUnitCompleted]
  );

  const canOpenQCMDB = useCallback(() => {
    if (!isEnrolled) return false;
    if (!unit?.lessons?.length) return false;
    if (!canOpenUnit(currentUnitIndex)) return false;

    const lessonsDone = unit.lessons.every((l) => isLessonCompleted(l.id));
    if (!lessonsDone) return false;

    if (hasCoding) {
      const up = unitProgressMap?.[String(unit.id)];
      return !!up?.coding_completed;
    }
    return true;
  }, [isEnrolled, unit, canOpenUnit, currentUnitIndex, isLessonCompleted, hasCoding, unitProgressMap]);

  useEffect(() => {
    if (enrollCheckLoading) return;
    if (!isEnrolled) {
      navigate(`/courses/${courseKey}`, { replace: true });
      return;
    }

    if (!unit?.lessons?.length) return;
    if (progressLoading) return;
    if (loadingQuiz) return;
    if (!quiz) return;

    const ok = canOpenQCMDB();
    if (!ok) {
      if (fallbackLessonId) {
        navigate(`/course/${courseKey}/unit/${unitIdNum}/lesson/${Number(fallbackLessonId)}`, { replace: true });
      } else {
        navigate(`/courses/${courseKey}`, { replace: true });
      }
    }
  }, [
    enrollCheckLoading,
    isEnrolled,
    unit,
    progressLoading,
    loadingQuiz,
    quiz,
    canOpenQCMDB,
    fallbackLessonId,
    navigate,
    courseKey,
    unitIdNum,
  ]);

  // ======= QUIZ STATE =======
  const [index, setIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [showWarning, setShowWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setIndex(0);
    setAnswersMap({});
    setShowWarning(false);
    setSubmitting(false);
    setResult(null);
  }, [unitIdNum, total]);

  const current = questions[index];

  const handleBack = () => {
    if (result) {
      setResult(null);
      setShowWarning(false);
      setIndex(Math.max(0, total - 1));
      return;
    }

    if (index > 0) {
      setIndex((v) => Math.max(0, v - 1));
      setShowWarning(false);
      return;
    }

    // ✅ Back to lesson that opened the quiz (route param)
    if (fallbackLessonId) navigate(`/course/${courseKey}/unit/${unitIdNum}/lesson/${Number(fallbackLessonId)}`);
    else navigate(`/courses/${courseKey}`);
  };

  // ✅ mark QCM completed in DB
  const markQcmCompleteDB = useCallback(async () => {
    if (!isEnrolled) return;

    // Option A (recommended): dedicated endpoint
    try {
      await api.post("/progress/qcm/complete", { unit_id: Number(unitIdNum) });
      markProgressDirty();
      return true;
    } catch (e) {
      // Option B (fallback): your existing endpoint might already set qcm_completed
      try {
        await api.post("/progress/unit/quiz-passed", { unit_id: Number(unitIdNum) });
        markProgressDirty();
        return true;
      } catch (e2) {
        console.error("Failed to mark QCM complete:", e2);
        return false;
      }
    }
  }, [isEnrolled, unitIdNum, markProgressDirty]);

  const handleNext = async () => {
    if (!current) return;

    const selectedOptionId = answersMap[current.id];
    if (!selectedOptionId) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);

    if (index + 1 < total) {
      setIndex((v) => v + 1);
      return;
    }

    try {
      setSubmitting(true);

      // ✅ submit
      const payload = { unit_id: Number(unitIdNum), answers: answersMap };
      const res = await api.post(`/quiz/submit`, payload);

      setResult(res.data);

      const pct = Number(res?.data?.percent || 0);

      if (pct >= 50) {
        // ✅ mark qcm completed
        await markQcmCompleteDB();

        // ✅ set resume to next unit first lesson (optional)
        const nextUnit = units[currentUnitIndex + 1];
        const nextFirstLessonId = nextUnit?.lessons?.[0]?.id;

        if (nextUnit?.id && nextFirstLessonId) {
          api
            .post(`/progress/course/${courseKey}/resume`, {
              unit_id: Number(nextUnit.id),
              lesson_id: Number(nextFirstLessonId),
              type: "lesson",
            })
            .catch(() => { });
        }
      }

      await refreshProgress();
    } catch (e) {
      console.error(e);
      alert(pickText("Submit failed. Check API /quiz/submit.", "បញ្ជូនបរាជ័យ។ សូមពិនិត្យ API /quiz/submit."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIndex(0);
    setAnswersMap({});
    setShowWarning(false);
    setResult(null);
  };

  const correctCount = Number(result?.score || 0);
  const resultTotal = Number(result?.total || total || 0);
  const percentage = resultTotal ? ((correctCount / resultTotal) * 100).toFixed(1) : "0.0";

  const goToNextUnit = () => {
    const nextUnit = units[currentUnitIndex + 1];

    if (!nextUnit) {
      navigate(`/courses/${courseKey}`, { state: { showCertificate: true } });
      return;
    }

    const firstLessonId = nextUnit.lessons?.[0]?.id;
    if (!firstLessonId) {
      navigate(`/courses/${courseKey}`, { state: { showCertificate: true } });
      return;
    }

    navigate(`/course/${courseKey}/unit/${nextUnit.id}/lesson/${firstLessonId}`);
  };

  const progressValue = result ? 100 : total ? ((index + 1) / total) * 100 : 0;

  // ---------- EARLY RETURNS ----------
  if (enrollCheckLoading) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("Checking enrollment...", "កំពុងពិនិត្យការចុះឈ្មោះ...")}</h2>;
  }

  if (!isEnrolled) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("Not enrolled.", "មិនទាន់ចុះឈ្មោះទេ។")}</h2>;
  }

  if (loadingQuiz) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("Loading quiz...", "កំពុងផ្ទុកសំណួរ...")}</h2>;
  }

  if (!quiz) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("No QCM found for this unit", "មិនមានសំណួរសម្រាប់យូនីតនេះ")}</h2>;
  }

  if (total === 0) {
    return (
      <div style={{ padding: 40, color: "white" }}>
        <h2>{pickText("Quiz loaded, but no questions were returned.", "បានផ្ទុកសំណួរ ប៉ុន្តែមិនមានសំណួរត្រឡប់មកវិញ។")}</h2>
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          {pickText("Check DevTools → Network →", "ពិនិត្យ DevTools → Network →")}{" "}
          <code>/units/{unitIdNum}/quiz</code>
        </div>
      </div>
    );
  }

  const headerCourseTitle = pickText(course?.title || "Course", course?.title_km || "វគ្គសិក្សា");
  const headerUnitTitle = pickText(unit?.title || `Unit ${unitId}`, unit?.title_km || `ជំពូក ${unitId}`);

  const questionText = pickText(current?.question, current?.question_km);
  const explanationText = pickText(current?.explanation, current?.explanation_km);

  return (
    <div className="lesson-page qcm-page">
      <div className="lesson-header">
        <code>{`import Quiz from '${headerCourseTitle} - ${headerUnitTitle}'`}</code>
      </div>

      {(loadingCourse || progressLoading) && (
        <div style={{ padding: "8px 18px", color: "#bbb" }}>
          {loadingCourse
            ? pickText("Loading course...", "កំពុងផ្ទុកវគ្គសិក្សា...")
            : pickText("Syncing progress...", "កំពុងសមកាលកម្ម...")}
        </div>
      )}

      <div className="lesson-content-wrapper">
        <div className="lesson-content qcm-content">
          {!result ? (
            <>
              <h2 className="qcm-title">{pickText("Quiz", "សំណួរ")}</h2>

              <div className="qcm-question-block">
                <div className="qcm-question-text">
                  {index + 1}. {questionText}
                </div>

                <div className="qcm-options">
                  {(current?.options || [])
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0))
                    .map((op) => {
                      const selected = Number(answersMap[current.id]) === Number(op.id);
                      const optionText = pickText(op?.text, op?.text_km);

                      return (
                        <label key={op.id} className={`qcm-option ${selected ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name={`qcm-${current.id}`}
                            value={op.id}
                            checked={selected}
                            onChange={() => {
                              setAnswersMap((prev) => ({ ...prev, [current.id]: op.id }));
                              setShowWarning(false);
                            }}
                          />
                          <span>{optionText}</span>
                        </label>
                      );
                    })}
                </div>

                {!!explanationText && (
                  <div style={{ marginTop: 10, opacity: 0.75, fontSize: 14 }}>
                    {pickText("Note:", "ចំណាំ:")} {explanationText}
                  </div>
                )}
              </div>

              {showWarning && (
                <div className="qcm-warning">
                  ⚠️ {pickText("Please select an answer before continuing.", "សូមជ្រើសរើសចម្លើយមុនបន្ត។")}
                </div>
              )}
            </>
          ) : (
            <div className="qcm-result-wrapper">
              <div className="qcm-result-summary">
                <h2>{pickText("Quiz Results", "លទ្ធផលសំណួរ")}</h2>

                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  {pickText("Score:", "ពិន្ទុ:")} {correctCount} / {resultTotal} ({percentage}%)
                </div>

                <div className="qcm-result-buttons" style={{ marginTop: 14 }}>
                  <button className="qcm-btn-secondary" onClick={handleRetry} type="button">
                    🔁 {pickText("Retry Quiz", "សាកល្បងម្តងទៀត")}
                  </button>

                  {Number(percentage) >= 50 ? (
                    <button className="qcm-btn-primary" onClick={goToNextUnit} type="button">
                      ➜ {pickText("Continue", "បន្ត")}
                    </button>
                  ) : (
                    <div className="qcm-locked-msg">
                      ❗{" "}
                      {pickText(
                        "You need at least 50% to unlock the next unit.",
                        "អ្នកត្រូវការយ៉ាងហោចណាស់ 50% ដើម្បីដោះសោរយូនីតបន្ទាប់។"
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button className="lf-btn" onClick={() => navigate(`/courses/${courseKey}`)} type="button">
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu(!openMenu)} type="button">
              <i className="bi bi-list"></i>
            </button>

            {openMenu && !result && (
              <div className="lesson-dropdown">
                <h4>
                  {headerUnitTitle} • {pickText("Quiz", "សំណួរ")}
                </h4>
                <ul>
                  {questions.map((q, i) => (
                    <li key={q.id}>
                      <button
                        className="qcm-jump-btn"
                        onClick={() => {
                          setIndex(i);
                          setOpenMenu(false);
                        }}
                        type="button"
                      >
                        {pickText("Question", "សំណួរ")} {i + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title" type="button">
            {headerUnitTitle} • {pickText("Quiz", "សំណួរ")}
          </button>
        </div>

        <div className="lf-right">
          {!result ? (
            <>
              <button className="lf-nav" onClick={handleBack} type="button">
                ← {pickText("Back", "ថយក្រោយ")}
              </button>

              <span className="lf-count">
                {index + 1} / {total}
              </span>

              <button className="lf-nav" onClick={handleNext} disabled={submitting} type="button">
                {index + 1 === total
                  ? submitting
                    ? pickText("Submitting...", "កំពុងបញ្ជូន...")
                    : pickText("Finish →", "បញ្ចប់ →")
                  : pickText("Next →", "បន្ទាប់ →")}
              </button>
            </>
          ) : (
            <>
              <button className="lf-nav" onClick={handleRetry} type="button">
                {pickText("Retry", "សាកល្បងម្តងទៀត")}
              </button>
              {Number(percentage) >= 50 ? (
                <button className="lf-nav" onClick={goToNextUnit} type="button">
                  {pickText("Continue →", "បន្ត →")}
                </button>
              ) : (
                <span className="lf-nav-disabled">{pickText("Continue (Locked)", "បន្ត (បានចាក់សោរ)")}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="lesson-progress-bar">
        <div className="lesson-progress-fill" style={{ width: `${progressValue}%` }} />
      </div>
    </div>
  );
}
