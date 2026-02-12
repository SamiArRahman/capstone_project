import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Scheduling from "./pages/Scheduling";
import Employees from "./pages/Employees";
import Requests from "./pages/Requests";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Signup setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
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
            <span className="profile-name">{user.username}</span>
            <button className="ghost-button" onClick={() => setUser(null)}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-content">
          <Navbar user={user} />

          <section className="page-panel">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />

              {managerView && <Route path="/scheduling" element={<Scheduling />} />}

              <Route path="/employees" element={<Employees />} />
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
