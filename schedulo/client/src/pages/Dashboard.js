import React from "react";

function Dashboard({ user }) {
  const stats = [
    { label: "Total Employees", value: "5", tone: "blue" },
    { label: "Shifts This Week", value: "3", tone: "green" },
    { label: "Total Hours", value: "24.0", tone: "violet" },
    { label: "Pending Requests", value: "3", tone: "orange" }
  ];

  const coverageDays = [
    { day: "Mon, Nov 17", shifts: 0, employees: 0, hours: "0.0h" },
    { day: "Tue, Nov 18", shifts: 1, employees: 1, hours: "8.0h" },
    { day: "Wed, Nov 19", shifts: 1, employees: 1, hours: "8.0h" }
  ];

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <h2>{user.role === "manager" ? "Manager Dashboard" : "Employee Dashboard"}</h2>
        <p>Overview of scheduling and team metrics</p>
      </header>

      <div className="stats-grid">
        {stats.map(stat => (
          <article key={stat.label} className={`stat-card stat-${stat.tone}`}>
            <p>{stat.label}</p>
            <h3>{stat.value}</h3>
          </article>
        ))}
      </div>

      <section className="info-block">
        <h3>Action Required</h3>

        <div className="alert-list">
          <div className="alert-box alert-danger">
            <strong>Low Coverage Alert</strong>
            <p>6 day(s) have fewer than 2 employees scheduled this week.</p>
          </div>

          <div className="alert-box alert-warning">
            <p>2 PTO requests are awaiting manager approval.</p>
          </div>

          <div className="alert-box alert-warning">
            <p>1 shift swap request is awaiting manager approval.</p>
          </div>
        </div>
      </section>

      <section className="info-block">
        <h3>Daily Coverage - This Week</h3>

        <div className="coverage-list">
          {coverageDays.map(entry => (
            <div key={entry.day} className="coverage-row">
              <span>{entry.day}</span>
              <span>
                {entry.shifts} shifts - {entry.employees} employees - {entry.hours}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
