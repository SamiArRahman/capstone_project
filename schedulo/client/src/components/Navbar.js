import React from "react";
import { NavLink } from "react-router-dom";

function Navbar({ user }) {
  const links = [
    { to: "/", label: "Dashboard", managerOnly: false },
    { to: "/scheduling", label: "Scheduling", managerOnly: true },
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
          {link.label === "Requests" && <span className="mini-badge">3</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navbar;
