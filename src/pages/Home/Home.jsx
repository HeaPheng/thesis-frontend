import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Home.css";
import CourseCard from "../../components/CourseCard";
import CareerCard from "../../components/CareerCard";
import RevealOnScroll from "../../components/RevealOnScroll";
import api from "../../lib/api";

const Home = () => {
  const navigate = useNavigate();

  // ✅ our language state (en / km)
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLangChanged = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
      else setLang(localStorage.getItem("app_lang") || "en");
    };
    window.addEventListener("app-lang-changed", onLangChanged);
    return () => window.removeEventListener("app-lang-changed", onLangChanged);
  }, []);

  const pickText = useCallback(
    (en, km) => (lang === "km" ? km || en || "" : en || km || ""),
    [lang]
  );

  // ✅ Home Register state
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rPasswordConfirm, setRPasswordConfirm] = useState("");

  const [rError, setRError] = useState("");
  const [rLoading, setRLoading] = useState(false);

  // ✅ Real data state
  const [courses, setCourses] = useState([]);
  const [careers, setCareers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  // ✅ Fetch real data for Home
  useEffect(() => {
    let alive = true;

    (async () => {
      setDataLoading(true);
      setDataError("");

      try {
        const [coursesRes, careersRes] = await Promise.allSettled([
          api.get("/courses"),
          api.get("/career-paths"),
        ]);

        if (!alive) return;

        if (coursesRes.status === "fulfilled") {
          setCourses(Array.isArray(coursesRes.value.data) ? coursesRes.value.data : []);
        } else {
          console.error("Failed to load /courses:", coursesRes.reason);
        }

        if (careersRes.status === "fulfilled") {
          const raw = careersRes.value.data;
          setCareers(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
        } else {
          console.error("Failed to load /career-paths:", careersRes.reason);
        }
      } catch (e) {
        if (!alive) return;
        // ✅ keep a stable error key instead of language-specific text
        setDataError("home_load_failed");
      } finally {
        if (!alive) return;
        setDataLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []); // ✅ IMPORTANT: no lang dependency


  const handleHomeRegister = async (e) => {
    e.preventDefault();
    setRError("");

    if (!rName || !rEmail || !rPassword || !rPasswordConfirm) {
      setRError(lang === "km" ? "សូមបំពេញព័ត៌មានឱ្យគ្រប់។" : "Please fill in all fields.");
      return;
    }
    if (rPassword !== rPasswordConfirm) {
      setRError(lang === "km" ? "ពាក្យសម្ងាត់បញ្ជាក់មិនត្រឹមត្រូវ។" : "Password confirmation does not match.");
      return;
    }

    try {
      setRLoading(true);

      const { data } = await api.post("/auth/register", {
        name: rName,
        email: rEmail,
        password: rPassword,
        password_confirmation: rPasswordConfirm,
      });

      // ✅ store auth
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ keep your old flags (if other pages rely on them)
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userName", data.user?.name || rName);
      localStorage.setItem("userEmail", data.user?.email || rEmail);

      window.dispatchEvent(new Event("auth-changed"));

      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.name?.[0] ||
        (lang === "km" ? "ចុះឈ្មោះមិនបានទេ" : "Register failed");
      setRError(msg);
    } finally {
      setRLoading(false);
    }
  };

  // ✅ home text dictionary (simple + fast)
  const text = useMemo(() => {
    const km = {
      hero_title: "រៀនជំនាញថ្មីៗ ដើម្បីអនាគតល្អ",
      hero_subtitle: "ជ្រើសរើសវគ្គសិក្សា និងជំនាញ ដើម្បីចាប់ផ្តើមថ្ងៃនេះ។",
      browse_courses: "មើលវគ្គសិក្សា",
      career_paths: "ជំនាញ",
      create_account: "បង្កើតគណនី",
      full_name: "ឈ្មោះពេញ",
      email: "អ៊ីមែល",
      password: "ពាក្យសម្ងាត់",
      confirm_password: "បញ្ជាក់ពាក្យសម្ងាត់",
      register: "ចុះឈ្មោះ",
      already_account: "មានគណនីរួចហើយ?",
      login: "ចូលគណនី",
      explore_courses: "ស្វែងរកវគ្គសិក្សា",
      view_all_courses: "មើលវគ្គសិក្សាទាំងអស់",
      view_all_careers: "មើលជំនាញទាំងអស់",
      loading_courses: "កំពុងផ្ទុកវគ្គសិក្សា...",
      loading_careers: "កំពុងផ្ទុកជំនាញ...",
    };

    const en = {
      hero_title: "Learn New Skills for a Better Future",
      hero_subtitle: "Choose courses and career paths to start learning today.",
      browse_courses: "Browse Courses",
      career_paths: "Career Paths",
      create_account: "Create Account",
      full_name: "Full Name",
      email: "Email",
      password: "Password",
      confirm_password: "Confirm Password",
      register: "Register",
      already_account: "Already have an account?",
      login: "Login",
      explore_courses: "Explore Courses",
      view_all_courses: "View All Courses",
      view_all_careers: "View All Careers",
      loading_courses: "Loading courses...",
      loading_careers: "Loading career paths...",
    };

    return lang === "km" ? km : en;
  }, [lang]);

  return (
    <div className="home-bg-wrapper">
      {/* HERO SECTION */}
      <div className="home-hero-section">
        <Container className="mt-5">
          <Row className="text-center mb-5">
            <Col>
              <h1 className="home-title">{text.hero_title}</h1>
              <p className="home-subtitle">{text.hero_subtitle}</p>

              <div className="home-buttons d-flex justify-content-center gap-3 mt-3">
                <Link to="/courses">
                  <Button className="home-btn" variant="btn btn-outline-info">
                    {text.browse_courses}
                  </Button>
                </Link>

                <Link to="/careers">
                  <Button className="home-btn" variant="btn btn-outline-primary">
                    {text.career_paths}
                  </Button>
                </Link>
              </div>

              {dataError && (
                <Alert variant="danger" className="mt-3">
                  {dataError}
                </Alert>
              )}
            </Col>
          </Row>
        </Container>
      </div>

      {/* REGISTER */}
      <RevealOnScroll>
        <div className="home-register-wrapper">
          <div className="home-register-card">
            <h3 className="home-register-title">{text.create_account}</h3>

            {rError && (
              <Alert variant="danger" className="mb-3">
                {rError}
              </Alert>
            )}

            <form onSubmit={handleHomeRegister}>
              <div className="home-auth-input">
                <i className="bi bi-person"></i>
                <input
                  type="text"
                  placeholder={text.full_name}
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  disabled={rLoading}
                />
              </div>

              <div className="home-auth-input">
                <i className="bi bi-envelope"></i>
                <input
                  type="email"
                  placeholder={text.email}
                  value={rEmail}
                  onChange={(e) => setREmail(e.target.value)}
                  disabled={rLoading}
                />
              </div>

              <div className="home-auth-input">
                <i className="bi bi-lock"></i>
                <input
                  type="password"
                  placeholder={text.password}
                  value={rPassword}
                  onChange={(e) => setRPassword(e.target.value)}
                  disabled={rLoading}
                />
              </div>

              <div className="home-auth-input">
                <i className="bi bi-lock-fill"></i>
                <input
                  type="password"
                  placeholder={text.confirm_password}
                  value={rPasswordConfirm}
                  onChange={(e) => setRPasswordConfirm(e.target.value)}
                  disabled={rLoading}
                />
              </div>

              <button className="home-register-btn btn btn-success" type="submit" disabled={rLoading}>
                {rLoading ? (lang === "km" ? "កំពុងបង្កើត..." : "Creating...") : text.register}
              </button>
            </form>

            <p className="home-register-footer">
              {text.already_account}
              <a href="/login"> {text.login}</a>
            </p>
          </div>
        </div>
      </RevealOnScroll>

      {/* COURSES */}
      <RevealOnScroll>
        <div className="home-courses-section">
          <Container>
            <h2 className="home-courses-title">{text.explore_courses}</h2>

            {dataLoading ? (
              <div className="text-center py-4" style={{ color: "white" }}>
                <Spinner size="sm" /> {text.loading_courses}
              </div>
            ) : (
              <Row className="gy-4 justify-content-center">
                {courses.slice(0, 6).map((course) => (
                  <Col key={course.id} md={6} lg={4} className="d-flex justify-content-center">
                    <CourseCard
                      id={course.id}
                      slug={course.slug}
                      image={course.thumbnail_url}
                      title={course.title}
                      title_km={course.title_km}
                      description={course.description}
                      description_km={course.description_km}
                      lessons={course.lessons_count}
                      units={course.units_count}
                      qcm={course.qcm_count}
                      coding={course.coding_count || 0}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Container>
        </div>
      </RevealOnScroll>

      {/* VIEW ALL COURSES */}
      <RevealOnScroll>
        <div className="home-view-all mt-4">
          <Link to="/courses">
            <button className="view-all-btn">{text.view_all_courses}</button>
          </Link>
        </div>
      </RevealOnScroll>

      {/* CAREERS */}
      <RevealOnScroll>
        <div className="home-careers-section">
          <Container>
            <h2 className="text-center mb-4">{text.career_paths}</h2>

            {dataLoading ? (
              <div className="text-center py-4" style={{ color: "white" }}>
                <Spinner size="sm" /> {text.loading_careers}
              </div>
            ) : (
              <Row className="gy-4 justify-content-center">
                {careers.slice(0, 6).map((career) => (
                  <Col key={career.id} md={6} lg={4} className="d-flex justify-content-center">
                    <CareerCard
                      id={career.slug}
                      title={pickText(career.title, career.title_km)}
                      description={pickText(career.description, career.description_km)}
                      image={career.image_url}
                      courses={career.courses || []}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Container>

          <div className="text-center mt-4">
            <Link to="/careers">
              <button className="view-all-btn">{text.view_all_careers}</button>
            </Link>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Home;
