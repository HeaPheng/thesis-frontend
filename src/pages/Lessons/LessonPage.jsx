import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { lessonsData } from "../../data/lessons";
import LessonContent from "./LessonContent";
import "./LessonPage.css";

export default function LessonPage() {
  const { courseId, unitId, lessonId } = useParams();
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  // ---- FIND COURSE BY ID (works with ARRAY lessonsData) ----
  const numericCourseId = Number(courseId);
  const course = lessonsData.find((c) => Number(c.id) === numericCourseId);

  // Safely resolve units / unit / lesson
  const units = course?.content?.units || [];
  const currentUnitIndex = units.findIndex((u) => u.id === unitId);
  const unit = currentUnitIndex >= 0 ? units[currentUnitIndex] : null;

  const lessonIndex =
    unit && unit.lessons ? unit.lessons.findIndex((l) => l.id === lessonId) : -1;

  const lesson = unit && lessonIndex >= 0 ? unit.lessons[lessonIndex] : null;

  // ✅ time tracking key per course
  const timeKey = `course-time-${courseId}`;

  // ✅ Start time tracking when entering any lesson page
  useEffect(() => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");

    // If not started yet, set startedAt
    if (!current.startedAt) {
      localStorage.setItem(
        timeKey,
        JSON.stringify({ startedAt: Date.now(), minutes: 0 })
      );
    }
  }, [timeKey]);

  // ✅ helper: get minutes spent so far
  const getSpentMinutes = () => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");
    const startedAt = Number(current.startedAt || Date.now());
    const minutesSaved = Number(current.minutes || 0);

    // add extra minutes since last start
    const extra = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
    return Math.max(1, minutesSaved + extra);
  };

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

  // ==== HANDLE CLICK OUTSIDE BURGER MENU ====
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ==== RIGHT CLICK "ASK IT" MENU ====
  useEffect(() => {
    const askMenu = document.getElementById("askit-menu");
    if (!askMenu) return;

    function handleContextMenu(e) {
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) return;

      e.preventDefault();
      askMenu.style.display = "block";
      askMenu.style.top = `${e.clientY + window.scrollY}px`;
      askMenu.style.left = `${e.clientX + window.scrollX}px`;
    }

    function handleAskClick() {
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) return;

      navigator.clipboard.writeText(selectedText).then(() => {
        window.open("https://chat.openai.com/", "_blank");
      });
    }

    function hideAskMenu() {
      askMenu.style.display = "none";
    }

    document.addEventListener("contextmenu", handleContextMenu);
    askMenu.addEventListener("click", handleAskClick);
    document.addEventListener("click", hideAskMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      askMenu.removeEventListener("click", handleAskClick);
      document.removeEventListener("click", hideAskMenu);
    };
  }, []);

  // ==== NAVIGATION LOGIC (Lesson → Coding → QCM) ====
  let prevLesson = null;
  let nextLesson = null;

  let goToCoding = false;
  let goToQCM = false;

  const hasCoding = !!(unit?.coding && Array.isArray(unit.coding) && unit.coding.length > 0);

  if (unit && lessonIndex > -1) {
    if (lessonIndex > 0) prevLesson = unit.lessons[lessonIndex - 1];

    if (lessonIndex < unit.lessons.length - 1) {
      nextLesson = unit.lessons[lessonIndex + 1];
    } else {
      if (hasCoding) goToCoding = true;
      else goToQCM = true;
    }
  }

  // ✅ Detect last lesson of last unit (course completion)
  const isLastUnit = currentUnitIndex === units.length - 1;
  const isLastLessonInUnit = unit && lessonIndex === unit.lessons.length - 1;
  const courseCompletedHere =
    isLastUnit && isLastLessonInUnit && !hasCoding && !(unit?.qcm?.length > 0);

  // ==== CONDITIONAL RENDERING ====
  if (!course) return <h2 style={{ padding: 40, color: "white" }}>Course not found</h2>;
  if (!unit) return <h2 style={{ padding: 40, color: "white" }}>Unit not found</h2>;
  if (!lesson) return <h2 style={{ padding: 40, color: "white" }}>Lesson not found</h2>;

  // ✅ navigation helpers (use react-router, keep time saved)
  const goHome = () => {
    saveTime();
    navigate(`/courses/${courseId}`);
  };

  const goLesson = (toLessonId) => {
    saveTime();
    navigate(`/course/${courseId}/unit/${unit.id}/lesson/${toLessonId}`);
  };

  const goCoding = () => {
    saveTime();
    navigate(`/course/${courseId}/unit/${unit.id}/coding`);
  };

  const goQCM = () => {
    saveTime();
    navigate(`/course/${courseId}/unit/${unit.id}/qcm`);
  };

  // ✅ if the course is completed at this exact point, return to details with certificate state
  const goCompleteCourse = () => {
    const mins = getSpentMinutes();
    localStorage.removeItem(timeKey); // optional: clear timer after completion

    navigate(`/courses/${courseId}`, {
      state: { completed: true, timeSpentMinutes: mins },
    });
  };

  return (
    <div className="lesson-page">
      {/* HEADER */}
      <div className="lesson-header">
        <code>{`import Lesson from '${course.title}'`}</code>
      </div>

      {/* CONTENT */}
      <div className="lesson-content-wrapper">
        <LessonContent content={lesson.content} />
      </div>

      {/* ASK IT MENU */}
      <div id="askit-menu" className="askit-menu">
        Ask ChatGPT
      </div>

      {/* ===== FOOTER BAR ===== */}
      <div className="lesson-footer-bar">
        {/* LEFT SIDE */}
        <div className="lf-left">
          {/* HOME BUTTON */}
          <button className="lf-btn" onClick={goHome}>
            <i className="bi bi-house"></i>
          </button>

          {/* BURGER BUTTON */}
          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu(!openMenu)}>
              <i className="bi bi-list"></i>
            </button>

            {/* SMALL DROPDOWN MENU */}
            {openMenu && (
              <div className="lesson-dropdown">
                <h4>{unit.title}</h4>
                <ul>
                  {unit.lessons.map((l) => (
                    <li key={l.id}>
                      <button
                        className="lesson-dd-btn"
                        onClick={() => {
                          setOpenMenu(false);
                          goLesson(l.id);
                        }}
                      >
                        {l.title}
                      </button>
                    </li>
                  ))}

                  {hasCoding && (
                    <li style={{ marginTop: 10 }}>
                      <button
                        className="lesson-dd-btn"
                        onClick={() => {
                          setOpenMenu(false);
                          goCoding();
                        }}
                      >
                        💻 Coding Exercise
                      </button>
                    </li>
                  )}

                  {unit.qcm?.length > 0 && (
                    <li>
                      <button
                        className="lesson-dd-btn"
                        onClick={() => {
                          setOpenMenu(false);
                          goQCM();
                        }}
                      >
                        ✅ Quiz (QCM)
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* UNIT TITLE */}
          <button className="lf-unit-title">{unit.title}</button>
        </div>

        {/* RIGHT SIDE */}
        <div className="lf-right">
          {/* PREVIOUS */}
          {prevLesson ? (
            <button className="lf-nav" onClick={() => goLesson(prevLesson.id)}>
              ← Previous
            </button>
          ) : (
            <span className="lf-nav-disabled">← Previous</span>
          )}

          {/* INDEX */}
          <span className="lf-count">
            {lessonIndex + 1} / {unit.lessons.length}
          </span>

          {/* NEXT / CODING / QCM / COMPLETE */}
          {nextLesson ? (
            <button className="lf-nav" onClick={() => goLesson(nextLesson.id)}>
              Next →
            </button>
          ) : goToCoding ? (
            <button className="lf-nav" onClick={goCoding}>
              Start Coding →
            </button>
          ) : goToQCM ? (
            <button className="lf-nav" onClick={goQCM}>
              Start Quiz →
            </button>
          ) : courseCompletedHere ? (
            <button className="lf-nav" onClick={goCompleteCourse}>
              Finish Course 🎉
            </button>
          ) : (
            <span className="lf-nav-disabled">Next →</span>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="lesson-progress-bar">
        <div
          className="lesson-progress-fill"
          style={{
            width: `${((lessonIndex + 1) / unit.lessons.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
