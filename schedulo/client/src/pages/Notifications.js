import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  function loadNotifications() {
    setLoading(true);
    apiFetch("/notifications")
      .then(function (data) {
        setNotifications(Array.isArray(data) ? data : []);
      })
      .catch(function () {
        setNotifications([]);
        setMessage("Failed to load notifications.");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  useEffect(function () {
    loadNotifications();
  }, []);

  function markAsRead(notificationId) {
    apiFetch("/notifications/" + notificationId + "/read", { method: "PATCH" })
      .then(function (updated) {
        setNotifications(function (prev) {
          return prev.map(function (entry) {
            return entry.id === updated.id ? updated : entry;
          });
        });
      })
      .catch(function (requestError) {
        setMessage(requestError.message || "Failed to mark notification as read.");
      });
  }

  function markAllRead() {
    setMessage("");
    setMarkingAllRead(true);
    apiFetch("/notifications/read-all", { method: "PATCH" })
      .then(function () {
        setNotifications(function (prev) {
          return prev.map(function (entry) {
            if (entry.readAt) {
              return entry;
            }
            return {
              ...entry,
              readAt: new Date().toISOString()
            };
          });
        });
      })
      .catch(function (requestError) {
        setMessage(requestError.message || "Failed to mark notifications as read.");
      })
      .finally(function () {
        setMarkingAllRead(false);
      });
  }

  function renderShiftSummary(notification) {
    var metadata = notification.metadata || {};
    var shifts = Array.isArray(metadata.shifts) ? metadata.shifts : [];
    if (notification.type !== "schedule_finalized") {
      return null;
    }
    if (shifts.length === 0) {
      return <p className="notification-empty-state">No shifts scheduled for this week.</p>;
    }
    return (
      <ul className="notification-shift-list">
        {shifts.map(function (shift) {
          return (
            <li key={shift.date + "-" + shift.time}>
              <strong>{shift.date}</strong> {shift.time} ({shift.role})
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="notifications-page">
      <header className="page-heading compact-heading notifications-head-row">
        <div>
          <h2>Notifications</h2>
          <p>Review finalized schedule updates and other in-app alerts.</p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={markAllRead}
          disabled={markingAllRead || notifications.length === 0}
        >
          {markingAllRead ? "Marking..." : "Mark all read"}
        </button>
      </header>

      {message && <p className="form-message error-text">{message}</p>}

      {loading ? (
        <section className="info-block">
          <p className="form-message">Loading notifications...</p>
        </section>
      ) : (
        <section className="notification-list">
          {notifications.map(function (notification) {
            var isUnread = !notification.readAt;
            var metadata = notification.metadata || {};
            var weekLabel = metadata.weekStart && metadata.weekEnd ? metadata.weekStart + " to " + metadata.weekEnd : "";
            return (
              <article
                key={notification.id}
                className={"notification-card" + (isUnread ? " notification-card-unread" : "")}
              >
                <div className="notification-card-top">
                  <div>
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                  {isUnread && <span className="notification-pill">Unread</span>}
                </div>
                {weekLabel && <p className="notification-meta">Week: {weekLabel}</p>}
                {renderShiftSummary(notification)}
                <div className="notification-actions">
                  <span className="notification-meta">
                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
                  </span>
                  {isUnread && (
                    <button
                      type="button"
                      className="availability-link"
                      onClick={function () { markAsRead(notification.id); }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {notifications.length === 0 && (
            <section className="info-block">
              <p className="form-message">No notifications yet.</p>
            </section>
          )}
        </section>
      )}
    </div>
  );
}

export default Notifications;
