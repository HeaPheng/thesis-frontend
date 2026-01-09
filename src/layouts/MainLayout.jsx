import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FooterMini from "../components/FooterMini";
import RouteLoader from "../components/RouteLoader";
import ProgressSync from "../components/ProgressSync";

export default function MainLayout({ lang, setLang }) {
  const location = useLocation();

  // ✅ Use token as the single source of truth
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(!!localStorage.getItem("token"));

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  // ✅ Detect tips detail page (/tips/:slug)
  const isTipsDetail =
    location.pathname.startsWith("/tips/") &&
    location.pathname !== "/tips";

  const useMiniFooter = useMemo(() => {
    if (!isLoggedIn) return false;
    const p = location.pathname;

    return (
      p.startsWith("/course/") ||
      p.startsWith("/courses") ||
      p.startsWith("/careers") ||
      p.startsWith("/dashboard") ||
      p.startsWith("/profile") ||
      p.startsWith("/shop") ||
      p.startsWith("/my-items") ||
      p.startsWith("/leaderboard") ||
      p.startsWith("/xp-history") ||
      p.startsWith("/tips") ||
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
    if (p.startsWith("/tips")) return "Loading tips...";
    if (p.startsWith("/dashboard")) return "Loading dashboard...";
    return "Loading...";
  }, [location.pathname]);

  return (
    <div className={`${lang === "en" ? "font-en" : "font-kh"} app-shell`}>
      {isLoggedIn && <ProgressSync />}

      <Navbar lang={lang} setLang={setLang} />

      <main className="app-main">
        <Outlet />
      </main>

      {/* ✅ Footer logic */}
      {isLoggedIn ? (
        useMiniFooter ? <FooterMini /> : null
      ) : !isTipsDetail ? (
        <Footer />
      ) : null}

      <RouteLoader show={routePulse} label={loaderLabel} />
    </div>
  );
}
