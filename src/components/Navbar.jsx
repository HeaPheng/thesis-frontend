import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Navbar.css";
import Logo from "../assets/images/logo.png";
import { useUser } from "../context/UserContext";

function initialsFromName(n = "") {
  const parts = String(n || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "S";
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

const AppNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Global user (no /auth/me here)
  const { user, loading, logout } = useUser();

  // ✅ Measure navbar height dynamically
  const navbarRef = useRef(null);

  // ✅ Mobile menu open/close
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  const toggleMenu = useCallback(() => setShowMenu((prev) => !prev), []);

  // ✅ language source: localStorage + event
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    onLang({ detail: { lang: localStorage.getItem("app_lang") || "en" } });
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const isStudyPage =
    location.pathname.includes("/lesson/") ||
    location.pathname.includes("/coding") ||
    location.pathname.includes("/qcm");

  /**
   * ✅ Auth: token is the source of truth
   * - user context may be null briefly while loading /auth/me
   * - token tells us immediately if logged in (matches ProtectedRoute & MainLayout)
   */
  const hasToken = !!localStorage.getItem("token");
  const isLoggedIn = hasToken && !loading;

  const userName = String(user?.name || "");
  const avatarUrl = user?.active_avatar_image_url || null;
  const xpBalance = Number(user?.xp_balance ?? 0) || 0;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Keep CSS variable in sync with real navbar height
  useLayoutEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const h = navbarRef.current?.offsetHeight || 56;
      root.style.setProperty("--nav-h", `${h}px`);
    };

    apply();

    let ro;
    if (window.ResizeObserver && navbarRef.current) {
      ro = new ResizeObserver(() => apply());
      ro.observe(navbarRef.current);
    }

    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMenu, closeMenu]);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        courses: "វគ្គសិក្សា",
        careers: "ជំនាញ",
        tutorials: "មេរៀនខ្លីៗ",
        leaderboard: "តារាងពិន្ទុ",
        login: "ចូលគណនី",
        register: "ចុះឈ្មោះ",
        logout: "ចេញពីគណនី",
        menu: "ម៉ឺនុយ",
        profileXp: (xp) => `ប្រវត្តិ • XP ${xp}`,
        profile: "ប្រវត្តិ",
        student: "សិស្ស",
      };
    }
    return {
      courses: "Courses",
      careers: "Careers",
      tutorials: "Tutorials",
      leaderboard: "Leaderboard",
      login: "Login",
      register: "Register",
      logout: "Logout",
      menu: "Menu",
      profileXp: (xp) => `Profile • XP ${xp}`,
      profile: "Profile",
      student: "Student",
    };
  }, [lang]);

  const handleLogout = async () => {
    await logout(); // clears token + headers + context
    // ✅ Make sure MainLayout + others update instantly
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/", { replace: true });
  };

  const avatarSrc = avatarUrl || "/avatars/a1.png";

  const DesktopNavLinks = () => (
    <>
      <Nav.Link as={Link} to="/courses" className="course-bot">
        {ui.courses}
      </Nav.Link>
      <Nav.Link as={Link} to="/careers" className="carreer-bot">
        {ui.careers}
      </Nav.Link>
      <Nav.Link as={Link} to="/tips" className="tips-bot">
        {ui.tutorials}
      </Nav.Link>

      {isLoggedIn && (
        <Nav.Link as={Link} to="/leaderboard" className="leaderboard-bot">
          {ui.leaderboard}
        </Nav.Link>
      )}
    </>
  );

  const MobileNavLinks = ({ onAnyClick }) => (
    <>
      <Nav.Link
        as={Link}
        to="/courses"
        className="navlink nav-dd-link"
        onClick={onAnyClick}
      >
        <span className="nav-dd-ico">📚</span>
        <span className="nav-dd-text">{ui.courses}</span>
        <span className="nav-dd-arrow">›</span>
      </Nav.Link>

      <Nav.Link
        as={Link}
        to="/careers"
        className="navlink nav-dd-link"
        onClick={onAnyClick}
      >
        <span className="nav-dd-ico">🧭</span>
        <span className="nav-dd-text">{ui.careers}</span>
        <span className="nav-dd-arrow">›</span>
      </Nav.Link>

      <Nav.Link
        as={Link}
        to="/tips"
        className="navlink nav-dd-link"
        onClick={onAnyClick}
      >
        <span className="nav-dd-ico">✨</span>
        <span className="nav-dd-text">{ui.tutorials}</span>
        <span className="nav-dd-arrow">›</span>
      </Nav.Link>

      {isLoggedIn && (
        <Nav.Link
          as={Link}
          to="/leaderboard"
          className="navlink nav-dd-link"
          onClick={onAnyClick}
        >
          <span className="nav-dd-ico">🏆</span>
          <span className="nav-dd-text">{ui.leaderboard}</span>
          <span className="nav-dd-arrow">›</span>
        </Nav.Link>
      )}
    </>
  );

  const AuthAreaDesktop = () => {
    if (loading) return null;

    if (!isLoggedIn) {
      return (
        <div className="auth-buttons d-flex align-items-center gap-2">
          <Nav.Link as={Link} to="/login" className="p-0">
            <Button variant="outline-light" size="sm">
              {ui.login}
            </Button>
          </Nav.Link>

          <Nav.Link as={Link} to="/register" className="p-0">
            <Button variant="primary" size="sm">
              {ui.register}
            </Button>
          </Nav.Link>
        </div>
      );
    }

    return (
      <div className="nav-user d-flex align-items-center gap-2">
        <button
          type="button"
          className="nav-avatar-btn"
          onClick={() => navigate("/profile")}
          title={ui.profileXp(xpBalance)}
          aria-label={ui.profile}
        >
          <img
            className="nav-avatar-img"
            src={avatarSrc}
            alt="avatar"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent && !parent.querySelector(".nav-avatar-fallback")) {
                const div = document.createElement("div");
                div.className = "nav-avatar-fallback";
                div.textContent = initialsFromName(userName);
                parent.appendChild(div);
              }
            }}
          />
        </button>

        <Button variant="outline-danger" size="sm" onClick={handleLogout}>
          {ui.logout}
        </Button>
      </div>
    );
  };

  const AuthAreaMobile = ({ onAnyClick }) => {
    if (loading) return null;

    if (!isLoggedIn) {
      return (
        <div className="d-grid gap-2">
          <button
            className="nav-dd-btn nav-dd-btn-ghost"
            type="button"
            onClick={() => {
              onAnyClick?.();
              navigate("/login");
            }}
          >
            {ui.login}
          </button>

          <button
            className="nav-dd-btn nav-dd-btn-primary"
            type="button"
            onClick={() => {
              onAnyClick?.();
              navigate("/register");
            }}
          >
            {ui.register}
          </button>
        </div>
      );
    }

    return (
      <div className="d-grid gap-2">
        <button
          className="nav-dd-btn nav-dd-btn-ghost"
          type="button"
          onClick={() => {
            onAnyClick?.();
            navigate("/profile");
          }}
        >
          {ui.profileXp(xpBalance)}
        </button>

        <button
          className="nav-dd-btn nav-dd-btn-danger"
          type="button"
          onClick={() => {
            onAnyClick?.();
            handleLogout();
          }}
        >
          {ui.logout}
        </button>
      </div>
    );
  };

  // ✅ Study page: minimal navbar
  if (isStudyPage) {
    return (
      <Navbar
        ref={navbarRef}
        bg="dark"
        variant="dark"
        fixed="top"
        className={`navbar ${scrolled ? "navbar-shadow" : ""} nav-zfix`}
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

          <div className="ms-auto d-flex align-items-center gap-2">
            <LanguageSwitcher />
          </div>
        </Container>
      </Navbar>
    );
  }

  return (
    <>
      <Navbar
        ref={navbarRef}
        bg="dark"
        variant="dark"
        fixed="top"
        expand="lg"
        className={`navbar ${scrolled ? "navbar-shadow" : ""} nav-zfix`}
      >
        <Container className="nav-shell nav-shell-wide">
          <Navbar.Brand
            as={Link}
            to={isLoggedIn ? "/dashboard" : "/"}
            className="d-flex align-items-center gap-2 logo-animate nav-brand"
          >
            <img src={Logo} alt="logo" className="nav-logo" />
            <span style={{ color: "aquamarine" }} className="logo-text">
              KhmerCodingHub
            </span>
          </Navbar.Brand>

          {/* Desktop nav */}
          <div className="nav-desktop d-none d-lg-flex">
            <Nav className="ms-auto d-flex align-items-center gap-3">
              <DesktopNavLinks />
              <AuthAreaDesktop />
              <LanguageSwitcher />
            </Nav>
          </div>

          {/* Mobile hamburger */}
          <div className="d-inline-flex d-lg-none ms-auto">
            <input
              type="checkbox"
              id="nav-hamburger-toggle"
              className="nav-hamburger-checkbox"
              checked={showMenu}
              onChange={toggleMenu}
              aria-hidden="true"
            />

            <label
              htmlFor="nav-hamburger-toggle"
              className="nav-hamburger-toggle"
              aria-label={showMenu ? "Close menu" : "Open menu"}
              title={showMenu ? "Close menu" : "Open menu"}
            >
              <div className="nav-hamburger-bars nav-hamburger-bar1" />
              <div className="nav-hamburger-bars nav-hamburger-bar2" />
              <div className="nav-hamburger-bars nav-hamburger-bar3" />
            </label>
          </div>
        </Container>
      </Navbar>

      {/* Mobile Dropdown */}
      {showMenu && (
        <>
          <div className="nav-dd-backdrop" onClick={closeMenu} />
          <div className="nav-dd-panel nav-dd-modern" role="dialog" aria-label="Mobile menu">
            <div className="nav-dd-inner nav-dd-inner-modern">
              <div className="nav-dd-head">
                <div className="nav-dd-head-left">
                  <div className="nav-dd-brandDot" />
                  <div className="nav-dd-head-title">{ui.menu}</div>
                </div>
              </div>

              <button
                type="button"
                className="nav-dd-userCard"
                onClick={() => {
                  closeMenu();
                  navigate("/profile");
                }}
                aria-label={ui.profile}
                disabled={!isLoggedIn}
                style={!isLoggedIn ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              >
                <span className="nav-dd-avatarWrap">
                  <img
                    className="nav-dd-avatar"
                    src={avatarSrc}
                    alt="avatar"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector(".nav-dd-avatarFallback")) {
                        const div = document.createElement("div");
                        div.className = "nav-dd-avatarFallback";
                        div.textContent = initialsFromName(userName);
                        parent.appendChild(div);
                      }
                    }}
                  />
                </span>

                <span className="nav-dd-userMeta">
                  <span className="nav-dd-userName">{userName || ui.student}</span>
                  <span className="nav-dd-userSub">XP {xpBalance}</span>
                </span>

                <span className="nav-dd-userChevron">›</span>
              </button>

              <div className="nav-dd-quick">
                <button
                  type="button"
                  className="nav-dd-chip"
                  onClick={() => {
                    closeMenu();
                    navigate(isLoggedIn ? "/dashboard" : "/");
                  }}
                >
                  🏠 Home
                </button>

                {isLoggedIn && (
                  <button
                    type="button"
                    className="nav-dd-chip"
                    onClick={() => {
                      closeMenu();
                      navigate("/shop");
                    }}
                  >
                    🛍️ Shop
                  </button>
                )}

                <button
                  type="button"
                  className="nav-dd-chip"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  ⬆️ Top
                </button>
              </div>

              <div className="nav-dd-section nav-dd-section-modern">
                <div className="nav-dd-section-title">Explore</div>
                <Nav className="flex-column gap-2">
                  <MobileNavLinks onAnyClick={closeMenu} />
                </Nav>
              </div>

              <div className="nav-dd-section nav-dd-section-modern">
                <div className="nav-dd-section-title">Language</div>
                <div className="nav-dd-langWrap">
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="nav-dd-section nav-dd-section-modern">
                <div className="nav-dd-section-title">Account</div>
                <AuthAreaMobile onAnyClick={closeMenu} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AppNavbar;
