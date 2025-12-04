import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Home.css";
import CourseCard from "../../components/CourseCard";
import careers from "../../data/careers";
import courses from "../../data/courses";
import CareerCard from "../../components/CareerCard";
import { useTranslation } from "react-i18next";
import RevealOnScroll from "../../components/RevealOnScroll";

const Home = () => {
  const { t } = useTranslation();

  return (
    <div className="home-bg-wrapper">
      {/* HERO SECTION (always visible) */}
      <div className="home-hero-section">
        <Container className="mt-5">
          <Row className="text-center mb-5">
            <Col>
              <h1 className="home-title">{t("hero_title")}</h1>
              <p className="home-subtitle">{t("hero_subtitle")}</p>

              <div className="home-buttons d-flex justify-content-center gap-3 mt-3">
                <Link to="/courses">
                  <Button className="home-btn" variant="primary">
                    {t("browse_courses")}
                  </Button>
                </Link>

                <Link to="/careers">
                  <Button className="home-btn" variant="success">
                    {t("career_paths")}
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* REGISTER */}
      <RevealOnScroll>
        <div className="home-register-wrapper">
          <div className="home-register-card">
            <h3 className="home-register-title">{t("create_account")}</h3>

            <form>
              <div className="home-auth-input">
                <i className="bi bi-person"></i>
                <input type="text" placeholder={t("full_name")} />
              </div>

              <div className="home-auth-input">
                <i className="bi bi-envelope"></i>
                <input type="email" placeholder={t("email")} />
              </div>

              <div className="home-auth-input">
                <i className="bi bi-lock"></i>
                <input type="password" placeholder={t("password")} />
              </div>

              <button className="home-register-btn btn btn-success" type="submit">
                {t("register")}
              </button>
            </form>

            <p className="home-register-footer">
              {t("already_account")}
              <a href="/login"> {t("login")}</a>
            </p>
          </div>
        </div>
      </RevealOnScroll>

      {/* COURSES */}
      <RevealOnScroll>
        <div className="home-courses-section">
          <Container>
            <h2 className="home-courses-title">{t("explore_courses")}</h2>

            <Row className="gy-4 justify-content-center">
              {courses.slice(0, 6).map((course) => (
                <Col
                  key={course.id}
                  md={6}
                  lg={4}
                  className="d-flex justify-content-center"
                >
                  <CourseCard
                    id={course.id}
                    image={course.image}
                    title={course.title}
                    description={course.description}
                    lessons={course.lessons}
                    units={course.units}
                    qcm={course.qcm}
                    coding={course.coding}
                  />
                </Col>
              ))}
            </Row>
          </Container>
        </div>
      </RevealOnScroll>

      {/* VIEW ALL */}
      <RevealOnScroll>
        <div className="home-view-all mt-4">
          <Link to="/courses">
            <button className="view-all-btn">{t("view_all_courses")}</button>
          </Link>
        </div>
      </RevealOnScroll>

      {/* CAREERS */}
      <RevealOnScroll>
        <div className="home-careers-section">
          <Container>
            <h2 className="text-center mb-4">{t("career_paths")}</h2>

            <Row className="gy-4 justify-content-center">
              {careers.slice(0, 6).map((career) => (
                <Col
                  key={career.id}
                  md={6}
                  lg={4}
                  className="d-flex justify-content-center"
                >
                  <CareerCard {...career} />
                </Col>
              ))}
            </Row>
          </Container>

          <div className="text-center mt-4">
            <Link to="/careers">
              <button className="btn btn-primary">{t("view_all_careers")}</button>
            </Link>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Home;
