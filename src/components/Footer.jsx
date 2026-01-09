import React from "react";
import "./Footer.css";
import logo from "../assets/images/logo.png";
import { Link, useLocation } from "react-router-dom";




const Footer = () => {
    const location = useLocation();
    const isLessonPage = location.pathname.includes("/lesson/")||
    location.pathname.includes("/coding") ||
    location.pathname.includes("/qcm")||
    location.pathname.includes("/dashboard")||
    location.pathname.includes("/my-learning")||
    location.pathname.includes("/register")||
    location.pathname.includes("/login")||
    location.pathname.includes("/my-items")||
    location.pathname.includes("/profile")||
    location.pathname.includes("/xp-history")||
    location.pathname.includes("/shop");
    // 🔥 HIDE FOOTER COMPLETELY ON LESSON PAGE
    if (isLessonPage) return null;

    return (
        <footer className="footer">
            <div className="footer-container">

                {/* BRAND */}
                <div className="footer-section footer-brand">
                    <img src={logo} alt="logo" className="footer-logo-big" />
                    <h3 className="footer-title">KhmerCodingHub</h3>
                </div>

                {/* QUICK LINKS */}
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <Link to="/">Home</Link>
                    <Link to="/courses">Courses</Link>
                    <Link to="/careers">Careers</Link>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                </div>

                {/* CONTACT */}
                <div className="footer-section">
                    <h4>Contact</h4>
                    <p><i className="bi bi-envelope"></i> phenggaming14@gmail.com</p>
                    <p><i className="bi bi-phone"></i> +855 86458980</p>
                    <p><i className="bi bi-geo-alt"></i> Phnom Penh, Cambodia</p>
                </div>

                {/* SOCIAL */}
                <div className="footer-section" style={{ marginLeft: "100px" }}>
                    <h4>Follow Us</h4>
                    <div className="footer-social">
                        <i className="bi bi-facebook"></i>
                        <i className="bi bi-youtube"></i>
                        <i className="bi bi-instagram"></i>
                        <i className="bi bi-github"></i>
                    </div>
                </div>

            </div>

            <div className="footer-bottom">
                © {new Date().getFullYear()} LearningApp. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
