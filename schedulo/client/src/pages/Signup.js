import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function Signup({ onAuthenticated }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const u = username.trim();
    const p = password;
    const c = confirmPassword;

    if (!u) {
      setError("Username is required.");
      return false;
    }
    if (u.length < 3) {
      setError("Username must be at least 3 characters.");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) {
      setError("Username can only contain letters, numbers, underscore and hyphen.");
      return false;
    }
    if (!p) {
      setError("Password is required.");
      return false;
    }
    if (p.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (p !== c) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const signup = (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setSubmitting(true);
    apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({
        username: username.trim(),
        password,
        name: name.trim() || username.trim()
      })
    })
      .then((data) => {
        onAuthenticated(data);
      })
      .catch((requestError) => setError(requestError.message || "Registration failed. Try again."))
      .finally(() => setSubmitting(false));
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") signup(e);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand-side">
          <p className="kicker">Schedulo</p>
          <h1>Workforce Scheduling, Simplified</h1>
          <p>Create an employee account to request PTO, swap shifts, and view your schedule.</p>
        </div>

        <div className="login-form-side">
          <h2>Sign up (Employee)</h2>

          <form onSubmit={signup}>
            <label className="field-label">Username</label>
            <input
              className="field-input"
              placeholder="e.g. jdoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="username"
            />

            <label className="field-label">Display name (optional)</label>
            <input
              className="field-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="name"
            />

            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="new-password"
            />

            <label className="field-label">Confirm password</label>
            <input
              className="field-input"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="new-password"
            />

            {error && <p className="form-message error-text">{error}</p>}

            <button type="submit" className="primary-button full-width" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="hint-text" style={{ marginTop: 16 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
