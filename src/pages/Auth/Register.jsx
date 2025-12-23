// src/pages/Auth/Register.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import api from "../../lib/api";
import { getEmailHistory, saveEmailToHistory } from "../../lib/emailHistory";

export default function Register() {
  const navigate = useNavigate();

  // ✅ email suggestions
  const [emailSuggestions, setEmailSuggestions] = useState(() => getEmailHistory());

  // ✅ language reactive
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
        title: "បង្កើតគណនីថ្មី ✨",
        subtitle: "ចុះឈ្មោះ ដើម្បីចាប់ផ្តើមរៀន",
        nameLabel: "ឈ្មោះពេញ",
        emailLabel: "អ៊ីមែល",
        passLabel: "ពាក្យសម្ងាត់",
        pass2Label: "បញ្ជាក់ពាក្យសម្ងាត់",
        creating: "កំពុងបង្កើត…",
        register: "ចុះឈ្មោះ",
        fillAll: "សូមបំពេញព័ត៌មានទាំងអស់។",
        passNoMatch: "ពាក្យសម្ងាត់បញ្ជាក់មិនត្រូវគ្នា។",
        failed: "ចុះឈ្មោះមិនបានជោគជ័យ",
        haveAcc: "មានគណនីរួចហើយ?",
        login: "ចូលគណនី",
        rightTitle: "Start learning today",
        rightDesc: "Create your account to access courses, quizzes, and coding practice.",
      };
    }
    return {
      title: "Create Your Account ✨",
      subtitle: "Register to start learning",
      nameLabel: "Full Name",
      emailLabel: "Email Address",
      passLabel: "Password",
      pass2Label: "Confirm Password",
      creating: "Creating...",
      register: "Register",
      fillAll: "Please fill in all fields.",
      passNoMatch: "Password confirmation does not match.",
      failed: "Register failed",
      haveAcc: "Already have an account?",
      login: "Login",
      rightTitle: "Start learning today",
      rightDesc: "Create your account to access courses, quizzes, and coding practice.",
    };
  }, [lang]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !passwordConfirm) {
      setError(ui.fillAll);
      return;
    }
    if (password !== passwordConfirm) {
      setError(ui.passNoMatch);
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirm,
      });

      // ✅ store auth
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userName", data.user?.name || name);
      localStorage.setItem("userEmail", data.user?.email || email);

      // ✅ save history + refresh suggestions
      const usedEmail = (data.user?.email || email || "").trim();
      saveEmailToHistory(usedEmail);
      setEmailSuggestions(getEmailHistory());

      window.dispatchEvent(new Event("auth-changed"));
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        ui.failed;
      setError(msg);

      // ✅ save typed email even if failed
      saveEmailToHistory(email);
      setEmailSuggestions(getEmailHistory());
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ SWAPPED STYLE: register uses "login" page styling (merged layout)
    <div className="auth-shell auth-aurora auth-page login">
      <div className="auth-bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <Card className="auth-merge">
        {/* LEFT = REGISTER FORM (fancy layout) */}
        <section className="auth-merge-left">
          <div className="auth-head">
            <div className="auth-chip">Create account</div>
            <h3 className="auth-title">{ui.title}</h3>
            <p className="auth-subtitle">{ui.subtitle}</p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-3 auth-alert auth-alert--danger">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleRegister} className="auth-form">
            {/* Name */}
            <div className="auth-field">
              <i className="bi bi-person auth-ico" />
              <Form.Control
                className="auth-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder=" "
                autoComplete="name"
              />
              <label className="auth-label">{ui.nameLabel}</label>
            </div>

            {/* Email */}
            <div className="auth-field">
              <i className="bi bi-envelope auth-ico" />
              <Form.Control
                className="auth-control"
                type="email"
                value={email}
                list="email-suggestions"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                placeholder=" "
              />
              <label className="auth-label">{ui.emailLabel}</label>

              <datalist id="email-suggestions">
                {emailSuggestions.map((em) => (
                  <option key={em} value={em} />
                ))}
              </datalist>
            </div>

            {/* Password */}
            <div className="auth-field">
              <i className="bi bi-lock auth-ico" />
              <Form.Control
                className="auth-control"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder=" "
                autoComplete="new-password"
              />
              <label className="auth-label">{ui.passLabel}</label>

              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw((s) => !s)}
                disabled={loading}
                aria-label="toggle password"
              >
                <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <i className="bi bi-lock-fill auth-ico" />
              <Form.Control
                className="auth-control"
                type={showPw2 ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                placeholder=" "
                autoComplete="new-password"
              />
              <label className="auth-label">{ui.pass2Label}</label>

              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw2((s) => !s)}
                disabled={loading}
                aria-label="toggle password confirm"
              >
                <i className={`bi ${showPw2 ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>

            <Button className="auth-btn-pro" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {ui.creating}
                </>
              ) : (
                <>
                  {ui.register} <i className="bi bi-arrow-right ms-2" />
                </>
              )}
              <span className="btn-shine" aria-hidden="true" />
            </Button>

            <p className="auth-footer">
              {ui.haveAcc} <Link to="/login">{ui.login}</Link>
            </p>
          </Form>
        </section>

        {/* RIGHT = INFO */}
        <section className="auth-merge-right">
          <h2 className="right-title">{ui.rightTitle}</h2>
          <p className="right-desc">{ui.rightDesc}</p>

          <div className="right-list">
            <div className="right-item">
              <span className="ri">🚀</span>
              <div>
                <b>Quick start</b>
                <div className="muted">Create account in seconds</div>
              </div>
            </div>
            <div className="right-item">
              <span className="ri">📈</span>
              <div>
                <b>Track progress</b>
                <div className="muted">Dashboard updates automatically</div>
              </div>
            </div>
            <div className="right-item">
              <span className="ri">🧩</span>
              <div>
                <b>Practice</b>
                <div className="muted">Quizzes & coding exercises</div>
              </div>
            </div>
          </div>

          <div className="right-pills">
            <span className="pill">Secure</span>
            <span className="pill">Mobile-ready</span>
          </div>
        </section>
      </Card>
    </div>
  );
}
