import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "../lib/api";
import { parseYmdLocal, formatYmdLocal, addDaysYmdLocal, getWeekMondayYmdToday } from "../utils/calendar";

var WEEK_DAYS = [
  { day: "Mon", date: "Nov 17" },
  { day: "Tue", date: "Nov 18" },
  { day: "Wed", date: "Nov 19" },
  { day: "Thu", date: "Nov 20" },
  { day: "Fri", date: "Nov 21" },
  { day: "Sat", date: "Nov 22" },
  { day: "Sun", date: "Nov 23" }
];

var EMPLOYEE_SHIFT_TONES = ["blue", "green", "red", "amber", "violet", "teal", "orange", "indigo"];

function employeeNameToTone(name) {
  var key = String(name || "").trim().toLowerCase();
  if (!key) return "blue";
  var h = 0;
  for (var c = 0; c < key.length; c++) {
    h = ((h << 5) - h + key.charCodeAt(c)) | 0;
  }
  var idx = Math.abs(h) % EMPLOYEE_SHIFT_TONES.length;
  return EMPLOYEE_SHIFT_TONES[idx];
}

function shiftPersonKey(name) {
  return String(name || "").trim().toLowerCase();
}

function Scheduling({ user }) {
  var isManager = user && user.role === "manager";
  var defaultEnd = addDaysYmdLocal(getWeekMondayYmdToday(), 6) || "";
  const [employee, setEmployee] = useState("");
  const [employees, setEmployees] = useState([]);
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState(getWeekMondayYmdToday());
  const [endDate, setEndDate] = useState(defaultEnd);
  const [weekShifts, setWeekShifts] = useState([]);
  const [addShiftDate, setAddShiftDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");
  const [clearMessage, setClearMessage] = useState("");
  var loadWeekSeqRef = useRef(0);

  function loadWeekShifts(weekStart) {
    if (!weekStart) return;
    var seq = ++loadWeekSeqRef.current;
    apiFetch("/shifts?weekStart=" + encodeURIComponent(weekStart))
      .then(function (data) {
        if (seq !== loadWeekSeqRef.current) return;
        if (Array.isArray(data)) {
          setWeekShifts(data);
        } else {
          setWeekShifts([]);
        }
      })
      .catch(function () {
        if (seq !== loadWeekSeqRef.current) return;
        setWeekShifts([]);
      });
  }

  function getEndDateFromStart(start) {
    return addDaysYmdLocal(start, 6) || start;
  }

  function handleStartDateChange(e) {
    var newDate = e.target.value;
    setStartDate(newDate);
    setEndDate(getEndDateFromStart(newDate));
    loadWeekShifts(newDate);
  }

  function handleClearEntireSchedule() {
    if (window.confirm("Clear all shifts? You can regenerate with Auto scheduled.") !== true) return;
    setClearMessage("");
    apiFetch("/shifts/clear", { method: "DELETE" })
      .then(function (data) {
        setClearMessage("Schedule cleared. " + (data.removed || 0) + " shift(s) removed.");
        if (startDate) loadWeekShifts(startDate);
      })
      .catch(function (requestError) {
        setClearMessage(requestError.message || "Failed to clear schedule.");
      });
  }

  function handleCleanAndFill() {
    if (!startDate) return;
    setGenerateMessage("");
    setGenerating(true);
    apiFetch("/schedules/generate", {
      method: "POST",
      body: JSON.stringify({
        weekStart: startDate,
        weekEnd: endDate,
        cleanFirst: true
      })
    })
      .then(function (data) {
        if (data && data.error) {
          setGenerateMessage(data.error);
          return;
        }
        setGenerateMessage("Schedule cleared and filled: " + (data.created || 0) + " shifts added.");
        loadWeekShifts(startDate);
      })
      .catch(function (requestError) {
        setGenerateMessage(requestError.message || "Failed to generate schedule.");
      })
      .finally(function () {
        setGenerating(false);
      });
  }

  function addShift() {
    var t = time.trim();
    if (!employee || !t) {
      setMessage("Please choose an employee and time.");
      return;
    }
    var payload = { employeeId: employee, time: t };
    var dayForShift = addShiftDate || startDate;
    if (dayForShift) payload.date = dayForShift;
    apiFetch("/shifts", {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(function () {
        if (startDate) loadWeekShifts(startDate);
        setTime("");
        setMessage("Shift added successfully.");
        setShowAddForm(false);
      })
      .catch(function (requestError) {
        setMessage(requestError.message || "Failed to add shift.");
      });
  }

  useEffect(function () {
    if (startDate) loadWeekShifts(startDate);
  }, [startDate]);

  useEffect(function () {
    var mounted = true;
    if (!isManager) {
      setEmployees([]);
      return function () {
        mounted = false;
      };
    }
    apiFetch("/employees")
      .then(function (data) {
        if (!mounted) return;
        var list = Array.isArray(data) ? data : [];
        setEmployees(list);
        setEmployee(function (current) {
          return current || (list[0] ? list[0].id : "");
        });
      })
      .catch(function () {
        if (!mounted) return;
        setEmployees([]);
      });
    return function () {
      mounted = false;
    };
  }, [isManager]);

  function getCalendarWeekDays() {
    var days = [];
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var current = parseYmdLocal(startDate);
    var end = parseYmdLocal(endDate);
    if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) {
      return WEEK_DAYS;
    }
    while (current <= end && days.length < 7) {
      var dateStr = formatYmdLocal(current);
      var monthShort = current.toLocaleDateString("en-US", { month: "short" });
      var dayNum = current.getDate();
      var dayLabel = monthShort + " " + dayNum;
      var dayName = dayNames[current.getDay()];
      days.push({ day: dayName, date: dayLabel, dateStr: dateStr });
      current.setDate(current.getDate() + 1);
    }
    if (days.length === 0) return WEEK_DAYS;
    return days;
  }
  var calendarDays = getCalendarWeekDays();

  function getShiftsForDay(dateStr) {
    var groups = {};
    for (var i = 0; i < weekShifts.length; i++) {
      var s = weekShifts[i];
      if (s.date !== dateStr) continue;
      var raw = s.employee;
      var key = shiftPersonKey(raw) || "anon-" + (s.id != null ? s.id : i);
      if (!groups[key]) {
        groups[key] = {
          employee: String(raw || "").trim() || raw,
          times: [],
          timeSeen: {},
          role: String(s.role || "Team Member").trim() || "Team Member",
          tone: employeeNameToTone(raw),
          ids: []
        };
      }
      var g = groups[key];
      var trimmed = String(raw || "").trim();
      if (trimmed.length > String(g.employee).length) {
        g.employee = trimmed;
      }
      if (s.role && String(s.role).trim()) {
        g.role = String(s.role).trim();
      }
      var tm = String(s.time || "").trim();
      if (tm && !g.timeSeen[tm]) {
        g.timeSeen[tm] = true;
        g.times.push(tm);
      }
      if (s.id != null) {
        g.ids.push(s.id);
      }
    }
    return Object.values(groups)
      .map(function (g) {
        g.times.sort();
        return g;
      })
      .sort(function (a, b) {
        return String(a.employee).localeCompare(String(b.employee));
      });
  }

  return (
    <div className="scheduling-page">
      <header className="page-heading compact-heading scheduling-head-row">
        <div>
          <h2>Scheduling</h2>
          <p>View schedules and generate shifts automatically</p>
        </div>
        {isManager && (
          <button
            type="button"
            className="primary-button schedule-add-button"
            onClick={function () {
              if (!showAddForm) setAddShiftDate(startDate);
              setShowAddForm(!showAddForm);
            }}
          >
            {showAddForm ? "Close" : "Add Shift"}
          </button>
        )}
      </header>

      {isManager && showAddForm && (
        <section className="info-block">
          <h3>Add Shift</h3>
          <div className="shift-form-grid">
            <div className="date-input-wrap">
              <label className="field-label">Day</label>
              <select
                className="field-input"
                value={addShiftDate || startDate}
                onChange={function (e) {
                  setAddShiftDate(e.target.value);
                }}
              >
                {calendarDays.map(function (d) {
                  return (
                    <option key={d.dateStr} value={d.dateStr}>
                      {d.day} {d.date}
                    </option>
                  );
                })}
              </select>
            </div>
            <select
              className="field-input"
              value={employee}
              onChange={function (e) {
                setEmployee(e.target.value);
              }}
            >
              <option value="">Select employee</option>
              {employees.map(function (entry) {
                return (
                  <option key={entry.id} value={entry.id}>
                    {entry.name || entry.username}
                  </option>
                );
              })}
            </select>
            <input
              className="field-input"
              placeholder="Time (e.g. 09:00 - 17:00)"
              value={time}
              onChange={function (e) {
                setTime(e.target.value);
              }}
            />
            <button type="button" className="primary-button" onClick={addShift}>
              Save Shift
            </button>
          </div>
          <p className="form-message" style={{ marginTop: 8, fontSize: 12, color: "#526281" }}>
            Weekdays: only days marked in My availability (Dashboard). Weekends: any team member can be scheduled.
          </p>
          {message && <p className="form-message">{message}</p>}
        </section>
      )}
      {isManager && (
        <section className="info-block" style={{ marginBottom: 16 }}>
          <h3>Fill schedule from availability</h3>
          <p className="form-message" style={{ marginBottom: 8 }}>
            Weekdays follow availability. If a weekend day has no one marked, the scheduler considers the full team.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="ghost-button"
              onClick={handleClearEntireSchedule}
            >
              Clear entire schedule
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCleanAndFill}
              disabled={generating}
            >
              {generating ? "Generating…" : "Auto scheduled"}
            </button>
            {clearMessage && (
              <span className="form-message">{clearMessage}</span>
            )}
            {generateMessage && (
              <span className={/\bfail/i.test(generateMessage) ? "form-message error-text" : "form-message"}>
                {generateMessage}
              </span>
            )}
          </div>
        </section>
      )}
      <section className="calendar-shell">
        <p className="form-message" style={{ marginBottom: 8 }}>
          Week: {startDate} to {endDate}.
          {isManager ? " Add shifts above or use Auto scheduled." : " View this week’s schedule."}
        </p>
        <div className="date-input-wrap" style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <label className="field-label" style={{ marginBottom: 0 }}>Week</label>
          <input
            className="field-input compact-date-field"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
          />
        </div>
        <div className="schedule-calendar-grid">
          {calendarDays.map(function (day) {
            var dayShifts = getShiftsForDay(day.dateStr);
            var headerClass = "schedule-day-header";
            return (
              <article key={day.dateStr} className="schedule-day-column">
                <header className={headerClass}>
                  <p className="schedule-day-name">{day.day}</p>
                  <p className="schedule-day-date">{day.date}</p>
                </header>
                <div className="schedule-day-body">
                  {dayShifts.length === 0 && <p className="schedule-empty">No shifts</p>}
                  {dayShifts.length > 0 && (
                    <div className="shift-card-stack">
                      {dayShifts.map(function (shift) {
                        var cardClass = "shift-card shift-card-" + shift.tone;
                        var cardKey =
                          day.dateStr +
                          "-" +
                          shiftPersonKey(shift.employee) +
                          "-" +
                          (shift.ids && shift.ids.length ? shift.ids.join("-") : "0");
                        return (
                          <article key={cardKey} className={cardClass}>
                            <p className="shift-card-name">{shift.employee}</p>
                            <div className="shift-card-time-block">
                              {shift.times.map(function (t, ti) {
                                return (
                                  <p key={"t-" + ti} className="shift-card-time">
                                    {t}
                                  </p>
                                );
                              })}
                            </div>
                            <p className="shift-card-role">{shift.role}</p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Scheduling;
