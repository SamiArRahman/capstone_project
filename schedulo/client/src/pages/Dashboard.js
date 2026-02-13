import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000/api";

function getWeekMondayStr() {
  var d = new Date();
  var day = d.getDay();
  var diff = d.getDate() - (day === 0 ? 6 : day - 1);
  var monday = new Date(d);
  monday.setDate(diff);
  var y = monday.getFullYear();
  var m = String(monday.getMonth() + 1);
  if (m.length === 1) m = "0" + m;
  var date = String(monday.getDate());
  if (date.length === 1) date = "0" + date;
  return y + "-" + m + "-" + date;
}

function parseShiftHours(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  var parts = timeStr.split(/\s*-\s*/).map(function (s) { return s.trim(); });
  if (parts.length < 2) return 0;
  var parse = function (t) {
    var segs = t.split(":").map(Number);
    return (segs[0] || 0) + (segs[1] || 0) / 60;
  };
  var start = parse(parts[0]);
  var end = parse(parts[1]);
  return Math.max(0, end - start);
}

function formatDayLabel(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[d.getDay()] + ", " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

var DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dashboard({ user }) {
  var [employees, setEmployees] = useState([]);
  var [weekShifts, setWeekShifts] = useState([]);
  var [summary, setSummary] = useState({ pendingPto: 0, pendingSwaps: 0, pendingTotal: 0 });
  var [loading, setLoading] = useState(true);
  var [availabilityDays, setAvailabilityDays] = useState([]);
  var [availabilityTimeFrom, setAvailabilityTimeFrom] = useState("09:00");
  var [availabilityTimeTo, setAvailabilityTimeTo] = useState("17:00");
  var [availabilitySaveMessage, setAvailabilitySaveMessage] = useState("");

  useEffect(function () {
    var weekStart = getWeekMondayStr();
    var mounted = true;

    Promise.all([
      fetch(API_BASE + "/employees").then(function (r) { return r.json(); }),
      fetch(API_BASE + "/shifts?weekStart=" + encodeURIComponent(weekStart)).then(function (r) { return r.json(); }),
      fetch(API_BASE + "/requests/summary").then(function (r) { return r.json(); })
    ]).then(function (results) {
      if (!mounted) return;
      var empList = Array.isArray(results[0]) ? results[0] : [];
      var shifts = Array.isArray(results[1]) ? results[1] : [];
      var sum = results[2] || {};
      setEmployees(empList);
      setWeekShifts(shifts);
      setSummary({
        pendingPto: sum.pendingPto || 0,
        pendingSwaps: sum.pendingSwaps || 0,
        pendingTotal: sum.pendingTotal || 0
      });
    }).finally(function () {
      if (mounted) setLoading(false);
    });

    return function () { mounted = false; };
  }, []);

  useEffect(function () {
    if (!user || !user.id || user.role === "manager") return;
    var mounted = true;
    fetch(API_BASE + "/availability?userId=" + encodeURIComponent(user.id))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!mounted) return;
        if (data.days && Array.isArray(data.days)) setAvailabilityDays(data.days);
        if (data.timeFrom) setAvailabilityTimeFrom(data.timeFrom);
        if (data.timeTo) setAvailabilityTimeTo(data.timeTo);
      });
    return function () { mounted = false; };
  }, [user && user.id, user && user.role]);

  function toggleAvailabilityDay(day) {
    setAvailabilityDays(function (prev) {
      if (prev.indexOf(day) >= 0) return prev.filter(function (d) { return d !== day; });
      return prev.concat([day]).sort(function (a, b) { return DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b); });
    });
  }

  function saveAvailability() {
    if (!user || !user.id) return;
    setAvailabilitySaveMessage("");
    fetch(API_BASE + "/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        days: availabilityDays,
        timeFrom: availabilityTimeFrom,
        timeTo: availabilityTimeTo
      })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        setAvailabilitySaveMessage("Availability saved.");
      })
      .catch(function () {
        setAvailabilitySaveMessage("Failed to save.");
      });
  }

  var totalEmployees = employees.length;
  var shiftsThisWeek = weekShifts.length;
  var totalHours = weekShifts.reduce(function (acc, s) {
    return acc + parseShiftHours(s.time);
  }, 0);
  var pendingTotal = summary.pendingTotal || 0;

  var byDate = {};
  weekShifts.forEach(function (s) {
    var d = s.date || "";
    if (!byDate[d]) byDate[d] = { shifts: 0, employees: new Set(), hours: 0 };
    byDate[d].shifts += 1;
    byDate[d].employees.add(s.employee);
    byDate[d].hours += parseShiftHours(s.time);
  });

  var weekStart = getWeekMondayStr();
  var coverageDays = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length === 1) m = "0" + m;
    var date = String(d.getDate());
    if (date.length === 1) date = "0" + date;
    var dateStr = y + "-" + m + "-" + date;
    var info = byDate[dateStr] || { shifts: 0, employees: new Set(), hours: 0 };
    coverageDays.push({
      day: formatDayLabel(dateStr),
      dateStr: dateStr,
      shifts: info.shifts,
      employees: info.employees.size,
      hours: info.hours.toFixed(1) + "h"
    });
  }

  var lowCoverageCount = coverageDays.filter(function (c) { return c.employees < 2; }).length;

  var isManager = user && user.role === "manager";
  var myShifts = weekShifts.filter(function (s) {
    var name = user && (user.name || user.username || "");
    return s.employee === name || s.employee === (user && user.username);
  });
  var myHours = myShifts.reduce(function (acc, s) { return acc + parseShiftHours(s.time); }, 0);

  if (loading) {
    return (
      <div className="dashboard-page">
        <header className="page-heading">
          <h2>{user.role === "manager" ? "Manager Dashboard" : "Employee Dashboard"}</h2>
          <p>Loading…</p>
        </header>
      </div>
    );
  }

  var stats = [
    { label: "Total Employees", value: String(totalEmployees), tone: "blue" },
    { label: "Shifts This Week", value: String(shiftsThisWeek), tone: "green" },
    { label: "Total Hours", value: totalHours.toFixed(1), tone: "violet" },
    { label: "Pending Requests", value: String(pendingTotal), tone: "orange" }
  ];

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <h2>{user.role === "manager" ? "Manager Dashboard" : "Employee Dashboard"}</h2>
        <p>Overview of scheduling and team metrics</p>
      </header>

      <div className="stats-grid">
        {stats.map(function (stat) {
          return (
            <article key={stat.label} className={"stat-card stat-" + stat.tone}>
              <p>{stat.label}</p>
              <h3>{stat.value}</h3>
            </article>
          );
        })}
      </div>

      <section className="info-block">
        <h3>Action Required</h3>

        <div className="alert-list">
          {isManager && lowCoverageCount > 0 && (
            <div className="alert-box alert-danger">
              <strong>Low Coverage Alert</strong>
              <p>{lowCoverageCount} day(s) have fewer than 2 employees scheduled this week.</p>
            </div>
          )}
          {isManager && summary.pendingPto > 0 && (
            <div className="alert-box alert-warning">
              <p>{summary.pendingPto} PTO request(s) awaiting manager approval.</p>
            </div>
          )}
          {isManager && summary.pendingSwaps > 0 && (
            <div className="alert-box alert-warning">
              <p>{summary.pendingSwaps} shift swap request(s) awaiting manager approval.</p>
            </div>
          )}
          {(!isManager || (lowCoverageCount === 0 && summary.pendingPto === 0 && summary.pendingSwaps === 0)) && (
            <p className="form-message">No action required.</p>
          )}
        </div>
      </section>

      {!isManager && (
        <>
          <section className="info-block">
            <h3>My shifts this week</h3>
            {myShifts.length === 0 ? (
              <p className="form-message">You have no shifts scheduled this week.</p>
            ) : (
              <>
                <p className="form-message" style={{ marginBottom: 8 }}>
                  {myShifts.length} shift(s) – {myHours.toFixed(1)} hours total
                </p>
                <div className="coverage-list">
                  {myShifts.map(function (s) {
                    var dayLabel = formatDayLabel(s.date);
                    return (
                      <div key={(s.date || "") + "-" + s.employee + "-" + (s.time || "")} className="coverage-row">
                        <span>{dayLabel}</span>
                        <span>{s.time || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
          <section className="info-block">
            <h3>My availability</h3>
            <p className="form-message" style={{ marginBottom: 8 }}>Set which days and times you can work.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {DAYS_OF_WEEK.map(function (day) {
                var checked = availabilityDays.indexOf(day) >= 0;
                return (
                  <label key={day} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={function () { toggleAvailabilityDay(day); }}
                    />
                    <span>{day}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>From</label>
              <input
                type="time"
                className="field-input"
                style={{ width: "auto" }}
                value={availabilityTimeFrom}
                onChange={function (e) { setAvailabilityTimeFrom(e.target.value); }}
              />
              <label className="field-label" style={{ marginBottom: 0 }}>To</label>
              <input
                type="time"
                className="field-input"
                style={{ width: "auto" }}
                value={availabilityTimeTo}
                onChange={function (e) { setAvailabilityTimeTo(e.target.value); }}
              />
            </div>
            <button type="button" className="primary-button" onClick={saveAvailability}>
              Save availability
            </button>
            {availabilitySaveMessage && (
              <p className="form-message" style={{ marginTop: 8 }}>{availabilitySaveMessage}</p>
            )}
          </section>
        </>
      )}

      <section className="info-block">
        <h3>Daily Coverage - This Week</h3>

        <div className="coverage-list">
          {coverageDays.map(function (entry) {
            return (
              <div key={entry.dateStr} className="coverage-row">
                <span>{entry.day}</span>
                <span>
                  {entry.shifts} shifts - {entry.employees} employees - {entry.hours}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
