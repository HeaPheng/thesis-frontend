import React from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import "./CourseCard.css";
import { Link } from "react-router-dom";

const CourseCard = ({
  id,
  image,
  title,
  description,
  lessons,
  units,
  qcm,
  coding,
}) => {
  return (
    <Card className="course-card shadow-sm">
      {/* IMAGE */}
      <Link to={`/courses/${id}`} className="course-img-wrapper">
        <Card.Img variant="top" src={image} className="course-img" />
      </Link>

      {/* ⭐ FLEX BODY */}
      <div className="course-body">
        <h5 className="course-title">{title}</h5>

        <p className="course-description">{description}</p>

        <Link to={`/courses/${id}`} className="read-more">
          Read More →
        </Link>

        <div className="course-meta mt-3">
          <span>📘 {lessons} Lessons</span>
          <span>📂 {units} Units</span>
        </div>

        <div className="exercise-info mt-3">
          📝 {qcm} QCM • 💻 {coding} Coding Exercises
        </div>

        {/* ⭐ FOOTER: BUTTON AT BOTTOM, KEEP STYLE */}
        <div className="course-card-footer">
          <Button
            as={Link}
            to={`/courses/${id}`}
            className="exercise-btn"
          >
            Start Learning
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
