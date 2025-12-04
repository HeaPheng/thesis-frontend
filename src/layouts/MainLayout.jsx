import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FooterMini from "../components/FooterMini";

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

        // pages that should use the small footer when logged in
        return (
            p.startsWith("/courses") ||
            p.startsWith("/careers") ||
            p.startsWith("/dashboard") ||
            p.startsWith("/profile") ||
            p.startsWith("/settings")
        );
    }, [isLoggedIn, location.pathname]);

    return (
        <div className={lang === "en" ? "font-en" : "font-kh"}>
            <Navbar lang={lang} setLang={setLang} />
            <Outlet />
            {useMiniFooter ? <FooterMini /> : <Footer />}
        </div>
    );
}
