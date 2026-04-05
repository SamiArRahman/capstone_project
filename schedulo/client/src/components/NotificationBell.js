import React, { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "../lib/api";

function formatTime(iso) {
  if (!iso) return "";
  try {
    var d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);

  var hasUser = user && user.username;

  const load = useCallback(function () {
    if (!hasUser) return;
    apiFetch("/notifications")
      .then(function (data) {
        if (data && Array.isArray(data.items)) {
          setItems(data.items);
          setUnreadCount(Number(data.unreadCount) || 0);
        }
      })
      .catch(function () {});
  }, [hasUser]);

  useEffect(function () {
    load();
    var id = setInterval(load, 5000);
    return function () {
      clearInterval(id);
    };
  }, [load]);

  useEffect(function () {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return function () {
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function markAllRead() {
    if (!hasUser || items.length === 0) {
      setOpen(false);
      return;
    }
    apiFetch("/notifications/ack", { method: "POST", body: JSON.stringify({}) })
      .then(function () {
        setUnreadCount(0);
        load();
      })
      .catch(function () {});
    setOpen(false);
  }

  if (!hasUser) return null;

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label="Schedule notifications"
        onClick={function () {
          setOpen(!open);
        }}
      >
        <span className="notification-bell-icon" aria-hidden>
          🔔
        </span>
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-head">
            <span>Schedule alerts</span>
            {items.length > 0 && (
              <button type="button" className="notification-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-dropdown-body">
            {items.length === 0 && <p className="notification-empty">No notifications yet. You’ll see alerts when shifts are scheduled.</p>}
            {items.length > 0 &&
              items.map(function (n) {
                return (
                  <div key={n.id} className="notification-item">
                    <p className="notification-item-text">{n.message}</p>
                    <p className="notification-item-time">{formatTime(n.createdAt)}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
