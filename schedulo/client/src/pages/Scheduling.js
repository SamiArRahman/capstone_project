import React, { useEffect, useState } from "react";

const WEEK_DAYS = [
  { day: "Mon", date: "Nov 17" },
  { day: "Tue", date: "Nov 18" },
  { day: "Wed", date: "Nov 19" },
  { day: "Thu", date: "Nov 20" },
  { day: "Fri", date: "Nov 21" },
  { day: "Sat", date: "Nov 22", selected: true },
  { day: "Sun", date: "Nov 23" }
];

const DEFAULT_SUNDAY_SHIFTS = [
  { employee: "Sami", time: "09:00 - 17:00", role: "Floor Manager", tone: "blue" },
  { employee: "Krishna", time: "11:00 - 19:00", role: "Server", tone: "green" },
  { employee: "Tigran", time: "10:00 - 18:00", role: "Cook", tone: "red" }
];

const SHIFT_TEMPLATES = [
  {
    title: "Floor Manager",
    meta: "09:00 - 17:00",
    daysPerWeek: "5 days/week",
    tags: ["Leadership", "Customer Service"]
  },
  {
    title: "Server",
    meta: "11:00 - 19:00",
    daysPerWeek: "7 days/week",
    tags: ["Customer Service", "POS"]
  },
  {
    title: "Cook",
    meta: "10:00 - 18:00",
    daysPerWeek: "6 days/week",
    tags: ["Cooking", "Food Handling"]
  }
];

const EMPLOYEE_STYLE = {
  sami: { role: "Floor Manager", tone: "blue" },
  krishna: { role: "Server", tone: "green" },
  tigran: { role: "Cook", tone: "red" }
};

function Scheduling() {
  const [shifts, setShifts] = useState([]);
  const [employee, setEmployee] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [activeView, setActiveView] = useState("calendar");
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState("2025-11-24");

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = () => {
    fetch("http://localhost:4000/api/shifts")
      .then(res => res.json())
      .then(data => setShifts(data));
  };

  const addShift = () => {
    const newShift = {
      employee: employee.trim(),
      time: time.trim()
    };

    if (!newShift.employee || !newShift.time) {
      setMessage("Please enter employee name and time.");
      return;
    }

    fetch("http://localhost:4000/api/shifts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newShift)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setMessage(data.error);
        } else {
          loadShifts();
          setEmployee("");
          setTime("");
          setMessage("Shift added successfully.");
          setShowAddForm(false);
        }
      });
  };

  const defaultShiftNames = DEFAULT_SUNDAY_SHIFTS.map(shift => shift.employee.toLowerCase());

  const normalizedApiShifts = shifts.map((shift, index) => {
    const style = EMPLOYEE_STYLE[shift.employee.toLowerCase()];

    return {
      employee: shift.employee,
      time: shift.time,
      role: style ? style.role : "Team Member",
      tone: style ? style.tone : index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "red"
    };
  });

  const extraApiShifts = normalizedApiShifts.filter(
    shift => !defaultShiftNames.includes(shift.employee.toLowerCase())
  );

  const apiShiftByName = normalizedApiShifts.reduce((acc, shift) => {
    acc[shift.employee.toLowerCase()] = shift;
    return acc;
  }, {});

  const mergedDefaultShifts = DEFAULT_SUNDAY_SHIFTS.map(defaultShift => {
    const apiShift = apiShiftByName[defaultShift.employee.toLowerCase()];
    return apiShift ? { ...defaultShift, time: apiShift.time } : defaultShift;
  });

  const sundayShifts = shifts.length > 0 ? [...mergedDefaultShifts, ...extraApiShifts] : DEFAULT_SUNDAY_SHIFTS;

  const renderCalendarView = () => (
    <>
      {showAddForm && (
        <section className="info-block">
          <h3>Add Shift</h3>

          <div className="shift-form-grid">
            <input
              className="field-input"
              placeholder="Employee Name"
              value={employee}
              onChange={e => setEmployee(e.target.value)}
            />

            <input
              className="field-input"
              placeholder="Time (e.g. 09:00 - 17:00)"
              value={time}
              onChange={e => setTime(e.target.value)}
            />

            <button className="primary-button" onClick={addShift}>
              Save Shift
            </button>
          </div>

          {message && <p className="form-message">{message}</p>}
        </section>
      )}

      <section className="calendar-shell">
        <div className="schedule-calendar-grid">
          {WEEK_DAYS.map(day => (
            <article key={day.day} className="schedule-day-column">
              <header className={`schedule-day-header ${day.selected ? "schedule-day-header-active" : ""}`}>
                <p className="schedule-day-name">{day.day}</p>
                <p className="schedule-day-date">{day.date}</p>
              </header>

              <div className="schedule-day-body">
                {day.day !== "Sun" && <p className="schedule-empty">No shifts</p>}

                {day.day === "Sun" && (
                  <div className="shift-card-stack">
                    {sundayShifts.map((shift, index) => (
                      <article key={`${shift.employee}-${index}`} className={`shift-card shift-card-${shift.tone}`}>
                        <p className="shift-card-name">{shift.employee}</p>
                        <p className="shift-card-time">{shift.time}</p>
                        <p className="shift-card-role">{shift.role}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const renderAutoSchedulerView = () => (
    <>
      <header className="auto-header">
        <h3>Auto Schedule Generator</h3>
        <p>Automatically generate schedules based on employee availability, skills, and hour limits</p>
      </header>

      <section className="info-block">
        <h3>Schedule Parameters</h3>

        <div className="date-input-wrap">
          <label className="field-label" htmlFor="start-date">
            Start Date (Week Beginning)
          </label>
          <input
            id="start-date"
            className="field-input compact-date-field"
            type="date"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
          />
        </div>

        <div className="template-list">
          <h4>Shift Templates</h4>

          {SHIFT_TEMPLATES.map(template => (
            <article key={template.title} className="template-card">
              <p className="template-title">{template.title}</p>
              <p className="template-meta">
                {template.meta} - {template.daysPerWeek}
              </p>

              <div className="template-tags">
                {template.tags.map(tag => (
                  <span key={tag} className="template-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className="scheduling-page">
      <header className="page-heading compact-heading scheduling-head-row">
        <div>
          <h2>Scheduling</h2>
          <p>View schedules and generate shifts automatically</p>
        </div>

        {activeView === "calendar" && (
          <button className="primary-button schedule-add-button" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Close" : "Add Shift"}
          </button>
        )}
      </header>

      <section className="mode-switch-bar">
        <button
          className={`mode-switch-button ${activeView === "calendar" ? "mode-switch-button-active" : ""}`}
          onClick={() => setActiveView("calendar")}
        >
          Schedule Calendar
        </button>
        <button
          className={`mode-switch-button ${activeView === "auto" ? "mode-switch-button-active" : ""}`}
          onClick={() => setActiveView("auto")}
        >
          Auto Scheduler
        </button>
      </section>

      {activeView === "calendar" ? renderCalendarView() : renderAutoSchedulerView()}
    </div>
  );
}

export default Scheduling;
