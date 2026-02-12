import React from "react";

function Requests() {
  return (
    <div>
      <header className="page-heading compact-heading">
        <h2>Requests</h2>
        <p>Time-off and shift changes awaiting review.</p>
      </header>

      <section className="info-block">
        <h3>Pending Queue</h3>
        <div className="alert-list">
          <div className="alert-box alert-warning">
            <p>PTO request from Krishna for Friday, Nov 21</p>
          </div>
          <div className="alert-box alert-warning">
            <p>PTO request from Sami for Saturday, Nov 22</p>
          </div>
          <div className="alert-box alert-warning">
            <p>Shift swap request between Jordan and Alex</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Requests;
