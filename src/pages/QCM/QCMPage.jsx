// src/pages/QCM/QCMPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { lessonsData } from "../../data/lessons";
import "./QCMPage.css";

export default function QCMPage() {
  const { courseId, unitId } = useParams();
  const navigate = useNavigate();

  // ✅ time tracking key per course (same as LessonPage)
  const timeKey = `course-time-${courseId}`;

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");
    if (!current.startedAt) {
      localStorage.setItem(
        timeKey,
        JSON.stringify({ startedAt: Date.now(), minutes: 0 })
      );
    }
  }, [timeKey]);

  const saveTime = () => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");
    const startedAt = Number(current.startedAt || Date.now());
    const minutesSaved = Number(current.minutes || 0);
    const extra = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
    const minutes = minutesSaved + extra;

    localStorage.setItem(
      timeKey,
      JSON.stringify({ startedAt: Date.now(), minutes })
    );
    return Math.max(1, minutes);
  };

  const finishCourseWithCertificate = () => {
    const mins = saveTime();
    localStorage.removeItem(timeKey); // optional: clear after completion
    navigate(`/courses/${courseId}`, {
      state: { completed: true, timeSpentMinutes: mins },
    });
  };

  // ======= FOOTER BURGER MENU =======
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ======= QUIZ STATE =======
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // ✅ NEW: review mode (prompt | show)
  const [reviewMode, setReviewMode] = useState("prompt");

  // ======= LOAD DATA =======
  const numericCourseId = Number(courseId);
  const course = lessonsData.find((c) => Number(c.id) === numericCourseId);
  const units = course?.content?.units || [];
  const currentUnitIndex = units.findIndex((u) => u.id === unitId);
  const unit = currentUnitIndex >= 0 ? units[currentUnitIndex] : null;

  const questions = unit?.qcm || [];
  const total = questions.length;
  const current = questions[index];

  if (!course)
    return <h2 style={{ padding: 40, color: "white" }}>Course not found</h2>;
  if (!unit)
    return <h2 style={{ padding: 40, color: "white" }}>Unit not found</h2>;
  if (!total) {
    return (
      <h2 style={{ padding: 40, color: "white" }}>
        No QCM found for this unit
      </h2>
    );
  }

  // ====== SCORE / STATS ======
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const percentage = total ? ((correctCount / total) * 100).toFixed(1) : 0;

  let grade = "F";
  if (percentage >= 90) grade = "A";
  else if (percentage >= 80) grade = "B";
  else if (percentage >= 70) grade = "C";
  else if (percentage >= 60) grade = "D";

  const wrongAnswers = answers.filter((a) => !a.isCorrect);

  // ======= SUBMIT HANDLER =======
  const handleSubmit = () => {
    if (!selected) {
      setShowWarning(true);
      return;
    }

    setShowWarning(false);

    const isCorrect = selected === current.answer;

    setAnswers((prev) => [
      ...prev,
      {
        question: current.question,
        selected,
        correct: current.answer,
        isCorrect,
      },
    ]);

    if (index + 1 < total) {
      setIndex(index + 1);
      setSelected("");
    } else {
      setFinished(true);
      setReviewMode("prompt"); // ✅ reset to prompt when quiz ends
    }
  };

  const handleRetry = () => {
    setIndex(0);
    setSelected("");
    setAnswers([]);
    setFinished(false);
    setShowWarning(false);
    setReviewMode("prompt"); // ✅ reset
  };

  // ✅ Updated: if no next unit, finish course + show certificate
  const goToNextUnit = () => {
    saveTime();

    const nextUnit = units[currentUnitIndex + 1];
    if (nextUnit && nextUnit.lessons?.length > 0) {
      const firstLessonId = nextUnit.lessons[0].id;
      navigate(`/course/${courseId}/unit/${nextUnit.id}/lesson/${firstLessonId}`);
    } else {
      finishCourseWithCertificate();
    }
  };

  const progressValue = finished ? 100 : ((index + 1) / total) * 100;

  return (
    <div className="lesson-page qcm-page">
      {/* HEADER */}
      <div className="lesson-header">
        <code>{`import Quiz from '${course.title} - ${unit.title}'`}</code>
      </div>

      {/* CONTENT */}
      <div className="lesson-content-wrapper">
        <div className="lesson-content qcm-content">
          {!finished ? (
            <>
              <h2 className="qcm-title">Quiz</h2>

              <div className="qcm-question-block">
                <div className="qcm-question-text">
                  {index + 1}. {current.question}
                </div>

                <div className="qcm-options">
                  {current.options.map((op, i) => (
                    <label
                      key={i}
                      className={`qcm-option ${selected === op ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="qcm"
                        value={op}
                        checked={selected === op}
                        onChange={() => {
                          setSelected(op);
                          setShowWarning(false);
                        }}
                      />
                      <span>{op}</span>
                    </label>
                  ))}
                </div>
              </div>

              {showWarning && (
                <div className="qcm-warning">
                  ⚠️ Please select an answer before continuing.
                </div>
              )}

              <div className="qcm-bottom-row">
                <div className="qcm-question-count">
                  Question {index + 1} of {total}
                </div>

                <button className="qcm-next-btn" onClick={handleSubmit}>
                  {index + 1 === total ? "Finish" : "Next"}
                </button>
              </div>
            </>
          ) : (
            /* ===== RESULT VIEW ===== */
            <div className="qcm-result-wrapper">
              <div className="qcm-result-summary">
                <h2>Quiz Results</h2>

                <div className="qcm-result-grid">
                  <div>
                    <div className="qcm-label">Score</div>
                    <div className="qcm-value">
                      {correctCount} / {total}
                    </div>
                  </div>
                  <div>
                    <div className="qcm-label">Percentage</div>
                    <div className="qcm-value">{percentage}%</div>
                  </div>
                  <div>
                    <div className="qcm-label">Grade</div>
                    <div className="qcm-value">{grade}</div>
                  </div>
                </div>

                <div className="qcm-result-buttons">
                  <button className="qcm-btn-secondary" onClick={handleRetry}>
                    🔁 Retry Quiz
                  </button>

                  {percentage >= 50 ? (
                    <button className="qcm-btn-primary" onClick={goToNextUnit}>
                      ➜ Next Unit
                    </button>
                  ) : (
                    <div className="qcm-locked-msg">
                      ❗ You need at least <b>50%</b> to unlock the next unit.
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ REVIEW BOX */}
              {answers.length > 0 && (
                <div className="qcm-review-box">
                  {wrongAnswers.length > 0 && reviewMode === "prompt" ? (
                    <>
                      <h3>You have some wrong answers</h3>
                      <p className="qcm-review-sub">
                        Do you want to see the correct answers, or try again by yourself?
                      </p>

                      <div className="qcm-review-actions">
                        <button className="qcm-btn-secondary" onClick={handleRetry}>
                          🔁 Do it again
                        </button>

                        <button
                          className="qcm-btn-primary"
                          onClick={() => setReviewMode("show")}
                        >
                          ✅ Show correct answers
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Correct Answers</h3>

                      {answers.map((item, idx) => (
                        <div className="qcm-review-item" key={idx}>
                          <div className="qcm-review-question">
                            {idx + 1}. {item.question}
                          </div>

                          <div className="qcm-review-answer correct">
                            Correct answer: <span>{item.correct}</span>
                          </div>

                          {!item.isCorrect && (
                            <div className="qcm-review-answer wrong">
                              Your answer: <span>{item.selected}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button
            className="lf-btn"
            onClick={() => {
              saveTime();
              navigate(`/courses/${courseId}`);
            }}
          >
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu(!openMenu)}>
              <i className="bi bi-list"></i>
            </button>

            {openMenu && (
              <div className="lesson-dropdown">
                <h4>{unit.title} • Quiz</h4>
                <ul>
                  {questions.map((q, i) => (
                    <li key={q.id}>
                      <button
                        className="qcm-jump-btn"
                        onClick={() => {
                          setIndex(i);
                          setSelected("");
                          setAnswers([]);
                          setFinished(false);
                          setShowWarning(false);
                          setReviewMode("prompt");
                          setOpenMenu(false);
                        }}
                      >
                        Question {i + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title">{unit.title} • Quiz</button>
        </div>

        <div className="lf-right">
          {!finished ? (
            <>
              <span className="lf-count">
                Question {index + 1} / {total}
              </span>
              <button className="lf-nav" onClick={handleSubmit}>
                {index + 1 === total ? "Finish" : "Next →"}
              </button>
            </>
          ) : (
            <>
              <span className="lf-count">
                Score: {correctCount}/{total} ({percentage}%)
              </span>

              {percentage >= 50 ? (
                <button className="lf-nav" onClick={goToNextUnit}>
                  Next Unit →
                </button>
              ) : (
                <span className="lf-nav-disabled">Next Unit (Locked)</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="lesson-progress-bar">
        <div
          className="lesson-progress-fill"
          style={{ width: `${progressValue}%` }}
        ></div>
      </div>
    </div>
  );
}
