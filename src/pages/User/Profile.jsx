import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import "./User.css";

function initialsFromName(n = "") {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

export default function Profile() {
  const navigate = useNavigate();

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
        title: "ប្រវត្តិរូប",
        sub: "កែប្រែព័ត៌មានគណនីរបស់អ្នក",
        home: "ទំព័រដើម",
        loading: "កំពុងផ្ទុកប្រវត្តិរូប…",
        loadFailed: "មិនអាចផ្ទុកប្រវត្តិរូបបានទេ។",

        sideHint: "ប្រវត្តិរូបរបស់អ្នកត្រូវបានរក្សាទុកក្នុងមូលដ្ឋានទិន្នន័យ (Sanctum)។",
        student: "សិស្ស",
        studentEmail: "student@example.com",

        accountDetails: "ព័ត៌មានគណនី",
        fullName: "ឈ្មោះពេញ",
        yourName: "ឈ្មោះរបស់អ្នក",
        email: "អ៊ីមែល",
        emailHint: "ការផ្លាស់ប្តូរអ៊ីមែលនឹងបន្ថែមពេលក្រោយ (មានការផ្ទៀងផ្ទាត់)។",

        save: "រក្សាទុក",
        saving: "កំពុងរក្សាទុក…",
        savedOk: "បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូប ✅",
        saveFailed: "មិនអាចធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបបានទេ។",

        security: "សុវត្ថិភាព",
        securitySub: "ប្តូរពាក្យសម្ងាត់ដោយសុវត្ថិភាព។",
        currentPass: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
        newPass: "ពាក្យសម្ងាត់ថ្មី",
        confirmNewPass: "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
        currentPassPh: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
        newPassPh: "ពាក្យសម្ងាត់ថ្មី",
        confirmNewPassPh: "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",

        passNoMatch: "ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់មិនត្រូវគ្នា។",
        passUpdated: "បានប្តូរពាក្យសម្ងាត់ ✅",
        passUpdateFailed: "មិនអាចប្តូរពាក្យសម្ងាត់បានទេ។",
        updating: "កំពុងធ្វើបច្ចុប្បន្នភាព…",
        updatePass: "ប្តូរពាក្យសម្ងាត់",
        validationErr: "កំហុសបញ្ជាក់។ សូមពិនិត្យព័ត៌មានដែលបានបញ្ចូល។",
      };
    }
    return {
      title: "Profile",
      sub: "Update your account information",
      home: "Home",
      loading: "Loading profile…",
      loadFailed: "Failed to load profile.",

      sideHint: "Your profile is saved in the database (Sanctum account).",
      student: "Student",
      studentEmail: "student@example.com",

      accountDetails: "Account details",
      fullName: "Full name",
      yourName: "Your name",
      email: "Email",
      emailHint: "Email change will be added later with verification.",

      save: "Save",
      saving: "Saving…",
      savedOk: "Profile updated ✅",
      saveFailed: "Failed to update profile.",

      security: "Security",
      securitySub: "Change your password securely.",
      currentPass: "Current password",
      newPass: "New password",
      confirmNewPass: "Confirm new password",
      currentPassPh: "Current password",
      newPassPh: "New password",
      confirmNewPassPh: "Confirm new password",

      passNoMatch: "New password and confirmation do not match.",
      passUpdated: "Password updated ✅",
      passUpdateFailed: "Failed to update password.",
      updating: "Updating…",
      updatePass: "Update password",
      validationErr: "Validation error. Please check inputs.",
    };
  }, [lang]);

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);
      setErr(null);

      try {
        const { data } = await api.get("/profile");
        if (!mounted) return;

        setName(data?.name || "");
        setEmail(data?.email || "");
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || ui.loadFailed);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ui.loadFailed]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    setSavingProfile(true);
    try {
      const { data } = await api.put("/profile", { name });
      setName(data?.user?.name ?? name);
      setEmail(data?.user?.email ?? email);
      setMsg(ui.savedOk);
    } catch (e) {
      setErr(e?.response?.data?.message || ui.saveFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (password !== passwordConfirmation) {
      setErr(ui.passNoMatch);
      return;
    }

    setSavingPassword(true);
    try {
      await api.put("/profile/password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });

      setMsg(ui.passUpdated);
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? ui.validationErr : ui.passUpdateFailed);
      setErr(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="user-page">
      <Container className="user-container">
        <div className="user-header d-flex align-items-start justify-content-between gap-3">
          <div>
            <h2 className="user-title">{ui.title}</h2>
            <div className="user-sub">{ui.sub}</div>
          </div>

          <Button variant="outline-primary" onClick={() => navigate("/dashboard")}>
            {ui.home}
          </Button>
        </div>

        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}

        {loading ? (
          <Card className="user-card user-panel">
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              <div>{ui.loading}</div>
            </div>
          </Card>
        ) : (
          <Row className="g-4">
            <Col lg={4}>
              <Card className="user-card user-side">
                <div className="user-avatar" aria-label="User avatar">
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 22,
                      background: "rgba(255,255,255,0.08)",
                    }}
                  >
                    {initialsFromName(name)}
                  </div>
                </div>

                <div className="user-side-name">{name || ui.student}</div>
                <div className="user-side-email">{email || ui.studentEmail}</div>

                <div className="user-side-hint">{ui.sideHint}</div>
              </Card>
            </Col>

            <Col lg={8}>
              <Card className="user-card user-panel">
                <h4 className="user-panel-title">{ui.accountDetails}</h4>

                <Form onSubmit={handleSave}>
                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.fullName}</Form.Label>
                    <Form.Control
                      className="user-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={ui.yourName}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.email}</Form.Label>
                    <Form.Control className="user-input" value={email} placeholder={ui.email} type="email" disabled />
                    <div className="user-muted mt-1">{ui.emailHint}</div>
                  </Form.Group>

                  <div className="user-actions">
                    <Button type="submit" variant="success" disabled={savingProfile}>
                      {savingProfile ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {ui.saving}
                        </>
                      ) : (
                        ui.save
                      )}
                    </Button>
                  </div>
                </Form>
              </Card>

              <Card className="user-card user-panel mt-3">
                <h4 className="user-panel-title">{ui.security}</h4>
                <div className="user-muted">{ui.securitySub}</div>

                <Form onSubmit={handleChangePassword} className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.currentPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={ui.currentPassPh}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.newPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={ui.newPassPh}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.confirmNewPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder={ui.confirmNewPassPh}
                    />
                  </Form.Group>

                  <div className="user-actions">
                    <Button type="submit" variant="outline-light" disabled={savingPassword}>
                      {savingPassword ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {ui.updating}
                        </>
                      ) : (
                        ui.updatePass
                      )}
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
}
