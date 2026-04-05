import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { parseYmdLocal, addDaysYmdLocal, getWeekMondayYmdToday } from "../utils/calendar";

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
  var d = parseYmdLocal(dateStr);
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
    var weekStart = getWeekMondayYmdToday();
    var mounted = true;

    Promise.all([
      apiFetch("/employees"),
      apiFetch("/shifts?weekStart=" + encodeURIComponent(weekStart)),
      apiFetch("/requests/summary")
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
    if (!user || !user.id) return;
    var mounted = true;
    apiFetch("/availability?userId=" + encodeURIComponent(user.id))
      .then(function (data) {
        if (!mounted) return;
        if (data.days && Array.isArray(data.days)) setAvailabilityDays(data.days);
        if (data.timeFrom) setAvailabilityTimeFrom(data.timeFrom);
        if (data.timeTo) setAvailabilityTimeTo(data.timeTo);
      });
    return function () { mounted = false; };
  }, [user]);

  function toggleAvailabilityDay(day) {
    setAvailabilityDays(function (prev) {
      if (prev.indexOf(day) >= 0) return prev.filter(function (d) { return d !== day; });
      return prev.concat([day]).sort(function (a, b) { return DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b); });
    });
  }

  function saveAvailability() {
    if (!user || !user.id) return;
    setAvailabilitySaveMessage("");
    apiFetch("/availability", {
      method: "PUT",
      body: JSON.stringify({
        userId: user.id,
        days: availabilityDays,
        timeFrom: availabilityTimeFrom,
        timeTo: availabilityTimeTo
      })
    })
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

  var weekStart = getWeekMondayYmdToday();
  var coverageDays = [];
  for (var i = 0; i < 7; i++) {
    var dateStr = addDaysYmdLocal(weekStart, i);
    if (!dateStr) continue;
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

  function shiftMatchesLoggedInUser(employeeStr) {
    if (!user) return false;
    var n = String(employeeStr || "").trim().toLowerCase();
    var un = String(user.name || "").trim().toLowerCase();
    var uu = String(user.username || "").trim().toLowerCase();
    return n === un || n === uu;
  }

  var isManager = user && user.role === "manager";
  var myShifts = weekShifts.filter(function (s) {
    return shiftMatchesLoggedInUser(s.employee);
  });
  var myHours = myShifts.reduce(function (acc, s) { return acc + parseShiftHours(s.time); }, 0);

  var myShiftsByDate = {};
  for (var ms = 0; ms < myShifts.length; ms++) {
    var sd = myShifts[ms].date || "";
    if (!myShiftsByDate[sd]) {
      myShiftsByDate[sd] = { date: sd, times: [], seen: {} };
    }
    var tms = String(myShifts[ms].time || "").trim();
    if (tms && !myShiftsByDate[sd].seen[tms]) {
      myShiftsByDate[sd].seen[tms] = true;
      myShiftsByDate[sd].times.push(tms);
    }
  }
  var myShiftDayRows = Object.keys(myShiftsByDate)
    .sort()
    .map(function (dk) {
      var row = myShiftsByDate[dk];
      row.times.sort();
      return row;
    });

  if (loading) {
    return (
      <div className="dashboard-page">
        <header className="page-heading">
          <h2>{user.role === "manager" ? "Manager Dashboard" : "Employee Dashboard"}</h2>
          <p>Loading...</p>
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
              {myShiftDayRows.map(function (row) {
                return (
                  <div key={row.date || "x"} className="coverage-row">
                    <span>{formatDayLabel(row.date)}</span>
                    <span>{row.times.length ? row.times.join(" · ") : "—"}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <section className="info-block">
        <h3>My availability</h3>
        <p className="form-message" style={{ marginBottom: 8 }}>
          Days you check here are used for Auto scheduled (weekdays). Weekends fall back to the full team if a day has no one marked.
        </p>
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
