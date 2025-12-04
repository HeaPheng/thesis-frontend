import React from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import careers from "../../data/careers";
import courses from "../../data/courses";
import "./CareerDetail.css";

const CareerDetail = () => {
  const { id } = useParams();
  const career = careers.find((c) => c.id === parseInt(id));

  if (!career) {
    return <h2 className="text-center mt-5">Career Not Found</h2>;
  }

  // Filter courses related to this career
  const relatedCourses = courses.filter((course) =>
    career.courses.includes(course.title) ||
    career.courses.some(item => course.title.toLowerCase().includes(item.toLowerCase()))
  );

  return (
    <div className="career-detail-page">
      <Container className="cd-container">

        {/* Title */}
        <h2 className="cd-title">{career.title}</h2>

        {/* Description Box */}
        <div className="cd-desc-box">
          <p>{career.description}</p>
        </div>

        {/* Progress Section */}
        <div className="cd-progress-wrapper">
          <div className="cd-progress-label">Your Progress: 0%</div>
          <div className="cd-progress-bar">
            <div className="cd-progress-fill" style={{ width: "0%" }}></div>
          </div>
        </div>

        {/* Suggested Courses */}
        <h3 className="cd-courses-title">Suggested Courses</h3>

        <Row className="gy-4">
          {relatedCourses.map((course) => (
            <Col key={course.id} md={6} lg={4} className="d-flex">
              <Link to={`/courses/${course.id}`} className="cd-course-card-link w-100">
                <Card className="cd-course-card flex-fill">
                  <Card.Img
                    variant="top"
                    src={course.image}
                    className="cd-course-img"
                  />

                  <Card.Body>
                    <h5 className="cd-course-title">{course.title}</h5>

                    <p className="cd-course-desc">{course.description}</p>

                    <div className="cd-course-meta">
                      <span>📘 {course.lessons} Lessons</span>
                      <span>📂 {course.units} Units</span>
                      <span>📝 {course.qcm} QCM</span>
                      <span>💻 {course.coding} Coding</span>
                    </div>

                    {/* Button is last flex item */}
                    <Button className="cd-course-btn w-100 mt-2">
                      Start Learning
                    </Button>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

      </Container>
    </div>
  );
};

export default CareerDetail;
