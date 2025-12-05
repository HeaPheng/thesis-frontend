import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Container, Accordion } from "react-bootstrap";
import courses from "../../data/courses";
import { lessonsData } from "../../data/lessons";
import CertificateModal from "../../components/CertificateModal";
import "./CourseDetail.css";
import {
  canOpenLesson,
  canOpenCoding,
  canOpenQCM,
  unlockUnit,
  unlockLesson,
} from "../../utils/progress";

const CourseDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [showCert, setShowCert] = useState(false);
  const [spentMinutes, setSpentMinutes] = useState(0);

  const course = useMemo(
    () => courses.find((c) => c.id === parseInt(id)),
    [id]
  );

  const courseLessons = useMemo(() => {
    if (!course) return null;
    return lessonsData.find((item) => Number(item.id) === Number(course.id)) || null;
  }, [course]);

  const units = useMemo(() => {
    return courseLessons?.content?.units || [];
  }, [courseLessons]);

  const userName = localStorage.getItem("userName") || "Student";

  // ✅ certificate popup (safe hook position)
  useEffect(() => {
    if (location.state?.completed) {
      setSpentMinutes(Number(location.state?.timeSpentMinutes || 0));
      setShowCert(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // ✅ always ensure: Unit 1 + Lesson 1 are unlocked (safe, not conditional)
  useEffect(() => {
    if (!course?.id) return;
    if (!units.length) return;

    const firstUnitId = String(units[0].id);
    unlockUnit(String(course.id), firstUnitId);
    unlockLesson(String(course.id), firstUnitId, 0);
  }, [course?.id, units]);

  // ---------- EARLY RETURNS (AFTER hooks) ----------
  if (!course) return <h2 className="text-center mt-5">Course not found</h2>;

  if (!courseLessons || !courseLessons.content) {
    return (
      <div className="course-detail-page">
        <Container className="cd-container">
          <h2 className="cd-title">{course.title}</h2>

          <div className="cd-desc-box">
            <p>{course.description}</p>
          </div>

          <h3 className="cd-syllabus-title">Course Syllabus</h3>
          <p className="text-muted">📘 Lessons not added yet.</p>

          <CertificateModal
            show={showCert}
            onHide={() => setShowCert(false)}
            userName={userName}
            courseTitle={course.title}
            timeSpentMinutes={spentMinutes}
          />
        </Container>
      </div>
    );
  }

  // ---------- navigation helpers ----------
  const goLesson = (unitId, lessonId) => {
    navigate(`/course/${course.id}/unit/${unitId}/lesson/${lessonId}`);
  };

  const goQCM = (unitId) => {
    navigate(`/course/${course.id}/unit/${unitId}/qcm`);
  };

  const goCoding = (unitId) => {
    navigate(`/course/${course.id}/unit/${unitId}/coding`);
  };

  return (
    <div className="course-detail-page">
      <Container className="cd-container">
        <h2 className="cd-title">{course.title}</h2>

        <div className="cd-desc-box">
          <p>{course.description}</p>
        </div>

        <div className="cd-stats-row">
          <div className="cd-stat-box">
            <span className="cd-stat-label">Units</span>
            <span className="cd-stat-value">{course.units}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">Lessons</span>
            <span className="cd-stat-value">{course.lessons}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">QCM</span>
            <span className="cd-stat-value">{course.qcm}</span>
          </div>
          <div className="cd-stat-box">
            <span className="cd-stat-label">Coding</span>
            <span className="cd-stat-value">{course.coding}</span>
          </div>
        </div>

        <div className="cd-progress-wrapper">
          <div className="cd-progress-label">Progress: 0%</div>
          <div className="cd-progress-bar">
            <div className="cd-progress-fill" style={{ width: "0%" }} />
          </div>
        </div>

        <h3 className="cd-syllabus-title">Course Syllabus</h3>

        <div className="cd-syllabus-box">
          <Accordion alwaysOpen>
            {units.map((unit, unitIndex) => {
              const hasCoding = !!(unit?.coding && unit.coding.length > 0);
              const lastLessonIndex = (unit?.lessons?.length || 1) - 1;

              const codingUnlocked = canOpenCoding(
                String(course.id),
                unit.id,
                unitIndex,
                lastLessonIndex
              );

              const quizUnlocked = canOpenQCM(
                String(course.id),
                unit.id,
                unitIndex,
                hasCoding,
                lastLessonIndex
              );

              return (
                <Accordion.Item eventKey={String(unitIndex)} key={unit.id}>
                  <Accordion.Header>
                    <div className="cd-unit-header">
                      <div className="cd-unit-index">{unitIndex + 1}</div>
                      <div className="cd-unit-text">
                        <div className="cd-unit-title">{unit.title}</div>
                        <div className="cd-unit-meta">
                          {unit.lessons.length} lessons • {unit.qcm.length} QCM
                        </div>
                      </div>
                    </div>
                  </Accordion.Header>

                  <Accordion.Body>
                    {unit.lessons.map((lesson, lessonIndex) => {
                      const unlocked = canOpenLesson(
                        String(course.id),
                        unit.id,
                        unitIndex,
                        lessonIndex
                      );

                      return (
                        <div className="cd-lesson-row" key={lesson.id}>
                          <div className="cd-lesson-info">
                            <button
                              type="button"
                              className={`cd-lesson-title-btn ${
                                !unlocked ? "is-locked" : ""
                              }`}
                              onClick={() => unlocked && goLesson(unit.id, lesson.id)}
                              disabled={!unlocked}
                            >
                              <i className="bi bi-play-fill cd-open-icon"></i>
                              {lesson.title}
                            </button>

                            <div className={`cd-lesson-meta ${unlocked ? "" : "locked"}`}>
                              {unlocked ? "Open" : "Locked 🔒"}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {hasCoding && (
                      <div className="cd-lesson-row qcm-row">
                        <div className="cd-lesson-info">
                          <button
                            type="button"
                            className={`cd-lesson-title-btn ${
                              !codingUnlocked ? "is-locked" : ""
                            }`}
                            onClick={() => codingUnlocked && goCoding(unit.id)}
                            disabled={!codingUnlocked}
                          >
                            <i className="bi bi-code-slash cd-open-icon"></i>
                            Coding Exercise
                          </button>

                          <div className={`cd-lesson-meta ${codingUnlocked ? "" : "locked"}`}>
                            {codingUnlocked ? "Open" : "Locked 🔒"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="cd-lesson-row qcm-row">
                      <div className="cd-lesson-info">
                        <button
                          type="button"
                          className={`cd-lesson-title-btn ${
                            !quizUnlocked ? "is-locked" : ""
                          }`}
                          onClick={() => quizUnlocked && goQCM(unit.id)}
                          disabled={!quizUnlocked}
                        >
                          <i className="bi bi-question-circle cd-open-icon"></i>
                          QCM Quiz ({unit.qcm.length} questions)
                        </button>

                        <div className={`cd-lesson-meta ${quizUnlocked ? "" : "locked"}`}>
                          {quizUnlocked ? "Quiz" : "Locked 🔒"}
                        </div>
                      </div>
                    </div>
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
          courseTitle={course.title}
          timeSpentMinutes={spentMinutes}
        />
      </Container>
    </div>
  );
};

export default CourseDetail;
