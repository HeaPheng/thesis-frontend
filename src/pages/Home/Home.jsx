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

  /* ==========================================================
     ✅ OPTION A: Auto-redirect logged-in users away from Home
     - If token exists, go to /dashboard
     - Works local + deployed
  ========================================================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // ✅ language state (en / km)
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

  // ✅ Home Login state
  const [lEmail, setLEmail] = useState("");
  const [lPassword, setLPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [lError, setLError] = useState("");
  const [lLoading, setLLoading] = useState(false);

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
        setDataError("home_load_failed");
      } finally {
        if (!alive) return;
        setDataLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleHomeLogin = async (e) => {
    e.preventDefault();
    setLError("");

    if (!lEmail || !lPassword) {
      setLError(lang === "km" ? "សូមបំពេញអ៊ីមែល និងពាក្យសម្ងាត់។" : "Please enter email and password.");
      return;
    }

    try {
      setLLoading(true);

      const { data } = await api.post("/auth/login", {
        email: lEmail,
        password: lPassword,
      });

      // ✅ store auth (same style as your old register)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userName", data.user?.name || "");
      localStorage.setItem("userEmail", data.user?.email || lEmail);

      window.dispatchEvent(new Event("auth-changed"));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        (lang === "km" ? "ចូលគណនីមិនបានទេ" : "Login failed");
      setLError(msg);
    } finally {
      setLLoading(false);
    }
  };

  // ✅ home text dictionary
  const text = useMemo(() => {
    const km = {
      hero_title: "រៀនជំនាញថ្មីៗ ដើម្បីអនាគតល្អ",
      hero_subtitle: "ជ្រើសរើសវគ្គសិក្សា និងជំនាញ ដើម្បីចាប់ផ្តើមថ្ងៃនេះ។",
      browse_courses: "មើលវគ្គសិក្សា",
      career_paths: "ជំនាញ",
      welcome_back: "សូមស្វាគមន៍មកវិញ",
      login_to_continue: "ចូលគណនី ដើម្បីបន្ត",
      email: "អ៊ីមែល",
      password: "ពាក្យសម្ងាត់",
      login: "ចូលគណនី",
      no_account: "មិនទាន់មានគណនី?",
      register: "ចុះឈ្មោះ",
      explore_courses: "ស្វែងរកវគ្គសិក្សា",
      view_all_courses: "មើលវគ្គសិក្សាទាំងអស់",
      view_all_careers: "មើលជំនាញទាំងអស់",
      loading_courses: "កំពុងផ្ទុកវគ្គសិក្សា...",
      loading_careers: "កំពុងផ្ទុកជំនាញ...",
      show: "បង្ហាញ",
      hide: "លាក់",
    };

    const en = {
      hero_title: "Learn New Skills for a Better Future",
      hero_subtitle: "Choose courses and career paths to start learning today.",
      browse_courses: "Browse Courses",
      career_paths: "Career Paths",
      welcome_back: "Welcome back",
      login_to_continue: "Login to continue",
      email: "Email",
      password: "Password",
      login: "Login",
      no_account: "Don’t have an account?",
      register: "Register",
      explore_courses: "Explore Courses",
      view_all_courses: "View All Courses",
      view_all_careers: "View All Careers",
      loading_courses: "Loading courses...",
      loading_careers: "Loading career paths...",
      show: "Show",
      hide: "Hide",
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

      {/* LOGIN */}
      <RevealOnScroll>
        <div className="home-login-wrapper">
          <div className="home-login-card">
            <div className="home-login-badge">
              <i className="bi bi-stars"></i>
              <span>{text.login_to_continue}</span>
            </div>

            <h3 className="home-login-title">{text.welcome_back} 👋</h3>

            {lError && (
              <Alert variant="danger" className="mb-3">
                {lError}
              </Alert>
            )}

            <form onSubmit={handleHomeLogin}>
              <div className="home-auth-input modern">
                <i className="bi bi-envelope"></i>
                <input
                  type="email"
                  placeholder={text.email}
                  value={lEmail}
                  onChange={(e) => setLEmail(e.target.value)}
                  disabled={lLoading}
                />
              </div>

              <div className="home-auth-input modern">
                <i className="bi bi-lock"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={text.password}
                  value={lPassword}
                  onChange={(e) => setLPassword(e.target.value)}
                  disabled={lLoading}
                />
                <button
                  type="button"
                  className="home-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={lLoading}
                  aria-label={showPassword ? text.hide : text.show}
                >
                  <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                </button>
              </div>

              <button className="home-login-btn" type="submit" disabled={lLoading}>
                {lLoading ? (
                  <>
                    <Spinner size="sm" /> {lang === "km" ? "កំពុងចូល..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    {text.login}
                  </>
                )}
              </button>
            </form>

            <p className="home-login-footer">
              {text.no_account}
              <Link to="/register"> {text.register}</Link>
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
              <Row className="gy-4 justify-content-start">
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
