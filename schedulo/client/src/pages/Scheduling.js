import React, { useEffect, useState } from "react";

var WEEK_DAYS = [
  { day: "Mon", date: "Nov 17" },
  { day: "Tue", date: "Nov 18" },
  { day: "Wed", date: "Nov 19" },
  { day: "Thu", date: "Nov 20" },
  { day: "Fri", date: "Nov 21" },
  { day: "Sat", date: "Nov 22" },
  { day: "Sun", date: "Nov 23" }
];

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

function Scheduling({ user }) {
  var isManager = user && user.role === "manager";
  var defaultEnd = (function () {
    var s = getWeekMondayStr();
    var d = new Date(s);
    d.setDate(d.getDate() + 6);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length === 1) m = "0" + m;
    var day = String(d.getDate());
    if (day.length === 1) day = "0" + day;
    return y + "-" + m + "-" + day;
  })();
  const [employee, setEmployee] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState(getWeekMondayStr());
  const [endDate, setEndDate] = useState(defaultEnd);
  const [weekShifts, setWeekShifts] = useState([]);
  const [addShiftDate, setAddShiftDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");
  const [clearMessage, setClearMessage] = useState("");

  function loadWeekShifts(weekStart) {
    if (!weekStart) return;
    var url = "http://localhost:4000/api/shifts?weekStart=" + encodeURIComponent(weekStart);
    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data)) {
          setWeekShifts(data);
        } else {
          setWeekShifts([]);
        }
      });
  }

  function getEndDateFromStart(start) {
    var d = new Date(start);
    d.setDate(d.getDate() + 6);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length === 1) m = "0" + m;
    var day = String(d.getDate());
    if (day.length === 1) day = "0" + day;
    return y + "-" + m + "-" + day;
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
    fetch("http://localhost:4000/api/shifts/clear", { method: "DELETE" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setClearMessage("Schedule cleared. " + (data.removed || 0) + " shift(s) removed.");
        if (startDate) loadWeekShifts(startDate);
      })
      .catch(function () {
        setClearMessage("Failed to clear schedule.");
      });
  }

  function handleCleanAndFill() {
    if (!startDate) return;
    setGenerateMessage("");
    setGenerating(true);
    fetch("http://localhost:4000/api/schedules/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: startDate,
        weekEnd: endDate,
        cleanFirst: true
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          setGenerateMessage(data.error);
        } else {
          setGenerateMessage("Schedule cleared and filled: " + data.created + " shifts added.");
          loadWeekShifts(startDate);
        }
      })
      .catch(function () {
        setGenerateMessage("Failed to generate schedule.");
      })
      .finally(function () {
        setGenerating(false);
      });
  }

  function addShift() {
    var emp = employee.trim();
    var t = time.trim();
    if (!emp || !t) {
      setMessage("Please enter employee name and time.");
      return;
    }
    var payload = { employee: emp, time: t };
    var dayForShift = addShiftDate || startDate;
    if (dayForShift) payload.date = dayForShift;
    fetch("http://localhost:4000/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.error) {
          setMessage(data.error);
        } else {
          if (startDate) loadWeekShifts(startDate);
          setEmployee("");
          setTime("");
          setMessage("Shift added successfully.");
          setShowAddForm(false);
        }
      });
  }

  useEffect(function () {
    if (startDate) loadWeekShifts(startDate);
  }, [startDate]);

  function getCalendarWeekDays() {
    var days = [];
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var current = new Date(startDate);
    var end = new Date(endDate);
    if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) {
      return WEEK_DAYS;
    }
    while (current <= end && days.length < 7) {
      var y = current.getFullYear();
      var m = String(current.getMonth() + 1);
      if (m.length === 1) m = "0" + m;
      var d = String(current.getDate());
      if (d.length === 1) d = "0" + d;
      var dateStr = y + "-" + m + "-" + d;
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
    var result = [];
    for (var i = 0; i < weekShifts.length; i++) {
      if (weekShifts[i].date === dateStr) {
        var tone = i % 3 === 0 ? "blue" : i % 3 === 1 ? "green" : "red";
        result.push({
          employee: weekShifts[i].employee,
          time: weekShifts[i].time,
          role: "Team Member",
          tone: tone
        });
      }
    }
    return result;
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
                <input
                  className="field-input"
                  placeholder="Employee Name"
                  value={employee}
                  onChange={function (e) {
                    setEmployee(e.target.value);
                  }}
                />
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
                Shifts can only be assigned on days the employee has set in My Availability (Dashboard).
              </p>
              {message && <p className="form-message">{message}</p>}
            </section>
          )}
          {isManager && (
            <section className="info-block" style={{ marginBottom: 16 }}>
              <h3>Fill schedule from availability</h3>
              <p className="form-message" style={{ marginBottom: 8 }}>
                Clear all shifts, then use Auto scheduled to fill based on each employee&apos;s availability (Dashboard).
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
                  <span className={generateMessage.indexOf("Failed") >= 0 ? "form-message error-text" : "form-message"}>
                    {generateMessage}
                  </span>
                )}
              </div>
            </section>
          )}
          <section className="calendar-shell">
            <p className="form-message" style={{ marginBottom: 8 }}>
              Week: {startDate} to {endDate}.{isManager ? " Add shifts above or clean & fill from availability." : " View the schedule for this week."}
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
                          {dayShifts.map(function (shift, index) {
                            var cardClass = "shift-card shift-card-" + shift.tone;
                            return (
                              <article key={shift.employee + "-" + shift.time + "-" + index} className={cardClass}>
                                <p className="shift-card-name">{shift.employee}</p>
                                <p className="shift-card-time">{shift.time}</p>
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
