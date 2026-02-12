
const express = require("express");
const cors = require("cors");



const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Schedulo Backend Running");
});

let users = [
  { id: 1, username: "manager", password: "1234", role: "manager" },
  { id: 2, username: "employee", password: "1234", role: "employee" },
];

// SAMPLE API
app.get("/api/shifts", (req, res) => {
  res.json([
    { id: 1, employee: "Krishna", time: "09:00 - 17:00" },
    { id: 2, employee: "Sami", time: "10:00 - 18:00" }
  ]);
});

let shifts = [
  { id: 1, employee: "Krishna", time: "09:00 - 17:00" },
  { id: 2, employee: "Sami", time: "10:00 - 18:00" }
];

app.get("/api/shifts", (req, res) => {
  res.json(shifts);
});

app.post("/api/shifts", (req, res) => {

  const { employee, time } = req.body;

  if (!employee || !time) {
    return res.json({ error: "Missing employee or time" });
  }

  // Check for duplicate shift
  const exists = shifts.find(
    s => s.employee === employee && s.time === time
  );

  if (exists) {
    return res.json({ error: "This shift already exists" });
  }

  const newShift = {
    id: shifts.length + 1,
    employee,
    time
  };

  const conflict = shifts.find(
    s => s.employee === employee
  );
    
  if (conflict) {
    return res.json({ error: "Employee already has a shift assigned" });
  }

  shifts.push(newShift);

  res.json(newShift);
});

app.post("/api/login", (req, res) => {

  const { username, password } = req.body;

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.json({ error: "Invalid credentials" });
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role
  });
});


const PORT = 4000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
