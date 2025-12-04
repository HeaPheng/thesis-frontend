import React, { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // ✅ fake register success
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);

    navigate("/dashboard");
  };

  return (
    <div className="auth-wrapper">
      <Card className="auth-card">
        <h3 className="auth-title">Create Your Account ✨</h3>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3 auth-input">
            <i className="bi bi-person"></i>
            <Form.Control
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

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

          <Button className="auth-btn" variant="success" type="submit">
            Register
          </Button>
        </Form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </div>
  );
}
