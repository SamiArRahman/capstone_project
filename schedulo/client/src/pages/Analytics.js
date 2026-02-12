import React from "react";

function Analytics() {
  return (
    <div>
      <header className="page-heading compact-heading">
        <h2>Analytics</h2>
        <p>Track utilization and staffing performance.</p>
      </header>

      <section className="info-block">
        <h3>Weekly Highlights</h3>
        <div className="coverage-list">
          <div className="coverage-row">
            <span>Average Hours per Employee</span>
            <span>24.0h</span>
          </div>
          <div className="coverage-row">
            <span>Coverage Compliance</span>
            <span>71%</span>
          </div>
          <div className="coverage-row">
            <span>Open Requests</span>
            <span>3</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
