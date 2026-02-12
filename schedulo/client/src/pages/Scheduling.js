import React, { useEffect, useState } from "react";

function Scheduling() {

  const [shifts, setShifts] = useState([]);
  const [employee, setEmployee] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = () => {
    fetch("http://localhost:4000/api/shifts")
      .then(res => res.json())
      .then(data => setShifts(data));
  };

  const addShift = () => {

    if (employee.trim() === "" || time.trim() === "") {
      alert("Please enter employee name and time");
      return;
    }

    const newShift = { employee, time };

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
          alert(data.error);
        } else {
          loadShifts();
          setEmployee("");
          setTime("");
        }
      });
  };


  return (
    <div>
      <h2>Scheduling</h2>

      <h3>Add New Shift</h3>

      <input
        placeholder="Employee Name"
        value={employee}
        onChange={e => setEmployee(e.target.value)}
      />

      <input
        placeholder="Time (e.g. 09:00 - 17:00)"
        value={time}
        onChange={e => setTime(e.target.value)}
      />

      <button onClick={addShift}>Add Shift</button>

      <h3>Current Shifts</h3>

      {shifts.map(shift => (
        <div key={shift.id}>
          {shift.employee} – {shift.time}
        </div>
      ))}

      {shifts.map(shift => (
        <div
          key={shift.id}
          style={{
            padding: "10px",
            margin: "10px 0",
            border: "1px solid #ccc",
            borderRadius: "5px"
          }}
        >
          <strong>{shift.employee}</strong>
          <br />
          {shift.time}
        </div>
      ))}

    </div>
  );
}

export default Scheduling;
