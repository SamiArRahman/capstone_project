import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000/api";

const formatDate = value => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const formatDateTime = value => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

function Requests({ user }) {
  const [activeRequestView, setActiveRequestView] = useState("pto");
  const [ptoRequests, setPtoRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPtoForm, setShowPtoForm] = useState(false);
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ptoForm, setPtoForm] = useState({
    employee: user?.name || user?.username || "",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const [swapForm, setSwapForm] = useState({
    fromEmployee: user?.name || user?.username || "",
    toEmployee: "",
    date: "",
    role: "Server",
    time: "11:00 - 19:00",
    reason: ""
  });

  const isManager = user?.role === "manager";

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [ptoResponse, swapResponse] = await Promise.all([
        fetch(`${API_BASE}/requests/pto?status=pending`),
        fetch(`${API_BASE}/requests/swaps?status=pending`)
      ]);

      const [ptoData, swapData] = await Promise.all([ptoResponse.json(), swapResponse.json()]);

      if (!ptoResponse.ok) {
        throw new Error(ptoData.error || "Failed loading PTO requests");
      }

      if (!swapResponse.ok) {
        throw new Error(swapData.error || "Failed loading swap requests");
      }

      setPtoRequests(Array.isArray(ptoData) ? ptoData : []);
      setSwapRequests(Array.isArray(swapData) ? swapData : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const submitPtoRequest = async () => {
    if (!ptoForm.employee.trim() || !ptoForm.startDate || !ptoForm.endDate || !ptoForm.reason.trim()) {
      setError("Fill employee, date range, and reason before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE}/requests/pto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee: ptoForm.employee.trim(),
          startDate: ptoForm.startDate,
          endDate: ptoForm.endDate,
          reason: ptoForm.reason.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create PTO request");
      }

      setShowPtoForm(false);
      setPtoForm({
        employee: user?.name || user?.username || "",
        startDate: "",
        endDate: "",
        reason: ""
      });
      await loadPendingRequests();
    } catch (submitError) {
      setError(submitError.message || "Failed to create PTO request");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSwapRequest = async () => {
    if (
      !swapForm.fromEmployee.trim() ||
      !swapForm.toEmployee.trim() ||
      !swapForm.date ||
      !swapForm.role.trim() ||
      !swapForm.time.trim() ||
      !swapForm.reason.trim()
    ) {
      setError("Fill all shift swap request fields before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE}/requests/swaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmployee: swapForm.fromEmployee.trim(),
          toEmployee: swapForm.toEmployee.trim(),
          date: swapForm.date,
          role: swapForm.role.trim(),
          time: swapForm.time.trim(),
          reason: swapForm.reason.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create shift swap request");
      }

      setShowSwapForm(false);
      setSwapForm({
        fromEmployee: user?.name || user?.username || "",
        toEmployee: "",
        date: "",
        role: "Server",
        time: "11:00 - 19:00",
        reason: ""
      });
      await loadPendingRequests();
    } catch (submitError) {
      setError(submitError.message || "Failed to create shift swap request");
    } finally {
      setSubmitting(false);
    }
  };

  const updatePtoStatus = async (id, status) => {
    try {
      setError("");
      const response = await fetch(`${API_BASE}/requests/pto/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed updating PTO request");
      }

      await loadPendingRequests();
    } catch (updateError) {
      setError(updateError.message || "Failed updating PTO request");
    }
  };

  const updateSwapStatus = async (id, status) => {
    try {
      setError("");
      const response = await fetch(`${API_BASE}/requests/swaps/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed updating shift swap request");
      }

      await loadPendingRequests();
    } catch (updateError) {
      setError(updateError.message || "Failed updating shift swap request");
    }
  };

  const renderPtoView = () => (
    <>
      <header className="compact-section-head">
        <div>
          <h3>PTO Requests</h3>
          <p>Manage time-off requests with conflict detection</p>
        </div>

        <button className="primary-button" onClick={() => setShowPtoForm(current => !current)}>
          {showPtoForm ? "Close" : "New Request"}
        </button>
      </header>

      {showPtoForm && (
        <section className="info-block">
          <h3>Create PTO Request</h3>

          <div className="request-form-grid">
            <input
              className="field-input"
              placeholder="Employee"
              value={ptoForm.employee}
              onChange={event => setPtoForm({ ...ptoForm, employee: event.target.value })}
            />

            <input
              className="field-input"
              type="date"
              value={ptoForm.startDate}
              onChange={event => setPtoForm({ ...ptoForm, startDate: event.target.value })}
            />

            <input
              className="field-input"
              type="date"
              value={ptoForm.endDate}
              onChange={event => setPtoForm({ ...ptoForm, endDate: event.target.value })}
            />

            <input
              className="field-input request-reason-input"
              placeholder="Reason"
              value={ptoForm.reason}
              onChange={event => setPtoForm({ ...ptoForm, reason: event.target.value })}
            />
          </div>

          <button className="primary-button request-submit-button" onClick={submitPtoRequest} disabled={submitting}>
            {submitting ? "Saving..." : "Submit PTO Request"}
          </button>
        </section>
      )}

      <section className="info-block">
        <h3>Pending Requests ({ptoRequests.length})</h3>

        <div className="request-list">
          {ptoRequests.length === 0 && <p className="empty-state">No pending PTO requests.</p>}

          {ptoRequests.map(request => (
            <article key={request.id} className="request-card">
              <div className="request-card-top">
                <div>
                  <p className="request-title">{request.employee}</p>
                  <p className="request-subline">
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </p>
                  <p className="request-time">Requested {formatDateTime(request.requestedAt)}</p>
                </div>

                {isManager && (
                  <div className="request-actions">
                    <button className="request-action-approve" onClick={() => updatePtoStatus(request.id, "approved")}>
                      Approve
                    </button>
                    <button className="request-action-deny" onClick={() => updatePtoStatus(request.id, "denied")}>
                      Deny
                    </button>
                  </div>
                )}
              </div>

              <p className="request-reason">Reason: {request.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const renderSwapView = () => (
    <>
      <header className="compact-section-head">
        <div>
          <h3>Shift Swap Requests</h3>
          <p>Manage shift exchange requests between employees</p>
        </div>

        <button className="primary-button" onClick={() => setShowSwapForm(current => !current)}>
          {showSwapForm ? "Close" : "New Swap Request"}
        </button>
      </header>

      {showSwapForm && (
        <section className="info-block">
          <h3>Create Shift Swap Request</h3>

          <div className="request-form-grid">
            <input
              className="field-input"
              placeholder="From Employee"
              value={swapForm.fromEmployee}
              onChange={event => setSwapForm({ ...swapForm, fromEmployee: event.target.value })}
            />

            <input
              className="field-input"
              placeholder="To Employee"
              value={swapForm.toEmployee}
              onChange={event => setSwapForm({ ...swapForm, toEmployee: event.target.value })}
            />

            <input
              className="field-input"
              type="date"
              value={swapForm.date}
              onChange={event => setSwapForm({ ...swapForm, date: event.target.value })}
            />

            <input
              className="field-input"
              placeholder="Role"
              value={swapForm.role}
              onChange={event => setSwapForm({ ...swapForm, role: event.target.value })}
            />

            <input
              className="field-input"
              placeholder="Time (e.g. 11:00 - 19:00)"
              value={swapForm.time}
              onChange={event => setSwapForm({ ...swapForm, time: event.target.value })}
            />

            <input
              className="field-input request-reason-input"
              placeholder="Reason"
              value={swapForm.reason}
              onChange={event => setSwapForm({ ...swapForm, reason: event.target.value })}
            />
          </div>

          <button className="primary-button request-submit-button" onClick={submitSwapRequest} disabled={submitting}>
            {submitting ? "Saving..." : "Submit Swap Request"}
          </button>
        </section>
      )}

      <section className="info-block">
        <h3>Pending Requests ({swapRequests.length})</h3>

        <div className="request-list">
          {swapRequests.length === 0 && <p className="empty-state">No pending shift swap requests.</p>}

          {swapRequests.map(request => (
            <article key={request.id} className="request-card">
              <div className="request-card-top">
                <div>
                  <p className="request-title">
                    {request.fromEmployee} &lt;&gt; {request.toEmployee}
                  </p>
                  <p className="request-subline">
                    {formatDate(request.date)} - {request.role} - {request.time}
                  </p>
                  <p className="request-time">Requested {formatDateTime(request.requestedAt)}</p>
                </div>

                {isManager && (
                  <div className="request-actions">
                    <button
                      className="request-action-approve"
                      onClick={() => updateSwapStatus(request.id, "approved")}
                    >
                      Approve
                    </button>
                    <button className="request-action-deny" onClick={() => updateSwapStatus(request.id, "denied")}>
                      Deny
                    </button>
                  </div>
                )}
              </div>

              <div className="swap-reason-pill">Reason: {request.reason}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className="requests-page">
      <header className="page-heading compact-heading">
        <h2>Requests</h2>
        <p>Manage PTO and shift swap requests with approval workflows</p>
      </header>

      <section className="mode-switch-bar requests-switch-bar">
        <button
          className={`mode-switch-button ${activeRequestView === "pto" ? "mode-switch-button-active" : ""}`}
          onClick={() => setActiveRequestView("pto")}
        >
          PTO Requests
          <span className="requests-inline-count">{ptoRequests.length}</span>
        </button>
        <button
          className={`mode-switch-button ${activeRequestView === "swap" ? "mode-switch-button-active" : ""}`}
          onClick={() => setActiveRequestView("swap")}
        >
          Shift Swaps
          <span className="requests-inline-count">{swapRequests.length}</span>
        </button>
      </section>

      {error && <p className="form-message error-text">{error}</p>}
      {loading ? <p className="form-message">Loading requests...</p> : null}
      {!loading && (activeRequestView === "pto" ? renderPtoView() : renderSwapView())}
    </div>
  );
}

export default Requests;
