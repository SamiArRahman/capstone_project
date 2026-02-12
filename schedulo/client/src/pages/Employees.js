import React from "react";

const TEAM_MEMBERS = [
  {
    name: "Sami",
    email: "sami@gmail.com",
    role: "Manager",
    maxHours: "40h/week",
    skills: ["Leadership", "Customer Service", "POS"],
    availability: "5 days",
    tone: "blue"
  },
  {
    name: "Krishna",
    email: "krishna@gmail.com",
    role: "Server",
    maxHours: "35h/week",
    skills: ["Customer Service", "POS", "Food Handling"],
    availability: "5 days",
    tone: "green"
  },
  {
    name: "Damon",
    email: "damon@gmail.com",
    role: "Server",
    maxHours: "30h/week",
    skills: ["Customer Service", "POS"],
    availability: "5 days",
    tone: "orange"
  },
  {
    name: "Tigran",
    email: "tigran@gmail.com",
    role: "Cook",
    maxHours: "40h/week",
    skills: ["Cooking", "Food Handling", "Kitchen Management"],
    availability: "6 days",
    tone: "red"
  },
  {
    name: "Karim",
    email: "karim@gmail.com",
    role: "Cook",
    maxHours: "40h/week",
    skills: ["Cooking", "Food Handling", "Kitchen Management"],
    availability: "6 days",
    tone: "red"
  }
];

function Employees() {
  return (
    <div className="employees-page">
      <header className="page-heading compact-heading employees-head-row">
        <div>
          <h2>Team Members</h2>
          <p>Manage employee profiles, skills, and availability</p>
        </div>

        <button className="primary-button">Add Employee</button>
      </header>

      <section className="employee-grid">
        {TEAM_MEMBERS.map(member => (
          <article key={member.email} className={`employee-card employee-card-${member.tone}`}>
            <div className="employee-card-actions">
              <button className="icon-action icon-action-edit">Edit</button>
              <button className="icon-action icon-action-delete">Delete</button>
            </div>

            <h3>{member.name}</h3>
            <p className="employee-email">{member.email}</p>

            <p className="employee-meta">Role: {member.role}</p>
            <p className="employee-meta">Max {member.maxHours}</p>

            <div className="employee-skills">
              {member.skills.map(skill => (
                <span key={skill} className="employee-skill-chip">
                  {skill}
                </span>
              ))}
            </div>

            <button className="availability-link">View Availability ({member.availability})</button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default Employees;
