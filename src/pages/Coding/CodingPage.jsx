import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { lessonsData } from "../../data/lessons";
import Editor from "@monaco-editor/react";
import "../Lessons/LessonPage.css";
import "./CodingPage.css";

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

  // footer burger
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // load course/unit
  const numericCourseId = Number(courseId);
  const course = lessonsData.find((c) => Number(c.id) === numericCourseId);

  const units = course?.content?.units || [];
  const unitIndex = units.findIndex((u) => u.id === unitId);
  const unit = unitIndex >= 0 ? units[unitIndex] : null;

  const exercises = unit?.coding || [];
  const exercise = exercises[0];

  const [code, setCode] = useState(exercise?.starterCode || "");

  useEffect(() => {
    setCode(exercise?.starterCode || "");
  }, [exercise?.starterCode]);

  const handleEditorMount = useCallback((editor) => {
    // optional: keep if you want later (run code, format code, etc.)
  }, []);

  if (!course) return <h2 style={{ padding: 40, color: "white" }}>Course not found</h2>;
  if (!unit) return <h2 style={{ padding: 40, color: "white" }}>Unit not found</h2>;
  if (!exercise) return <h2 style={{ padding: 40, color: "white" }}>No coding exercise for this unit</h2>;

  return (
    <div className="lesson-page coding-page">
      {/* HEADER */}
      <div className="lesson-header">
        <code>{`import Coding from '${course.title} - ${unit.title}'`}</code>
      </div>

      {/* CONTENT */}
      <div className="lesson-content-wrapper">
        <div className="lesson-content coding-content">
          <h2 className="qcm-title">{exercise.title}</h2>
          <p className="coding-prompt">{exercise.prompt}</p>

          {/* EDITOR */}
          <div className="coding-editor-box">
            <Editor
              onMount={handleEditorMount}
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
                scrollbar: { alwaysConsumeMouseWheel: false },
                mouseWheelScrollSensitivity: 1,
              }}
            />
          </div>

          {/* LIVE PREVIEW */}
          <div className="coding-preview">
            <div className="coding-preview-title">Preview</div>
            <iframe
              title="preview"
              className="coding-iframe"
              sandbox="allow-scripts"
              srcDoc={code}
            />
          </div>

          {/* ACTIONS */}
          <div className="coding-actions">
            <button
              className="qcm-btn-primary"
              onClick={() => {
                saveTime();
                navigate(`/course/${courseId}/unit/${unitId}/qcm`);
              }}
            >
              Go to Quiz →
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
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
                <h4>{unit.title} • Coding</h4>
                <ul>
                  <li>
                    <button className="qcm-jump-btn" onClick={() => setOpenMenu(false)}>
                      {exercise.title}
                    </button>
                  </li>
                  <li>
                    <button
                      className="qcm-jump-btn"
                      onClick={() => {
                        setOpenMenu(false);
                        saveTime();
                        navigate(`/course/${courseId}/unit/${unitId}/qcm`);
                      }}
                    >
                      Go to Quiz
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title">{unit.title} • Coding</button>
        </div>

        <div className="lf-right">
          <span className="lf-count">Coding Exercise</span>
          <button
            className="lf-nav"
            onClick={() => {
              saveTime();
              navigate(`/course/${courseId}/unit/${unitId}/qcm`);
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="lesson-progress-bar">
        <div className="lesson-progress-fill" style={{ width: "66%" }}></div>
      </div>
    </div>
  );
}
