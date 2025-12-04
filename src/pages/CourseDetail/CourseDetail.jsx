import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Container, Accordion } from "react-bootstrap";
import courses from "../../data/courses";
import { lessonsData } from "../../data/lessons";
import CertificateModal from "../../components/CertificateModal";
import "./CourseDetail.css";

const CourseDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [showCert, setShowCert] = useState(false);
  const [spentMinutes, setSpentMinutes] = useState(0);

  // Find course in courses.js
  const course = useMemo(
    () => courses.find((c) => c.id === parseInt(id)),
    [id]
  );

  const userName = localStorage.getItem("userName") || "Student";

  useEffect(() => {
    // ✅ If we came back with completion state, open certificate popup
    if (location.state?.completed) {
      setSpentMinutes(Number(location.state?.timeSpentMinutes || 0));
      setShowCert(true);

      // ✅ clear state so refresh doesn't show again
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  if (!course) {
    return <h2 className="text-center mt-5">Course not found</h2>;
  }

  // Find lessons in lessonsData ARRAY
  const courseLessons = lessonsData.find(
    (item) => Number(item.id) === Number(course.id)
  );

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

  const units = courseLessons.content.units;

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
            {units.map((unit, index) => (
              <Accordion.Item eventKey={String(index)} key={unit.id}>
                <Accordion.Header>
                  <div className="cd-unit-header">
                    <div className="cd-unit-index">{index + 1}</div>
                    <div className="cd-unit-text">
                      <div className="cd-unit-title">{unit.title}</div>
                      <div className="cd-unit-meta">
                        {unit.lessons.length} lessons • {unit.qcm.length} QCM
                      </div>
                    </div>
                  </div>
                </Accordion.Header>

                <Accordion.Body>
                  {unit.lessons.map((lesson) => (
                    <div className="cd-lesson-row" key={lesson.id}>
                      <div className="cd-lesson-info">
                        <Link
                          to={`/course/${course.id}/unit/${unit.id}/lesson/${lesson.id}`}
                          className="cd-lesson-title"
                        >
                          <i className="bi bi-play-fill cd-open-icon"></i>
                          {lesson.title}
                        </Link>
                        <div className="cd-lesson-meta">Open</div>
                      </div>
                    </div>
                  ))}

                  <div className="cd-lesson-row qcm-row">
                    <div className="cd-lesson-info">
                      <Link
                        to={`/course/${course.id}/unit/${unit.id}/qcm`}
                        className="cd-lesson-title"
                      >
                        <i className="bi bi-question-circle cd-open-icon"></i>
                        QCM Quiz ({unit.qcm.length} questions)
                      </Link>
                      <div className="cd-lesson-meta">Quiz</div>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>

        {/* ✅ Completion Modal */}
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
