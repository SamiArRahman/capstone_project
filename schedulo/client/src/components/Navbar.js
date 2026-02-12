import React from "react";
import { Link } from "react-router-dom";

function Navbar({ user }) {
  return (
    <nav>
      <strong>Logged in as: {user.role}</strong> | 
      <a href="/">Dashboard</a> | 
      {user.role === "manager" && <a href="/scheduling">Scheduling</a>} | 
      <a href="/employees">Employees</a> | 
      <a href="/requests">Requests</a> | 
      {user.role === "manager" && <a href="/analytics">Analytics</a>}
    </nav>
  );
}


export default Navbar;
