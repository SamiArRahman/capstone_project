import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

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
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPtoForm, setShowPtoForm] = useState(false);
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ptoForm, setPtoForm] = useState({
    employeeId: user?.id || "",
    employee: user?.name || user?.username || "",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const [swapForm, setSwapForm] = useState({
    fromEmployeeId: user?.id || "",
    fromEmployee: user?.name || user?.username || "",
    toEmployeeId: "",
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

      const [ptoData, swapData] = await Promise.all([
        apiFetch("/requests/pto?status=pending"),
        apiFetch("/requests/swaps?status=pending")
      ]);

      setPtoRequests(Array.isArray(ptoData) ? ptoData : []);
      setSwapRequests(Array.isArray(swapData) ? swapData : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await apiFetch("/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setEmployees([]);
    }
  };

  useEffect(() => {
    loadPendingRequests();
    loadEmployees();
  }, []);

  const submitPtoRequest = async () => {
    if (!ptoForm.startDate || !ptoForm.endDate || !ptoForm.reason.trim()) {
      setError("Fill employee, date range, and reason before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await apiFetch("/requests/pto", {
        method: "POST",
        body: JSON.stringify({
          employeeId: isManager ? ptoForm.employeeId : user?.id,
          employee: isManager ? ptoForm.employee : user?.name || user?.username || "",
          startDate: ptoForm.startDate,
          endDate: ptoForm.endDate,
          reason: ptoForm.reason.trim()
        })
      });

      setShowPtoForm(false);
      setPtoForm({
        employeeId: user?.id || "",
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
      !swapForm.toEmployeeId ||
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

      await apiFetch("/requests/swaps", {
        method: "POST",
        body: JSON.stringify({
          fromEmployeeId: isManager ? swapForm.fromEmployeeId : user?.id,
          fromEmployee: isManager ? swapForm.fromEmployee : user?.name || user?.username || "",
          toEmployeeId: swapForm.toEmployeeId,
          toEmployee: swapForm.toEmployee,
          date: swapForm.date,
          role: swapForm.role.trim(),
          time: swapForm.time.trim(),
          reason: swapForm.reason.trim()
        })
      });

      setShowSwapForm(false);
      setSwapForm({
        fromEmployeeId: user?.id || "",
        fromEmployee: user?.name || user?.username || "",
        toEmployeeId: "",
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
      await apiFetch(`/requests/pto/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadPendingRequests();
    } catch (updateError) {
      setError(updateError.message || "Failed updating PTO request");
    }
  };

  const updateSwapStatus = async (id, status) => {
    try {
      setError("");
      await apiFetch(`/requests/swaps/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
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
            {isManager ? (
              <select
                className="field-input"
                value={ptoForm.employeeId}
                onChange={event => {
                  const selected = employees.find(entry => entry.id === event.target.value);
                  setPtoForm({
                    ...ptoForm,
                    employeeId: event.target.value,
                    employee: selected ? (selected.name || selected.username) : ""
                  });
                }}
              >
                <option value="">Select employee</option>
                {employees.map(entry => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name || entry.username}
                  </option>
                ))}
              </select>
            ) : (
              <input className="field-input" value={ptoForm.employee} readOnly />
            )}

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
            {isManager ? (
              <select
                className="field-input"
                value={swapForm.fromEmployeeId}
                onChange={event => {
                  const selected = employees.find(entry => entry.id === event.target.value);
                  setSwapForm({
                    ...swapForm,
                    fromEmployeeId: event.target.value,
                    fromEmployee: selected ? (selected.name || selected.username) : ""
                  });
                }}
              >
                <option value="">From employee</option>
                {employees.map(entry => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name || entry.username}
                  </option>
                ))}
              </select>
            ) : (
              <input className="field-input" value={swapForm.fromEmployee} readOnly />
            )}

            <select
              className="field-input"
              value={swapForm.toEmployeeId}
              onChange={event => {
                const selected = employees.find(entry => entry.id === event.target.value);
                setSwapForm({
                  ...swapForm,
                  toEmployeeId: event.target.value,
                  toEmployee: selected ? (selected.name || selected.username) : ""
                });
              }}
            >
              <option value="">To employee</option>
              {employees
                .filter(entry => entry.id !== (isManager ? swapForm.fromEmployeeId : user?.id))
                .map(entry => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name || entry.username}
                  </option>
                ))}
            </select>

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
