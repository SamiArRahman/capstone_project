import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import NotificationBell from "./components/NotificationBell";
import Dashboard from "./pages/Dashboard";
import Scheduling from "./pages/Scheduling";
import Employees from "./pages/Employees";
import Requests from "./pages/Requests";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { apiFetch, clearSession, loadStoredSession, storeSession } from "./lib/api";

function App() {
  const [session, setSession] = useState(loadStoredSession());
  const user = session ? session.user : null;
  const sessionToken = session ? session.token : "";

  function handleAuthenticated(nextSession) {
    storeSession(nextSession);
    setSession(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    let mounted = true;
    apiFetch("/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    })
      .then((freshUser) => {
        if (!mounted) {
          return;
        }
        const nextSession = {
          token: sessionToken,
          user: freshUser
        };
        storeSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (mounted) {
          handleLogout();
        }
      });

    return () => {
      mounted = false;
    };
  }, [sessionToken]);

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Signup onAuthenticated={handleAuthenticated} />} />
          <Route path="/login" element={<Login onAuthenticated={handleAuthenticated} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const managerView = user.role === "manager";

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="top-header">
          <div>
            <h1 className="brand-title">Schedulo</h1>
            <p className="brand-subtitle">Intelligent Workforce Management System</p>
          </div>

          <div className="profile-area">
            <span className="view-pill">{managerView ? "Manager View" : "Employee View"}</span>
            <span className="profile-name">{user.name || user.username}</span>
            <NotificationBell user={user} />
            <button className="ghost-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-content">
          <Navbar user={user} />

          <section className="page-panel">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />

              <Route path="/scheduling" element={<Scheduling user={user} />} />

              <Route path="/employees" element={<Employees user={user} />} />
              <Route path="/requests" element={<Requests user={user} />} />

              {managerView && <Route path="/analytics" element={<Analytics />} />}

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </section>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
