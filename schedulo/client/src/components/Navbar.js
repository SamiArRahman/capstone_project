import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../lib/api";

function Navbar({ user }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        const results = await Promise.allSettled([
          apiFetch("/requests/summary"),
          apiFetch("/notifications/summary")
        ]);
        if (!mounted) {
          return;
        }
        const requestSummary = results[0] && results[0].status === "fulfilled" ? results[0].value : {};
        const notificationSummary = results[1] && results[1].status === "fulfilled" ? results[1].value : {};
        setPendingCount(Number((requestSummary || {}).pendingTotal) || 0);
        setNotificationCount(Number((notificationSummary || {}).unreadCount) || 0);
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
    { to: "/notifications", label: "Notifications", managerOnly: false },
    { to: "/profile", label: "Profile", managerOnly: false },
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
            `tab-link${isActive ? " tab-link-active" : ""}${link.label === "Requests" || link.label === "Notifications" ? " tab-link-with-badge" : ""}`
          }
        >
          <span>{link.label}</span>
          {link.label === "Requests" && pendingCount > 0 && <span className="mini-badge">{pendingCount}</span>}
          {link.label === "Notifications" && notificationCount > 0 && <span className="mini-badge">{notificationCount}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navbar;
