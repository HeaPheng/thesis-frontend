import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, ProgressBar } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [active, setActive] = useState("learning"); // learning | profile
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const ok = localStorage.getItem("isLoggedIn") === "true";
    if (!ok) navigate("/login");

    setEmail(localStorage.getItem("userEmail") || "student@example.com");
    setName(localStorage.getItem("userName") || "Student");
  }, [navigate]);

  const saveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    alert("Profile saved (localStorage).");
  };

  // demo stats (frontend only)
  const stats = useMemo(() => {
    return {
      enrolled: 0,
      completed: 0,
      streak: 0,
      xp: 0,
      progress: 0, // %
    };
  }, []);

  return (
    <div className="dash-page">
      <Container className="dash-container">
        {/* ====== COOL HERO HEADER (no browse/logout buttons) ====== */}
        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="dash-badge">
              <i className="bi bi-stars" /> Student Space
            </div>
            <h2 className="dash-title">Welcome back, {name} 👋</h2>
            <div className="dash-sub">
              Track your learning, practice coding, and level up your skills.
            </div>
          </div>

          <div className="dash-hero-right">
            <div className="dash-mini-card">
              <div className="dash-mini-top">
                <span className="dash-mini-label">XP</span>
                <span className="dash-mini-value">{stats.xp}</span>
              </div>
              <div className="dash-mini-bottom">Earn XP by finishing units</div>
            </div>

            <div className="dash-mini-card">
              <div className="dash-mini-top">
                <span className="dash-mini-label">Streak</span>
                <span className="dash-mini-value">{stats.streak}🔥</span>
              </div>
              <div className="dash-mini-bottom">Keep learning daily</div>
            </div>
          </div>
        </div>

        {/* ====== MAIN LAYOUT ====== */}
        <Row className="g-4">
          {/* LEFT MENU (no logout item) */}
          <Col lg={3}>
            <Card className="dash-card dash-menu">
              <button
                className={`dash-menu-item ${active === "learning" ? "active" : ""}`}
                onClick={() => setActive("learning")}
              >
                <i className="bi bi-journal-bookmark"></i>
                <span>My Learning</span>
              </button>

              <button
                className={`dash-menu-item ${active === "profile" ? "active" : ""}`}
                onClick={() => setActive("profile")}
              >
                <i className="bi bi-person-circle"></i>
                <span>Profile</span>
              </button>

              <div className="dash-menu-divider" />

              <div className="dash-menu-hint">
                <i className="bi bi-lock-fill" />
                Backend later will unlock: progress, enroll, certificates.
              </div>
            </Card>
          </Col>

          {/* RIGHT CONTENT */}
          <Col lg={9}>
            {active === "learning" ? (
              <Card className="dash-card dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <h4 className="dash-panel-title">My Learning</h4>
                    <div className="dash-muted">Your progress will appear here after backend.</div>
                  </div>
                  <div className="dash-chip">
                    <i className="bi bi-graph-up" /> Progress
                  </div>
                </div>

                <div className="dash-progress-box">
                  <div className="dash-progress-row">
                    <div className="dash-progress-label">Overall Progress</div>
                    <div className="dash-progress-value">{stats.progress}%</div>
                  </div>
                  <ProgressBar now={stats.progress} />
                </div>

                <Row className="g-3 mt-1">
                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-collection-play" />
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.enrolled}</div>
                        <div className="dash-stat-label">Enrolled Courses</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-check2-circle" />
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.completed}</div>
                        <div className="dash-stat-label">Completed Units</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-award" />
                      </div>
                      <div>
                        <div className="dash-stat-value">0</div>
                        <div className="dash-stat-label">Certificates</div>
                      </div>
                    </div>
                  </Col>
                </Row>

                <div className="dash-empty mt-4">
                  <div className="dash-empty-icon">
                    <i className="bi bi-rocket-takeoff"></i>
                  </div>
                  <div className="dash-empty-title">No course progress yet</div>
                  <div className="dash-empty-sub">
                    Once backend is connected, you’ll see your last lesson, locked units (50% QCM rule),
                    and continue button.
                  </div>

                  {/* ✅ Keep one simple CTA that doesn't feel like the old header buttons */}
                  <Button variant="primary" onClick={() => navigate("/courses")}>
                    Explore Courses
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="dash-card dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <h4 className="dash-panel-title">Profile</h4>
                    <div className="dash-muted">Update your info (frontend demo)</div>
                  </div>
                  <div className="dash-chip">
                    <i className="bi bi-person-badge" /> Account
                  </div>
                </div>

                <Form onSubmit={saveProfile} className="dash-form mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label className="dash-label">Full Name</Form.Label>
                    <Form.Control
                      className="dash-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="dash-label">Email</Form.Label>
                    <Form.Control
                      className="dash-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                    />
                  </Form.Group>

                  <div className="dash-form-actions">
                    <Button type="submit" variant="success">
                      Save Profile
                    </Button>
                  </div>
                </Form>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
