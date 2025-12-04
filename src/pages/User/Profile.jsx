import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import "./User.css";

export default function Profile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("userName") || "Student");
    setEmail(localStorage.getItem("userEmail") || "student@example.com");
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    alert("Profile saved (localStorage).");
  };

  return (
    <div className="user-page">
      <Container className="user-container">
        <div className="user-header">
          <h2 className="user-title">Profile</h2>
          <div className="user-sub">Update your account information</div>
        </div>

        <Row className="g-4">
          <Col lg={4}>
            <Card className="user-card user-side">
              <div className="user-avatar">
                <i className="bi bi-person"></i>
              </div>
              <div className="user-side-name">{name}</div>
              <div className="user-side-email">{email}</div>

              <div className="user-side-hint">
                Tip: backend later will store this in your database.
              </div>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="user-card user-panel">
              <h4 className="user-panel-title">Account details</h4>

              <Form onSubmit={handleSave}>
                <Form.Group className="mb-3">
                  <Form.Label className="user-label">Full name</Form.Label>
                  <Form.Control
                    className="user-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="user-label">Email</Form.Label>
                  <Form.Control
                    className="user-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                  />
                </Form.Group>

                <div className="user-actions">
                  <Button type="submit" variant="success">
                    Save
                  </Button>
                </div>
              </Form>
            </Card>

            <Card className="user-card user-panel mt-3">
              <h4 className="user-panel-title">Security (frontend demo)</h4>
              <div className="user-muted">
                We’ll add real password change when backend is ready.
              </div>

              <div className="user-actions mt-3">
                <Button variant="outline-light" disabled>
                  Change password (coming soon)
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
