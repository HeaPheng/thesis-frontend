import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { lessonsData } from "../../data/lessons";
import LessonContent from "./LessonContent";
import "./LessonPage.css";
import {
  unlockLesson,
  canOpenLesson,
  canOpenCoding,
  canOpenQCM,
  unlockCoding,
} from "../../utils/progress";

export default function LessonPage() {
  const { courseId, unitId, lessonId } = useParams();
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const menuRef = useRef(null);

  const numericCourseId = Number(courseId);
  const course = lessonsData.find((c) => Number(c.id) === numericCourseId);

  const units = course?.content?.units || [];
  const currentUnitIndex = units.findIndex((u) => u.id === unitId);
  const unit = currentUnitIndex >= 0 ? units[currentUnitIndex] : null;

  const lessonIndex = unit?.lessons
    ? unit.lessons.findIndex((l) => l.id === lessonId)
    : -1;

  const lesson = unit && lessonIndex >= 0 ? unit.lessons[lessonIndex] : null;

  const hasCoding = !!(unit?.coding && unit.coding.length > 0);
  const hasQcm = !!(unit?.qcm && unit.qcm.length > 0);
  const lastLessonIndex = (unit?.lessons?.length || 1) - 1;

  // ✅ stop people from opening locked lesson by typing URL
  useEffect(() => {
    if (!unit || lessonIndex < 0) return;

    const allowed = canOpenLesson(courseId, unitId, currentUnitIndex, lessonIndex);
    if (!allowed) {
      let fallbackIdx = 0;
      for (let i = 0; i < unit.lessons.length; i++) {
        if (canOpenLesson(courseId, unitId, currentUnitIndex, i)) fallbackIdx = i;
      }
      const fallbackLessonId = unit.lessons[fallbackIdx]?.id;
      if (fallbackLessonId) {
        navigate(`/course/${courseId}/unit/${unitId}/lesson/${fallbackLessonId}`, {
          replace: true,
        });
      }
    }
  }, [courseId, unitId, currentUnitIndex, lessonIndex, unit, navigate]);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toastLock = (msg) => {
    setLockMsg(msg);
    window.clearTimeout(window.__lock_toast);
    window.__lock_toast = window.setTimeout(() => setLockMsg(""), 1800);
  };

  const goLesson = (toLessonId) => {
    const toIndex = unit.lessons.findIndex((l) => l.id === toLessonId);
    const ok = canOpenLesson(courseId, unitId, currentUnitIndex, toIndex);
    if (!ok) return toastLock("🔒 Complete the previous lesson first.");
    navigate(`/course/${courseId}/unit/${unitId}/lesson/${toLessonId}`);
  };

  const goCoding = () => {
    const ok = canOpenCoding(courseId, unitId, currentUnitIndex, lastLessonIndex);
    if (!ok) return toastLock("🔒 Finish all lessons in this unit to unlock Coding.");
    navigate(`/course/${courseId}/unit/${unitId}/coding`);
  };

  const goQCM = () => {
    const ok = canOpenQCM(courseId, unitId, currentUnitIndex, hasCoding, lastLessonIndex);
    if (!ok) {
      return toastLock(hasCoding ? "🔒 Finish Coding to unlock Quiz." : "🔒 Finish lessons to unlock Quiz.");
    }
    navigate(`/course/${courseId}/unit/${unitId}/qcm`);
  };

  // ✅ unlock logic when pressing NEXT
  const goNext = () => {
    if (lessonIndex < lastLessonIndex) {
      unlockLesson(courseId, unitId, lessonIndex + 1);
      const next = unit.lessons[lessonIndex + 1];
      navigate(`/course/${courseId}/unit/${unitId}/lesson/${next.id}`);
      return;
    }

    // last lesson
    if (hasCoding) {
      unlockCoding(courseId, unitId); // ✅ IMPORTANT
      navigate(`/course/${courseId}/unit/${unitId}/coding`);
      return;
    }

    if (hasQcm) {
      navigate(`/course/${courseId}/unit/${unitId}/qcm`);
      return;
    }

    toastLock("✅ Unit completed.");
  };

  if (!course) return <h2 style={{ padding: 40, color: "white" }}>Course not found</h2>;
  if (!unit) return <h2 style={{ padding: 40, color: "white" }}>Unit not found</h2>;
  if (!lesson) return <h2 style={{ padding: 40, color: "white" }}>Lesson not found</h2>;

  return (
    <div className="lesson-page">
      <div className="lesson-header">
        <code>{`import Lesson from '${course.title}'`}</code>
      </div>

      <div className="lesson-content-wrapper">
        <LessonContent content={lesson.content} />
      </div>

      {lockMsg && <div className="lock-toast">{lockMsg}</div>}

      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button className="lf-btn" onClick={() => navigate(`/courses/${courseId}`)} type="button">
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu(!openMenu)} type="button">
              <i className="bi bi-list"></i>
            </button>

            {openMenu && (
              <div className="lesson-dropdown">
                <h4>{unit.title}</h4>
                <ul>
                  {unit.lessons.map((l, idx) => {
                    const locked = !canOpenLesson(courseId, unitId, currentUnitIndex, idx);
                    return (
                      <li key={l.id}>
                        <button
                          className={`lesson-dd-btn ${locked ? "locked" : ""}`}
                          onClick={() => {
                            setOpenMenu(false);
                            goLesson(l.id);
                          }}
                          type="button"
                        >
                          {locked ? "🔒 " : ""}{l.title}
                        </button>
                      </li>
                    );
                  })}

                  {hasCoding && (
                    <li style={{ marginTop: 10 }}>
                      <button
                        className={`lesson-dd-btn ${
                          !canOpenCoding(courseId, unitId, currentUnitIndex, lastLessonIndex) ? "locked" : ""
                        }`}
                        onClick={() => {
                          setOpenMenu(false);
                          goCoding();
                        }}
                        type="button"
                      >
                        💻 Coding Exercise
                      </button>
                    </li>
                  )}

                  {hasQcm && (
                    <li>
                      <button
                        className={`lesson-dd-btn ${
                          !canOpenQCM(courseId, unitId, currentUnitIndex, hasCoding, lastLessonIndex) ? "locked" : ""
                        }`}
                        onClick={() => {
                          setOpenMenu(false);
                          goQCM();
                        }}
                        type="button"
                      >
                        ✅ Quiz (QCM)
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title" type="button">{unit.title}</button>
        </div>

        <div className="lf-right">
          <span className="lf-count">{lessonIndex + 1} / {unit.lessons.length}</span>

          <button className="lf-nav" onClick={goNext} type="button">
            {lessonIndex < lastLessonIndex
              ? "Next →"
              : hasCoding
              ? "Start Coding →"
              : hasQcm
              ? "Start Quiz →"
              : "Finish →"}
          </button>
        </div>
      </div>
    </div>
  );
}
