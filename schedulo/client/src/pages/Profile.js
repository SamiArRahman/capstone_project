import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function Profile({ user, onUserUpdated }) {
  const [name, setName] = useState(user && user.name ? user.name : "");
  const [email, setEmail] = useState(user && user.email ? user.email : "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user && user.name ? user.name : "");
    setEmail(user && user.email ? user.email : "");
  }, [user]);

  function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    apiFetch("/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password: password
      })
    })
      .then(function (data) {
        setPassword("");
        setMessage("Profile saved.");
        if (onUserUpdated) {
          onUserUpdated(data);
        }
      })
      .catch(function (requestError) {
        setMessage(requestError.message || "Failed to save profile.");
      })
      .finally(function () {
        setSaving(false);
      });
  }

  return (
    <div className="profile-page">
      <header className="page-heading compact-heading">
        <div>
          <h2>Profile</h2>
          <p>Manage your display name, contact email, and password.</p>
        </div>
      </header>

      <section className="info-block profile-card">
        <div className="profile-summary">
          <div>
            <p className="profile-kicker">Account</p>
            <h3>{user && (user.name || user.username)}</h3>
            <p className="form-message">Username: {user && user.username}</p>
          </div>
          <div className="profile-status-pill">
            {user && user.role === "manager" ? "Manager" : "Employee"}
          </div>
        </div>

        <form className="profile-form-grid" onSubmit={handleSave}>
          <div>
            <label className="field-label">Display Name</label>
            <input
              className="field-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Contact Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label">New Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="Leave blank to keep your current password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="profile-help">
            <p className="form-message">
              This email is saved with your account and can be used for contact details later.
            </p>
          </div>
          <div className="profile-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {message && (
              <p className={message.indexOf("Failed") >= 0 ? "form-message error-text" : "form-message"}>
                {message}
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export default Profile;
