import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { lessonsData } from "../../data/lessons";
import Editor from "@monaco-editor/react";
import "../Lessons/LessonPage.css";
import "./CodingPage.css";
import { canOpenCoding, unlockCoding } from "../../utils/progress";

export default function CodingPage() {
  const { courseId, unitId } = useParams();
  const navigate = useNavigate();

  // ✅ time tracking key per course
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

  // ✅ helper: persist time (so it keeps accumulating)
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

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const numericCourseId = Number(courseId);
  const course = lessonsData.find((c) => Number(c.id) === numericCourseId);

  const units = course?.content?.units || [];
  const unitIndex = units.findIndex((u) => u.id === unitId);
  const unit = unitIndex >= 0 ? units[unitIndex] : null;

  const exercises = unit?.coding || [];
  const exercise = exercises[0];

  const [code, setCode] = useState(exercise?.starterCode || "");
  useEffect(() => setCode(exercise?.starterCode || ""), [exercise?.starterCode]);

  // ✅ ORDER GUARD: Coding locked until LAST lesson unlocked
  useEffect(() => {
    if (!unit?.lessons?.length) return;

    const lastLessonIndex = unit.lessons.length - 1;
    const ok = canOpenCoding(courseId, unitId, unitIndex, lastLessonIndex);

    if (!ok) {
      const firstLessonId = unit.lessons[0]?.id;
      if (firstLessonId) {
        navigate(`/course/${courseId}/unit/${unitId}/lesson/${firstLessonId}`, {
          replace: true,
        });
      }
    }
  }, [courseId, unitId, unit, unitIndex, navigate]);

  if (!course)
    return <h2 style={{ padding: 40, color: "white" }}>Course not found</h2>;
  if (!unit)
    return <h2 style={{ padding: 40, color: "white" }}>Unit not found</h2>;
  if (!exercise)
    return (
      <h2 style={{ padding: 40, color: "white" }}>
        No coding exercise for this unit
      </h2>
    );

  // ✅ Go to QCM: mark coding as done (this unlocks QCM), then navigate
  const goQCM = () => {
    saveTime();
    unlockCoding(courseId, unitId); // ✅ QCM guard expects codingUnlocked === true
    navigate(`/course/${courseId}/unit/${unitId}/qcm`);
  };

  return (
    <div className="lesson-page coding-page">
      <div className="lesson-header">
        <code>{`import Coding from '${course.title} - ${unit.title}'`}</code>
      </div>

      <div className="lesson-content-wrapper">
        <div className="lesson-content coding-content">
          <h2 className="qcm-title">{exercise.title}</h2>
          <p className="coding-prompt">{exercise.prompt}</p>

          <div className="coding-editor-box">
            <Editor
              height="60vh"
              theme="vs-dark"
              defaultLanguage={exercise.language || "html"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
              }}
            />
          </div>

          <div className="coding-preview">
            <div className="coding-preview-title">Preview</div>
            <iframe
              title="preview"
              className="coding-iframe"
              sandbox="allow-scripts"
              srcDoc={code}
            />
          </div>

          <div className="coding-actions">
            <button className="qcm-btn-primary" onClick={goQCM} type="button">
              Go to Quiz →
            </button>
          </div>
        </div>
      </div>

      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button
            className="lf-btn"
            onClick={() => {
              saveTime();
              navigate(`/courses/${courseId}`);
            }}
            type="button"
          >
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button
              className="lf-btn"
              onClick={() => setOpenMenu(!openMenu)}
              type="button"
            >
              <i className="bi bi-list"></i>
            </button>

            {openMenu && (
              <div className="lesson-dropdown">
                <h4>{unit.title} • Coding</h4>
                <ul>
                  <li>
                    <button
                      className="qcm-jump-btn"
                      onClick={() => setOpenMenu(false)}
                      type="button"
                    >
                      {exercise.title}
                    </button>
                  </li>
                  <li>
                    <button
                      className="qcm-jump-btn"
                      onClick={() => {
                        setOpenMenu(false);
                        goQCM();
                      }}
                      type="button"
                    >
                      Go to Quiz
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title" type="button">
            {unit.title} • Coding
          </button>
        </div>

        <div className="lf-right">
          <span className="lf-count">Coding Exercise</span>
          <button className="lf-nav" onClick={goQCM} type="button">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
