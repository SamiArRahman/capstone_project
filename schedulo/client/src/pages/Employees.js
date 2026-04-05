import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function Employees({ user }) {
  var isManager = user && user.role === "manager";
  var [employees, setEmployees] = useState([]);
  var [availabilityAll, setAvailabilityAll] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");
  var [expandedAvailabilityId, setExpandedAvailabilityId] = useState(null);
  var [editingId, setEditingId] = useState(null);
  var [editName, setEditName] = useState("");
  var [editUsername, setEditUsername] = useState("");
  var [editEmail, setEditEmail] = useState("");
  var [editPassword, setEditPassword] = useState("");
  var [editMaxHours, setEditMaxHours] = useState(40);
  var [editSkills, setEditSkills] = useState("");
  var [showAddForm, setShowAddForm] = useState(false);
  var [addName, setAddName] = useState("");
  var [addUsername, setAddUsername] = useState("");
  var [addEmail, setAddEmail] = useState("");
  var [addPassword, setAddPassword] = useState("");
  var [addMaxHours, setAddMaxHours] = useState(40);
  var [addSkills, setAddSkills] = useState("");
  var [message, setMessage] = useState("");
  var [successNote, setSuccessNote] = useState("");

  function loadEmployees() {
    setLoading(true);
    setError("");
    apiFetch("/employees")
      .then(function (data) {
        if (Array.isArray(data)) setEmployees(data);
        else setEmployees([]);
      })
      .catch(function () { setError("Failed to load employees"); })
      .finally(function () { setLoading(false); });
  }

  function loadAvailabilityAll() {
    apiFetch("/availability/all")
      .then(function (data) {
        setAvailabilityAll(Array.isArray(data) ? data : []);
      });
  }

  useEffect(function () {
    loadEmployees();
    loadAvailabilityAll();
  }, []);

  function getAvailabilityForUser(userId) {
    for (var i = 0; i < availabilityAll.length; i++) {
      if (availabilityAll[i].userId === userId) return availabilityAll[i];
    }
    return null;
  }

  function handleEditClick(employee) {
    setEditingId(employee.id);
    setEditName(employee.name || "");
    setEditUsername(employee.username || "");
    setEditEmail(employee.email || "");
    setEditPassword("");
    setEditMaxHours(employee.maxHoursPerWeek != null ? employee.maxHoursPerWeek : 40);
    setEditSkills(Array.isArray(employee.skills) ? employee.skills.join(", ") : "");
    setMessage("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setMessage("");
  }

  function handleSaveEdit() {
    setMessage("");
    var body = {
      name: editName.trim(),
      username: editUsername.trim(),
      email: editEmail.trim(),
      maxHoursPerWeek: Number(editMaxHours) || 40
    };
    if (editPassword.trim() !== "") body.password = editPassword;
    var skillsStr = editSkills.trim();
    if (skillsStr) body.skills = skillsStr.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    apiFetch("/employees/" + editingId, {
      method: "PATCH",
      body: JSON.stringify(body)
    })
      .then(function (data) {
        if (data && data.id) {
          handleCancelEdit();
          loadEmployees();
        }
      })
      .catch(function (requestError) { setMessage(requestError.message || "Failed to save"); });
  }

  function handleDeleteClick(employee) {
    if (window.confirm("Delete " + (employee.name || employee.username) + "? This will also remove their shifts.") === false) return;
    apiFetch("/employees/" + employee.id, { method: "DELETE" })
      .then(function () { loadEmployees(); })
      .catch(function (requestError) { setError(requestError.message || "Failed to delete"); });
  }

  function handleAddClick() {
    setShowAddForm(true);
    setAddName("");
    setAddUsername("");
    setAddEmail("");
    setAddPassword("");
    setAddMaxHours(40);
    setAddSkills("");
    setMessage("");
    setSuccessNote("");
  }

  function handleAddSave() {
    setMessage("");
    setSuccessNote("");
    if (!addUsername.trim() || !addPassword) {
      setMessage("Username and password are required.");
      return;
    }
    if (addUsername.trim().length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }
    if (addPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    var nameToSend = addName.trim() || addUsername.trim();
    var payload = {
      username: addUsername.trim(),
      password: addPassword,
      name: nameToSend,
      email: addEmail.trim() || addUsername.trim(),
      maxHoursPerWeek: Number(addMaxHours) || 40
    };
    var skillsStr = addSkills.trim();
    if (skillsStr) payload.skills = skillsStr.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    apiFetch("/employees", {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(function (data) {
        if (data && data.id) {
          setMessage("");
          setSuccessNote("Employee added.");
          setShowAddForm(false);
          loadEmployees();
          loadAvailabilityAll();
        }
      })
      .catch(function (requestError) { setMessage(requestError.message || "Failed to add employee"); });
  }

  function handleAddCancel() {
    setShowAddForm(false);
    setMessage("");
    setSuccessNote("");
  }

  function getRoleDisplayName(role) {
    if (role === "manager") return "Manager";
    if (role === "employee") return "Server";
    return role;
  }

  function getCardColor(role) {
    if (role === "manager") return "blue";
    if (role === "employee") return "green";
    return "blue";
  }

  if (loading) {
    return (
      <div className="employees-page">
        <p className="form-message">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="employees-page">
      <header className="page-heading compact-heading employees-head-row">
        <div>
          <h2>Team Members</h2>
          <p>{isManager ? "Manage employee profiles, skills, and availability" : "View your team"}</p>
        </div>
        {isManager && (
          <button type="button" className="primary-button" onClick={handleAddClick}>
            + Add Employee
          </button>
        )}
      </header>

      {error && <p className="form-message error-text">{error}</p>}
      {successNote && (
        <p className="form-message" style={{ color: "var(--green)", fontWeight: 600 }}>
          {successNote}
        </p>
      )}

      {isManager && showAddForm && (
        <section className="info-block" style={{ marginTop: 16 }}>
          <h3>New Employee</h3>
          <div className="employee-form-grid">
            <div>
              <label className="field-label">Name</label>
              <input className="field-input" placeholder="Display name" value={addName} onChange={function (e) { setAddName(e.target.value); }} />
            </div>
            <div>
              <label className="field-label">Username</label>
              <input className="field-input" placeholder="Login username" value={addUsername} onChange={function (e) { setAddUsername(e.target.value); }} />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="field-input" placeholder="email@example.com" value={addEmail} onChange={function (e) { setAddEmail(e.target.value); }} />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="Min 8 characters" value={addPassword} onChange={function (e) { setAddPassword(e.target.value); }} />
            </div>
            <div>
              <label className="field-label">Max hours/week</label>
              <input className="field-input" type="number" min="1" max="168" value={addMaxHours} onChange={function (e) { setAddMaxHours(e.target.value); }} />
            </div>
            <div>
              <label className="field-label">Skills (comma-separated)</label>
              <input className="field-input" placeholder="e.g. POS, Customer Service" value={addSkills} onChange={function (e) { setAddSkills(e.target.value); }} />
            </div>
          </div>
          {message && <p className="form-message error-text">{message}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" className="primary-button" onClick={handleAddSave}>Save</button>
            <button type="button" className="ghost-button" onClick={handleAddCancel}>Cancel</button>
          </div>
        </section>
      )}

      <section className="employee-grid" style={{ marginTop: 16 }}>
        {employees.map(function (emp) {
          var isEditing = editingId === emp.id;
          var cardClass = "employee-card employee-card-" + getCardColor(emp.role);
          var avail = getAvailabilityForUser(emp.id);
          var availDays = (avail && avail.days) ? avail.days : [];
          var availCount = availDays.length;
          var isExpanded = expandedAvailabilityId === emp.id;
          return (
            <article key={emp.id} className={cardClass}>
              {isManager && isEditing ? (
                <div className="employee-edit-form">
                  <label className="field-label">Name</label>
                  <input className="field-input" value={editName} onChange={function (e) { setEditName(e.target.value); }} />
                  <label className="field-label">Username</label>
                  <input className="field-input" value={editUsername} onChange={function (e) { setEditUsername(e.target.value); }} />
                  <label className="field-label">Email</label>
                  <input className="field-input" value={editEmail} onChange={function (e) { setEditEmail(e.target.value); }} />
                  <label className="field-label">Max hours/week</label>
                  <input className="field-input" type="number" min="1" max="168" value={editMaxHours} onChange={function (e) { setEditMaxHours(e.target.value); }} />
                  <label className="field-label">Skills (comma-separated)</label>
                  <input className="field-input" value={editSkills} onChange={function (e) { setEditSkills(e.target.value); }} />
                  <label className="field-label">New password (leave blank to keep)</label>
                  <input className="field-input" type="password" placeholder="Optional" value={editPassword} onChange={function (e) { setEditPassword(e.target.value); }} />
                  {message && <p className="form-message error-text">{message}</p>}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button type="button" className="primary-button" onClick={handleSaveEdit}>Save</button>
                    <button type="button" className="ghost-button" onClick={handleCancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {isManager && (
                    <div className="employee-card-actions">
                      <button type="button" className="icon-action icon-action-edit" onClick={function () { handleEditClick(emp); }} title="Edit">Edit</button>
                      <button type="button" className="icon-action icon-action-delete" onClick={function () { handleDeleteClick(emp); }} title="Delete">Delete</button>
                    </div>
                  )}
                  <h3 className="employee-card-name">{emp.name || emp.username}</h3>
                  <p className="employee-email">{emp.email || emp.username}</p>
                  <p className="employee-role-badge">
                    <span className={"role-pill role-" + emp.role}>{getRoleDisplayName(emp.role)}</span>
                  </p>
                  <p className="employee-meta employee-max-hours">
                    <span className="meta-icon">Max {emp.maxHoursPerWeek != null ? emp.maxHoursPerWeek : 40}h/week</span>
                  </p>
                  {Array.isArray(emp.skills) && emp.skills.length > 0 && (
                    <div className="employee-skills">
                      {emp.skills.map(function (skill) {
                        return <span key={skill} className="skill-pill">{skill}</span>;
                      })}
                    </div>
                  )}
                  <div className="employee-availability-toggle">
                    <button
                      type="button"
                      className="availability-link"
                      onClick={function () { setExpandedAvailabilityId(isExpanded ? null : emp.id); }}
                    >
                      {isExpanded ? "Hide Availability (" + availCount + " days)" : "View Availability (" + availCount + " days)"}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="employee-availability-list">
                      {availCount === 0 ? (
                        <p className="form-message">No availability set.</p>
                      ) : (
                        <ul className="availability-day-list">
                          {availDays.map(function (day) {
                            var from = (avail && avail.timeFrom) ? avail.timeFrom : "09:00";
                            var to = (avail && avail.timeTo) ? avail.timeTo : "17:00";
                            return (
                              <li key={day}>{day}: {from} - {to}</li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </section>

      {employees.length === 0 && (
        <p className="form-message" style={{ marginTop: 16 }}>
          {isManager ? "No team members yet. Add an employee to get started." : "No team members to display."}
        </p>
      )}
    </div>
  );
}

export default Employees;
