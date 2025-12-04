import React from "react";
import { Link } from "react-router-dom";
import "./CareerCard.css";

const CareerCard = ({ id, title, description, image, courses = [] }) => {
  return (
    <Link to={`/careers/${id}`} className="career-card-link">
      <div className="career-card">
        
        {/* IMAGE */}
        <div className="career-img-wrapper">
          <img src={image} alt={title} className="career-img" />
        </div>

        {/* BODY */}
        <div className="career-body">

          {/* Title + icon */}
          <h3 className="career-title">
            <i className="bi bi-briefcase-fill career-icon-title"></i>
            {title}
          </h3>

          <p className="career-description">{description}</p>

          {/* Subtitle + icon */}
          <h5 className="career-subtitle">
            <i className="bi bi-book-fill career-icon-sub"></i>
            Required Courses
          </h5>

          <ul className="career-course-list">
            {courses.map((course, index) => (
              <li key={index}>
                <i className="bi bi-check-circle-fill career-course-icon"></i>
                {course}
              </li>
            ))}
          </ul>
            
          <button className="career-btn">
            Start Learning Path 
            <i className="bi bi-arrow-right-short"></i>
          </button>

        </div>
      </div>
    </Link>
  );
};

export default CareerCard;
