import React, { useState } from "react";
import { Link } from "react-router-dom";

function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Enter username and password.");
      return;
    }

    fetch("http://localhost:4000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: cleanUsername,
        password: cleanPassword
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setError("");
          setUser(data);
        }
      });
  };

  const onKeyDown = event => {
    if (event.key === "Enter") {
      login();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand-side">
          <p className="kicker">Schedulo</p>
          <h1>Workforce Scheduling, Simplified</h1>
          <p>Sign in to manage shifts, requests, and team coverage in one place.</p>
        </div>

        <div className="login-form-side">
          <h2>Login</h2>

          <label className="field-label">Username</label>
          <input
            className="field-input"
            placeholder="manager"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <label className="field-label">Password</label>
          <input
            className="field-input"
            placeholder="1234"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
          />

          {error && <p className="form-message error-text">{error}</p>}

          <button className="primary-button full-width" onClick={login}>
            Sign In
          </button>

          <p className="hint-text">
            Demo: manager/1234 or employee/1234. No account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
