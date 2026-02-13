import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

function Navbar({ user }) {
  const [pendingCount, setPendingCount] = useState(3);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/requests/summary");
        const data = await response.json();

        if (!response.ok || !mounted) {
          return;
        }

        setPendingCount(Number(data.pendingTotal) || 0);
      } catch {
        // Ignore transient API/network errors for top nav badge.
      }
    };

    loadSummary();
    const intervalId = setInterval(loadSummary, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const links = [
    { to: "/", label: "Dashboard", managerOnly: false },
    { to: "/scheduling", label: "Scheduling", managerOnly: false },
    { to: "/employees", label: "Employees", managerOnly: false },
    { to: "/requests", label: "Requests", managerOnly: false },
    { to: "/analytics", label: "Analytics", managerOnly: true }
  ];

  const visibleLinks = links.filter(link => !link.managerOnly || user.role === "manager");

  return (
    <nav className="tab-nav">
      {visibleLinks.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `tab-link${isActive ? " tab-link-active" : ""}${link.label === "Requests" ? " tab-link-with-badge" : ""}`
          }
        >
          <span>{link.label}</span>
          {link.label === "Requests" && <span className="mini-badge">{pendingCount}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navbar;
