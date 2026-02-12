import React from "react";

function Employees() {
  return (
    <div>
      <header className="page-heading compact-heading">
        <h2>Employees</h2>
        <p>View and manage your team roster.</p>
      </header>

      <section className="info-block">
        <h3>Roster Snapshot</h3>
        <div className="coverage-list">
          <div className="coverage-row">
            <span>Krishna</span>
            <span>Full-time - 40h/week</span>
          </div>
          <div className="coverage-row">
            <span>Sami</span>
            <span>Full-time - 40h/week</span>
          </div>
          <div className="coverage-row">
            <span>Jordan</span>
            <span>Part-time - 24h/week</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Employees;
