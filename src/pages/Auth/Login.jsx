// src/pages/Auth/Login.jsx
import React, { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ where user wanted to go before redirecting to login
  const from = location.state?.from || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    // simple frontend demo validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // ✅ fake login success
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    window.dispatchEvent(new Event("auth-changed"));

    // optional: store name if you already have it from register later
    if (!localStorage.getItem("userName")) {
      localStorage.setItem("userName", "Student");
    }

    // ✅ go back to where they came from
    navigate(from, { replace: true });
  };

  return (
    <div className="auth-wrapper">
      <Card className="auth-card">
        <h3 className="auth-title">Welcome Back 👋</h3>

        {/* ✅ Optional: show redirect message */}
        {location.state?.from && !error && (
          <Alert variant="info" className="mb-3">
            Please login to continue.
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3 auth-input">
            <i className="bi bi-envelope"></i>
            <Form.Control
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3 auth-input">
            <i className="bi bi-lock"></i>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Button className="auth-btn" variant="primary" type="submit">
            Login
          </Button>
        </Form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </Card>
    </div>
  );
}
