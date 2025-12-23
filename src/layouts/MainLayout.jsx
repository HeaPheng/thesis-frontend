import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FooterMini from "../components/FooterMini";
import RouteLoader from "../components/RouteLoader";
import ProgressSync from "../components/ProgressSync";

export default function MainLayout({ lang, setLang }) {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  useEffect(() => {
    const syncAuth = () =>
      setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  const useMiniFooter = useMemo(() => {
    if (!isLoggedIn) return false;
    const p = location.pathname;
    return (
      p.startsWith("/courses") ||
      p.startsWith("/careers") ||
      p.startsWith("/dashboard") ||
      p.startsWith("/profile") ||
      p.startsWith("/settings")
    );
  }, [isLoggedIn, location.pathname]);

  const [routePulse, setRoutePulse] = useState(false);
  useEffect(() => {
    setRoutePulse(true);
    const t = setTimeout(() => setRoutePulse(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const loaderLabel = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/courses")) return "Loading courses...";
    if (p.startsWith("/careers")) return "Loading careers...";
    if (p.startsWith("/tutorials")) return "Loading tips...";
    if (p.startsWith("/dashboard")) return "Loading dashboard...";
    return "Loading...";
  }, [location.pathname]);

  return (
    <div className={`${lang === "en" ? "font-en" : "font-kh"} app-shell`}>
      {/* ✅ MUST be inside return */}
      {isLoggedIn && <ProgressSync />}

      <Navbar lang={lang} setLang={setLang} />

      <main className="app-main">
        <Outlet />
      </main>

      {useMiniFooter ? <FooterMini /> : <Footer />}

      <RouteLoader show={routePulse} label={loaderLabel} />
    </div>
  );
}
