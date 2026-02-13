import React, { useEffect, useState } from "react";

function Employees({ user }) {
  var isManager = user && user.role === "manager";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [message, setMessage] = useState("");

  function loadEmployees() {
    setLoading(true);
    setError("");
    fetch("http://localhost:4000/api/employees")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          setEmployees([]);
        }
      })
      .catch(function () {
        setError("Failed to load employees");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  useEffect(function () {
    loadEmployees();
  }, []);

  function handleEditClick(employee) {
    setEditingId(employee.id);
    setEditName(employee.name || "");
    setEditUsername(employee.username || "");
    setEditPassword("");
    setMessage("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditUsername("");
    setEditPassword("");
    setMessage("");
  }

  function handleSaveEdit() {
    setMessage("");
    var body = {
      name: editName.trim(),
      username: editUsername.trim()
    };
    if (editPassword.trim() !== "") {
      body.password = editPassword;
    }
    fetch("http://localhost:4000/api/employees/" + editingId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.error) {
          setMessage(data.error);
        } else {
          handleCancelEdit();
          loadEmployees();
        }
      })
      .catch(function () {
        setMessage("Failed to save");
      });
  }

  function handleDeleteClick(employee) {
    var confirmMessage = "Delete " + employee.name + " (" + employee.username + ")? This will also remove their shifts.";
    if (window.confirm(confirmMessage) === false) {
      return;
    }
    fetch("http://localhost:4000/api/employees/" + employee.id, {
      method: "DELETE"
    })
      .then(function (response) {
        if (response.ok) {
          loadEmployees();
        } else {
          return response.json();
        }
      })
      .then(function (data) {
        if (data && data.error) {
          setError(data.error);
        }
      })
      .catch(function () {
        setError("Failed to delete");
      });
  }

  function handleAddClick() {
    setShowAddForm(true);
    setAddName("");
    setAddUsername("");
    setAddPassword("");
    setMessage("");
  }

  function handleAddSave() {
    setMessage("");
    if (addUsername.trim() === "" || addPassword === "") {
      setMessage("Username and password are required.");
      return;
    }
    if (addUsername.trim().length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }
    if (addPassword.length < 4) {
      setMessage("Password must be at least 4 characters.");
      return;
    }
    var nameToSend = addName.trim();
    if (nameToSend === "") {
      nameToSend = addUsername.trim();
    }
    fetch("http://localhost:4000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: addUsername.trim(),
        password: addPassword,
        name: nameToSend
      })
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.error) {
          setMessage(data.error);
        } else {
          setShowAddForm(false);
          setAddName("");
          setAddUsername("");
          setAddPassword("");
          loadEmployees();
        }
      })
      .catch(function () {
        setMessage("Failed to add employee");
      });
  }

  function handleAddCancel() {
    setShowAddForm(false);
    setMessage("");
  }

  function getRoleLabel(role) {
    if (role === "manager") return "Manager";
    if (role === "employee") return "Employee";
    return role;
  }

  function getCardColor(role) {
    if (role === "manager") return "blue";
    if (role === "employee") return "green";
    return "blue";
  }

  if (loading === true) {
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
          <p>{isManager ? "Manage employee profiles and roles" : "View your team"}</p>
        </div>
        {isManager && (
          <button type="button" className="primary-button" onClick={handleAddClick}>
            Add Employee
          </button>
        )}
      </header>

      {error && <p className="form-message error-text">{error}</p>}

      {isManager && showAddForm && (
        <section className="info-block" style={{ marginTop: 16 }}>
          <h3>New Employee</h3>
          <div className="employee-form-grid">
            <div>
              <label className="field-label">Name</label>
              <input
                className="field-input"
                placeholder="Display name"
                value={addName}
                onChange={function (e) {
                  setAddName(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="field-label">Username</label>
              <input
                className="field-input"
                placeholder="Login username"
                value={addUsername}
                onChange={function (e) {
                  setAddUsername(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="Min 4 characters"
                value={addPassword}
                onChange={function (e) {
                  setAddPassword(e.target.value);
                }}
              />
            </div>
          </div>
          {message && <p className="form-message error-text">{message}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" className="primary-button" onClick={handleAddSave}>
              Save
            </button>
            <button type="button" className="ghost-button" onClick={handleAddCancel}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="employee-grid" style={{ marginTop: 16 }}>
        {employees.map(function (emp) {
          var isEditing = editingId === emp.id;
          var cardClass = "employee-card employee-card-" + getCardColor(emp.role);
          return (
            <article key={emp.id} className={cardClass}>
              {isManager && isEditing ? (
                <div className="employee-edit-form">
                  <label className="field-label">Name</label>
                  <input
                    className="field-input"
                    value={editName}
                    onChange={function (e) {
                      setEditName(e.target.value);
                    }}
                  />
                  <label className="field-label">Username</label>
                  <input
                    className="field-input"
                    value={editUsername}
                    onChange={function (e) {
                      setEditUsername(e.target.value);
                    }}
                  />
                  <label className="field-label">New password (leave blank to keep)</label>
                  <input
                    className="field-input"
                    type="password"
                    placeholder="Optional"
                    value={editPassword}
                    onChange={function (e) {
                      setEditPassword(e.target.value);
                    }}
                  />
                  {message && <p className="form-message error-text">{message}</p>}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button type="button" className="primary-button" onClick={handleSaveEdit}>
                      Save
                    </button>
                    <button type="button" className="ghost-button" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isManager && (
                    <div className="employee-card-actions">
                      <button
                        type="button"
                        className="icon-action icon-action-edit"
                        onClick={function () {
                          handleEditClick(emp);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="icon-action icon-action-delete"
                        onClick={function () {
                          handleDeleteClick(emp);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <h3>{emp.name || emp.username}</h3>
                  <p className="employee-email">{emp.username}</p>
                  <p className="employee-meta">Role: {getRoleLabel(emp.role)}</p>
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
