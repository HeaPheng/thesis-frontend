import React, { useEffect, useMemo, useState } from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Navbar.css";
import Logo from "../assets/images/logo.png";
import api from "../lib/api";

const AppNavbar = () => {
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Navbar owns its language (source: localStorage + event)
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);

    // also sync once on mount (in case user refreshed)
    onLang({ detail: { lang: localStorage.getItem("app_lang") || "en" } });

    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const isStudyPage =
    location.pathname.includes("/lesson/") ||
    location.pathname.includes("/coding") ||
    location.pathname.includes("/qcm");

  // ✅ Auth source of truth
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [userName, setUserName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.name || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);

      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        setUserName(u?.name || "");
      } catch {
        setUserName("");
      }
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, [location.pathname]);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        courses: "វគ្គសិក្សា",
        careers: "ជំនាញ",
        tutorials: "មេរៀនខ្លីៗ",
        login: "ចូលគណនី",
        register: "ចុះឈ្មោះ",
        logout: "ចេញពីគណនី",
      };
    }
    return {
      courses: "Courses",
      careers: "Careers",
      tutorials: "Tutorials",
      login: "Login",
      register: "Register",
      logout: "Logout",
    };
  }, [lang]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    window.dispatchEvent(new Event("auth-changed"));
    navigate("/");
  };

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      fixed="top"
      className={`navbar ${scrolled ? "navbar-shadow" : ""}`}
    >
      <Container fluid className="px-2">
        <Navbar.Brand
          as={Link}
          to={isLoggedIn ? "/dashboard" : "/"}
          className="d-flex align-items-center gap-2 logo-animate"
        >
          <img src={Logo} alt="logo" className="nav-logo" />
          <span style={{ color: "aquamarine" }} className="logo-text">
            KhmerCodingHub
          </span>
        </Navbar.Brand>

        {isStudyPage ? (
          <Nav className="ms-auto d-flex align-items-center gap-3">
            <LanguageSwitcher />
          </Nav>
        ) : (
          <>
            <Navbar.Toggle aria-controls="main-navbar" />
            <Navbar.Collapse id="main-navbar">
              <Nav className="ms-auto d-flex align-items-center gap-3">
                <Nav.Link as={Link} to="/courses" className="course-bot">
                  {ui.courses}
                </Nav.Link>

                <Nav.Link as={Link} to="/careers" className="carreer-bot">
                  {ui.careers}
                </Nav.Link>

                <Nav.Link as={Link} to="/tips" className="tips-bot">
                  {ui.tutorials}
                </Nav.Link>

                {!isLoggedIn ? (
                  <div className="auth-buttons d-flex align-items-center">
                    <Nav.Link as={Link} to="/login">
                      <Button variant="outline-light" size="sm">
                        {ui.login}
                      </Button>
                    </Nav.Link>

                    <Nav.Link as={Link} to="/register">
                      <Button variant="primary" size="sm">
                        {ui.register}
                      </Button>
                    </Nav.Link>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    {userName}
                    <Button variant="btn btn-outline-danger" size="sm" onClick={handleLogout}>
                      {ui.logout}
                    </Button>
                  </div>
                )}

                <LanguageSwitcher />
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
