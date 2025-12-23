// src/pages/Auth/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Auth.css";
import api from "../../lib/api";
import { getEmailHistory, saveEmailToHistory } from "../../lib/emailHistory";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  const [emailSuggestions, setEmailSuggestions] = useState(() => getEmailHistory());
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        title: "សូមស្វាគមន៍ 👋",
        subtitle: "ចូលគណនី ដើម្បីបន្តរៀន",
        mustLogin: "សូមចូលគណនី ដើម្បីបន្ត។",
        emailPh: "អ៊ីមែល",
        passPh: "ពាក្យសម្ងាត់",
        login: "ចូលគណនី",
        loggingIn: "កំពុងចូល…",
        needBoth: "សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ទាំងពីរ។",
        noAcc: "មិនទាន់មានគណនីទេ?",
        register: "ចុះឈ្មោះ",
        loginFailed: "ចូលគណនីមិនបានជោគជ័យ",
      };
    }
    return {
      title: "Welcome Back 👋",
      subtitle: "Login to continue learning",
      mustLogin: "Please login to continue.",
      emailPh: "Email Address",
      passPh: "Password",
      login: "Login",
      loggingIn: "Logging in...",
      needBoth: "Please enter both email and password.",
      noAcc: "Don't have an account?",
      register: "Register",
      loginFailed: "Login failed",
    };
  }, [lang]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill email
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u?.email) {
          setEmail(u.email);
          return;
        }
      }

      const legacyEmail = localStorage.getItem("userEmail");
      if (legacyEmail) {
        setEmail(legacyEmail);
        return;
      }

      const lastEmail = localStorage.getItem("last_email");
      if (lastEmail) setEmail(lastEmail);
    } catch {
      const lastEmail = localStorage.getItem("last_email");
      if (lastEmail) setEmail(lastEmail);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError(ui.needBoth);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", data.user?.email || email);
      localStorage.setItem("userName", data.user?.name || "Student");

      const usedEmail = (data.user?.email || email || "").trim();
      localStorage.setItem("last_email", usedEmail);

      saveEmailToHistory(usedEmail);
      setEmailSuggestions(getEmailHistory());

      window.dispatchEvent(new Event("auth-changed"));
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        ui.loginFailed;

      setError(msg);

      try {
        localStorage.setItem("last_email", email);
      } catch {}

      saveEmailToHistory(email);
      setEmailSuggestions(getEmailHistory());
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ SWAPPED STYLE: login uses "register" page styling (simple card)
    <div className="auth-shell auth-aurora auth-page register">
      <div className="auth-bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      {/* ✅ simple card style */}
      <Card className="auth-card-simple">
        <h3 className="auth-title">{ui.title}</h3>
        <p className="auth-subtitle" style={{ textAlign: "center" }}>
          {ui.subtitle}
        </p>

        {location.state?.from && !error && (
          <Alert variant="info" className="mb-3 auth-alert">
            {ui.mustLogin}
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-3 auth-alert auth-alert--danger">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleLogin}>
          {/* Email (register-style input with placeholder) */}
          <Form.Group className="mb-3 auth-input">
            <i className="bi bi-envelope"></i>
            <Form.Control
              type="email"
              placeholder={ui.emailPh}
              value={email}
              list="email-suggestions"
              onChange={(e) => {
                const v = e.target.value;
                setEmail(v);
                try {
                  localStorage.setItem("last_email", v);
                } catch {}
              }}
              disabled={loading}
              autoComplete="email"
            />
            <datalist id="email-suggestions">
              {emailSuggestions.map((em) => (
                <option key={em} value={em} />
              ))}
            </datalist>
          </Form.Group>

          {/* Password */}
          <Form.Group className="mb-3 auth-input">
            <i className="bi bi-lock"></i>
            <Form.Control
              type="password"
              placeholder={ui.passPh}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Group>

          <Button className="auth-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {ui.loggingIn}
              </>
            ) : (
              ui.login
            )}
            <span className="btn-shine" aria-hidden="true" />
          </Button>
        </Form>

        <p className="auth-footer">
          {ui.noAcc} <Link to="/register">{ui.register}</Link>
        </p>
      </Card>
    </div>
  );
}
