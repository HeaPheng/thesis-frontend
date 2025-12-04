import React, { useEffect, useState } from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Navbar.css";
import Logo from "../assets/images/logo.png";

const AppNavbar = ({ lang, setLang }) => {
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isStudyPage =
    location.pathname.includes("/lesson/") ||
    location.pathname.includes("/coding") ||
    location.pathname.includes("/qcm");

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
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
        {/* ✅ Logo: go Dashboard if logged-in, else Home */}
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

        {/* ✅ Study pages: only language switcher */}
        {isStudyPage ? (
          <Nav className="ms-auto d-flex align-items-center gap-3">
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </Nav>
        ) : (
          <>
            <Navbar.Toggle aria-controls="main-navbar" />
            <Navbar.Collapse id="main-navbar">
              <Nav className="ms-auto d-flex align-items-center gap-3">
                {/* ✅ Always show these (normal pages) */}
                <Nav.Link as={Link} to="/courses" className="course-bot">
                  Courses
                </Nav.Link>

                <Nav.Link as={Link} to="/careers" className="carreer-bot">
                  Careers
                </Nav.Link>

                {/* ✅ NEW: Tips */}
                <Nav.Link as={Link} to="/tips" className="tips-bot">
                  Tutorials
                </Nav.Link>

                {/* ✅ Auth buttons only */}
                {!isLoggedIn ? (
                  <div className="auth-buttons d-flex align-items-center">
                    <Nav.Link as={Link} to="/login">
                      <Button variant="outline-light" size="sm">
                        Login
                      </Button>
                    </Nav.Link>

                    <Nav.Link as={Link} to="/register">
                      <Button variant="primary" size="sm">
                        Register
                      </Button>
                    </Nav.Link>
                  </div>
                ) : (
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                )}

                <LanguageSwitcher lang={lang} setLang={setLang} />
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
