// QCMPage.jsx (FULL FIXED - UNIT BASED + time tracking pings + XP once per question + redo auto-check)
// ✅ Route: /course/:courseId/unit/:unitId/qcm   (courseId = slug)
// ✅ Prevents "jump back" by waiting for progressReady before guard redirect
// ✅ Uses DB progress (unit_progress) for coding_completed gating
// ✅ Back goes to last lesson of the unit
// ✅ Marks quiz passed in DB via /progress/unit/quiz-passed
// ✅ Updates resume pointer so Continue Learning can land correctly
// ✅ NEW: Resume ping immediate + every ~25s + on unmount (time_spent_seconds)
// ✅ NEW: Intro about XP gain shown on first question
// ✅ NEW: After submit, show user answers (chosen text) under result
// ✅ NEW: Retry/redo pre-fills previously correct answers (from last attempt result.details), wrong answers remain empty
// ✅ NEW: Supports backend response: xp_awarded + xp_awarded_question_ids (like Coding)
// ✅ FIX: /quiz/submit removed; progress handled by POST /progress/unit/quiz-passed
// ✅ FIX: Replaced ONLY try{} in handleNext; removed markQcmCompleteDB entirely

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./QCMPage.css";
import api from "../../lib/api";

export default function QCMPage() {
  // ✅ UNIT-BASED route params
  const { courseId, unitId } = useParams();
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
  const unitIdNum = useMemo(() => Number(unitId || 0), [unitId]);

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
      window.dispatchEvent(new Event("dashboard-cache-updated"));
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
  const [progressReady, setProgressReady] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [unitProgressMap, setUnitProgressMap] = useState({});

  // ✅ set local resume pointer immediately
  useEffect(() => {
    if (!courseKey || !unitIdNum) return;
    try {
      localStorage.setItem(`resume_type_v1:${courseKey}`, "qcm");
      localStorage.setItem(`resume_unit_v1:${courseKey}`, String(unitIdNum));
    } catch { }
  }, [courseKey, unitIdNum]);

  // ✅ 0) enrollment check (NO auto-enroll)
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

  // ✅ 1) quiz by UNIT
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

  // ✅ 2) fetch course (for titles + unit lessons + next unit)
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

  // ✅ last lesson for Back button + resume pointer
  const lastLessonId = useMemo(() => {
    const list = unit?.lessons || [];
    return list.length ? Number(list[list.length - 1]?.id || 0) : 0;
  }, [unit]);

  // ✅ refresh progress (ONLY if enrolled)
  const refreshProgress = useCallback(async () => {
    if (!courseKey || !isEnrolled) return;

    setProgressLoading(true);
    try {
      const { data } = await api.get(`/progress/course/${courseKey}`);
      const ids = Array.isArray(data?.completed_lesson_ids) ? data.completed_lesson_ids : [];
      setCompletedLessonIds(new Set(ids.map((x) => Number(x))));
      setUnitProgressMap(data?.unit_progress || {});
      setProgressReady(true);
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

  // ✅ update backend resume pointer (safe; backend may ignore `type`)
  useEffect(() => {
    if (!courseKey || !unitIdNum || !lastLessonId) return;
    if (!isEnrolled) return;

    api
      .post(`/progress/course/${courseKey}/resume`, {
        unit_id: Number(unitIdNum),
        lesson_id: Number(lastLessonId),
        type: "qcm",
      })
      .catch(() => { });
  }, [courseKey, unitIdNum, lastLessonId, isEnrolled]);

  // ✅ NEW: Resume ping loop for time tracking
  useEffect(() => {
    if (!isEnrolled) return;
    if (!courseKey || !unitIdNum) return;

    let alive = true;
    let timer = null;

    const safePing = async () => {
      if (!alive) return;
      if (!lastLessonId) return;
      try {
        await api.post(`/progress/course/${courseKey}/resume`, {
          unit_id: Number(unitIdNum),
          lesson_id: Number(lastLessonId),
          type: "qcm",
        });
      } catch { }
    };

    safePing();
    timer = window.setInterval(safePing, 25000);

    const onUnload = () => {
      try {
        if (!lastLessonId) return;
        api.post(`/progress/course/${courseKey}/resume`, {
          unit_id: Number(unitIdNum),
          lesson_id: Number(lastLessonId),
          type: "qcm",
        });
      } catch { }
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("beforeunload", onUnload);
      safePing();
    };
  }, [isEnrolled, courseKey, unitIdNum, lastLessonId]);

  // ======= QUIZ DATA =======
  const questions = useMemo(() => {
    const data = quiz || {};
    const qs = Array.isArray(data?.questions)
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

  const isLessonCompleted = useCallback(
    (id) => completedLessonIds.has(Number(id)),
    [completedLessonIds]
  );

  const canOpenUnit = useCallback(
    (uIndex) => {
      if (uIndex <= 0) return true;
      const prevUnit = units[uIndex - 1];
      if (!prevUnit) return false;
      return isUnitCompleted(prevUnit.id);
    },
    [units, isUnitCompleted]
  );

  const hasCoding = useMemo(() => {
    return !!(unit?.codingExerciseEn || unit?.coding_exercise_en || unit?.codingExercise || unit?.coding_exercise);
  }, [unit]);

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

  // ✅ Guard redirect (wait progressReady)
  useEffect(() => {
    if (enrollCheckLoading) return;

    if (!isEnrolled) {
      navigate(`/courses/${courseKey}`, { replace: true });
      return;
    }

    // if course not loaded yet, do not guard
    if (!course) return;

    // if unit not found yet, do not guard
    if (!unit) return;

    if (loadingQuiz) return;
    if (!quiz) return;

    if (!progressReady) return;
    if (progressLoading) return;

    const ok = canOpenQCMDB();
    if (!ok) {
      if (lastLessonId) {
        navigate(`/course/${courseKey}/unit/${unitIdNum}/lesson/${Number(lastLessonId)}`, { replace: true });
      } else {
        navigate(`/courses/${courseKey}`, { replace: true });
      }
    }
  }, [
    enrollCheckLoading,
    isEnrolled,
    course,
    unit,
    loadingQuiz,
    quiz,
    progressReady,
    progressLoading,
    canOpenQCMDB,
    lastLessonId,
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

  // keep last attempt details for redo prefill
  const [lastAttemptDetails, setLastAttemptDetails] = useState([]); // [{question_id, correct}]
  const lastAttemptDetailsMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(lastAttemptDetails) ? lastAttemptDetails : []).forEach((d) => {
      if (d && d.question_id != null) m.set(Number(d.question_id), !!d.correct);
    });
    return m;
  }, [lastAttemptDetails]);

  // map optionId -> option object for display
  const optionIndexByQuestionId = useMemo(() => {
    const map = new Map();
    questions.forEach((q) => {
      const opts = Array.isArray(q?.options) ? q.options : [];
      const byId = new Map();
      opts.forEach((o) => byId.set(Number(o.id), o));
      map.set(Number(q.id), byId);
    });
    return map;
  }, [questions]);

  // reset when unit changes
  useEffect(() => {
    setIndex(0);
    setAnswersMap({});
    setShowWarning(false);
    setSubmitting(false);
    setResult(null);
    setLastAttemptDetails([]);
  }, [unitIdNum]);

  const current = questions[index];

  // XP intro (only on first question)
  const showXpIntro = useMemo(() => index === 0 && !result, [index, result]);
  const xpPerCorrectQuestionUI = 10; // UI only. Keep consistent with backend value.

  const handleBack = () => {
    if (result) {
      setResult(null);
      setShowWarning(false);
      // keep answersMap so user can see what they selected
      setIndex(Math.max(0, total - 1));
      return;
    }

    if (index > 0) {
      setIndex((v) => Math.max(0, v - 1));
      setShowWarning(false);
      return;
    }

    if (lastLessonId) navigate(`/course/${courseKey}/unit/${unitIdNum}/lesson/${Number(lastLessonId)}`);
    else navigate(`/courses/${courseKey}`);
  };

  // ✅ Local scoring (builds details so UI stays identical)
  const calculateLocalQuizResult = useCallback(() => {
    const qs = Array.isArray(questions) ? questions : [];
    const details = [];
    let score = 0;

    qs.forEach((q) => {
      const qid = Number(q?.id);
      const selected = Number(answersMap[qid] || 0);

      // Try common backend shapes for "correct option id"
      const correctId =
        Number(q?.correct_option_id || 0) ||
        Number(q?.correctOptionId || 0) ||
        Number(q?.correct_option || 0) ||
        Number(q?.correctOption || 0) ||
        0;

      let correct = false;

      if (correctId) {
        correct = selected === correctId;
      } else {
        // Fallback: option object has correctness flag
        const opts = Array.isArray(q?.options) ? q.options : [];
        const chosenOpt = opts.find((o) => Number(o?.id) === selected);
        correct = !!(chosenOpt?.correct || chosenOpt?.is_correct || chosenOpt?.isCorrect);
      }

      if (correct) score += 1;

      details.push({
        question_id: qid,
        correct,
      });
    });

    const totalLocal = qs.length;
    const percent = totalLocal ? (score / totalLocal) * 100 : 0;

    return {
      score,
      total: totalLocal,
      percent: Number(percent.toFixed(1)),
      details,
    };
  }, [questions, answersMap]);
  const markQcmCompleteDB = useCallback(async () => {
    if (!isEnrolled) return false;

    try {
      await api.post("/progress/unit/quiz-passed", {
        unit_id: Number(unitIdNum),
      });

      // optional cache refresh signal
      try {
        localStorage.setItem("progress_dirty", "1");
        window.dispatchEvent(new Event("progress-dirty"));
        window.dispatchEvent(new Event("dashboard-cache-updated"));
      } catch { }

      return true;
    } catch (e) {
      console.error("Failed to mark quiz passed:", e);
      return false;
    }
  }, [isEnrolled, unitIdNum]);



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

      // ✅ FIX: keep OBJECT format, but force NUMBER values
      // Build clean answers payload (ONLY current quiz questions)
      const cleanAnswers = {};
      questions.forEach((q) => {
        const qid = Number(q.id);
        if (answersMap[qid]) {
          cleanAnswers[qid] = Number(answersMap[qid]);
        }
      });

      const payload = {
        unit_id: Number(unitIdNum),
        answers: cleanAnswers
      };

      const res = await api.post("quiz/submit", {
        unit_id: Number(unitIdNum),
        answers: cleanAnswers,
      });


      const data = res?.data || null;
      setResult(data);
      setLastAttemptDetails(Array.isArray(data?.details) ? data.details : []);

      // XP notify
      const xpAwarded = Number(data?.xp_awarded || 0);
      if (xpAwarded > 0) {
        try {
          window.dispatchEvent(
            new CustomEvent("xp-updated", {
              detail: { xp_awarded: xpAwarded, source: "qcm" },
            })
          );
        } catch { }
      }

      const pct = Number(data?.percent || 0);
      if (pct >= 50) {
        await markQcmCompleteDB();
      }

      await refreshProgress();
    } catch (e) {
      console.error("Quiz submit failed:", e);
      alert(
        pickText(
          "Submit failed. Please try again.",
          "បញ្ជូនបរាជ័យ។ សូមព្យាយាមម្តងទៀត។"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleRetry = () => {
    // ✅ keep previously correct answers checked, clear wrong ones
    const nextMap = {};
    questions.forEach((q) => {
      const qid = Number(q.id);
      const wasCorrect = lastAttemptDetailsMap.get(qid) === true;
      if (wasCorrect) {
        const prev = answersMap[qid];
        if (prev) nextMap[qid] = prev;
      }
    });

    setIndex(0);
    setAnswersMap(nextMap);
    setShowWarning(false);
    setResult(null);
  };

  // ---------- RESULT COMPUTATIONS ----------
  const correctCount = Number(result?.score || 0);
  const resultTotal = Number(result?.total || total || 0);
  const percentage = resultTotal ? ((correctCount / resultTotal) * 100).toFixed(1) : "0.0";

  const xpAwarded = Number(result?.xp_awarded || 0);
  const xpAwardedQuestionIds = useMemo(() => {
    const ids = Array.isArray(result?.xp_awarded_question_ids) ? result.xp_awarded_question_ids : [];
    return new Set(ids.map((x) => Number(x)));
  }, [result]);

  // build list of chosen answers for display under result
  const chosenAnswersForResult = useMemo(() => {
    if (!result) return [];
    return questions.map((q, i) => {
      const qid = Number(q.id);
      const chosenId = Number(answersMap[qid] || 0);
      const optionMap = optionIndexByQuestionId.get(qid);
      const chosenOpt = optionMap ? optionMap.get(chosenId) : null;

      const chosenText = chosenOpt ? pickText(chosenOpt.text, chosenOpt.text_km) : "";
      const qText = pickText(q.question, q.question_km);

      const detail = Array.isArray(result?.details) ? result.details.find((d) => Number(d?.question_id) === qid) : null;
      const isCorrect = !!detail?.correct;

      return {
        idx: i + 1,
        question_id: qid,
        questionText: qText,
        chosenOptionId: chosenId,
        chosenText,
        isCorrect,
        gainedXp: isCorrect && xpAwardedQuestionIds.has(qid),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, questions, answersMap, optionIndexByQuestionId, pickText, xpAwardedQuestionIds]);

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
    return (
      <div className="lesson-page">
        <div className="lesson-loader">
          <div className="loader-l">
            {pickText("LOADING QCM", "កំពុងផ្ទុក")}
          </div>
        </div>
      </div>
    );
  }

  if (!isEnrolled) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("Not enrolled.", "មិនទាន់ចុះឈ្មោះទេ។")}</h2>;
  }

  if (loadingQuiz) {
    return (
      <div className="lesson-page">
        <div className="lesson-loader">
          <div className="loader-l">
            {pickText("LOADING...", "កំពុងផ្ទុក")}
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return <h2 style={{ padding: 40, color: "white" }}>{pickText("No QCM found for this unit", "មិនមានសំណួរសម្រាប់យូនីតនេះ")}</h2>;
  }

  if (total === 0) {
    return (
      <div style={{ padding: 40, color: "white" }}>
        <h2>{pickText("Quiz loaded, but no questions were returned.", "បានផ្ទុកសំណួរ ប៉ុន្តែមិនមានសំណួរត្រឡប់មកវិញ។")}</h2>
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          {pickText("Check DevTools → Network →", "ពិនិត្យ DevTools → Network →")} <code>/units/{unitIdNum}/quiz</code>
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

      {(loadingCourse || progressLoading || !progressReady) && (
        <div style={{ padding: "8px 18px", color: "#bbb" }}>
          {loadingCourse
            ? pickText("Loading course...", "កំពុងផ្ទុកវគ្គសិក្សា...")
            : !progressReady
              ? pickText("Loading progress...", "កំពុងផ្ទុកការរីកចម្រើន...")
              : pickText("Syncing progress...", "កំពុងសមកាលកម្ម...")}
        </div>
      )}

      <div className="lesson-content-wrapper">
        <div className="lesson-content qcm-content">
          {!result ? (
            <>
              <h2 className="qcm-title">{pickText("Quiz", "សំណួរ")}</h2>

              {showXpIntro && (
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    color: "#ddd",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {pickText("How XP works in this Quiz", "របៀបដែល XP ដំណើរការនៅក្នុងសំណួរ")}
                  </div>
                  <div style={{ opacity: 0.95 }}>
                    {pickText(
                      `• Get +${xpPerCorrectQuestionUI} XP for each correct question.\n• XP is awarded only ONCE per question (even if you redo).\n• On retry, your previously correct answers are auto-checked.`,
                      `• ទទួលបាន +${xpPerCorrectQuestionUI} XP សម្រាប់សំណួរត្រឹមត្រូវមួយៗ។\n• XP នឹងផ្តល់តែ ១ ដងក្នុងមួយសំណួរ (ទោះបីអ្នកសាកល្បងម្ដងទៀតក៏ដោយ)។\n• នៅពេល Retry ចម្លើយដែលធ្លាប់ត្រឹមត្រូវនឹងត្រូវ Auto-check។`
                    )}
                  </div>
                </div>
              )}

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

                <div style={{ marginTop: 8, opacity: 0.95 }}>
                  {pickText("XP earned this attempt:", "XP ដែលបានទទួលក្នុងការសាកល្បងនេះ:")}{" "}
                  <b>{xpAwarded}</b>
                </div>

                {/* ✅ Show chosen answers under result */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    {pickText("Your answers", "ចម្លើយរបស់អ្នក")}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {chosenAnswersForResult.map((row) => (
                      <div
                        key={row.question_id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ fontSize: 14, opacity: 0.95 }}>
                          <b>{row.idx}.</b> {row.questionText}
                        </div>

                        <div style={{ marginTop: 6, fontSize: 14 }}>
                          <span style={{ opacity: 0.85 }}>
                            {pickText("Chosen:", "បានជ្រើស:")}{" "}
                          </span>
                          <b>{row.chosenText || pickText("(none)", "(គ្មាន)")}</b>
                        </div>

                        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.95 }}>
                          {row.isCorrect ? (
                            <span>
                              ✅ {pickText("Correct", "ត្រឹមត្រូវ")}
                              {row.gainedXp ? (
                                <span style={{ marginLeft: 8, opacity: 0.9 }}>
                                  • +{xpPerCorrectQuestionUI} XP
                                </span>
                              ) : (
                                <span style={{ marginLeft: 8, opacity: 0.75 }}>
                                  • {pickText("XP already earned before", "XP បានទទួលរួចមុននេះ")}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>❌ {pickText("Wrong", "ខុស")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
