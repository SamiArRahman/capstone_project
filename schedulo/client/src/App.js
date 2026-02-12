import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Scheduling from "./pages/Scheduling";
import Employees from "./pages/Employees";
import Requests from "./pages/Requests";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";

function App() {

  const [user, setUser] = useState(null);

  if (!user) {
    return <Login setUser={setUser} />;
  }

  return (
    <BrowserRouter>

      <Navbar user={user} />

      <Routes>

        <Route path="/" element={<Dashboard />} />

        {user.role === "manager" && (
          <Route path="/scheduling" element={<Scheduling />} />
        )}

        <Route path="/employees" element={<Employees />} />
        <Route path="/requests" element={<Requests />} />

        {user.role === "manager" && (
          <Route path="/analytics" element={<Analytics />} />
        )}

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
