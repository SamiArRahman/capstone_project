const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Schedulo Backend Running");
});

let users = [
  { id: 1, username: "manager", password: "1234", role: "manager", name: "Sami" },
  { id: 2, username: "employee", password: "1234", role: "employee", name: "Krishna" }
];

let shifts = [
  { id: 1, employee: "Krishna", time: "09:00 - 17:00" },
  { id: 2, employee: "Sami", time: "10:00 - 18:00" }
];

let ptoRequests = [
  {
    id: 1,
    employee: "Krishna",
    startDate: "2025-12-14",
    endDate: "2025-12-19",
    reason: "Medical Appointment",
    requestedAt: "2025-11-20T10:30:00.000Z",
    status: "pending"
  },
  {
    id: 2,
    employee: "Damon",
    startDate: "2025-11-28",
    endDate: "2025-11-28",
    reason: "Medical appointment",
    requestedAt: "2025-11-22T14:15:00.000Z",
    status: "pending"
  }
];

let swapRequests = [
  {
    id: 1,
    fromEmployee: "Krishna",
    toEmployee: "Damon",
    date: "2025-11-23",
    role: "Server",
    time: "11:00 - 19:00",
    reason: "Medical appointment",
    requestedAt: "2025-11-22T16:00:00.000Z",
    status: "pending"
  }
];

const getNextId = list => {
  if (list.length === 0) {
    return 1;
  }

  return Math.max(...list.map(item => item.id)) + 1;
};

const applyStatusFilter = (list, status) => {
  if (!status) {
    return list;
  }

  return list.filter(item => item.status === status);
};

const isValidStatus = status => ["pending", "approved", "denied"].includes(status);

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

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.json({ error: "Invalid credentials" });
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name
  });
});

app.get("/api/requests/pto", (req, res) => {
  const { status } = req.query;
  res.json(applyStatusFilter(ptoRequests, status));
});

app.post("/api/requests/pto", (req, res) => {
  const { employee, startDate, endDate, reason } = req.body;

  if (!employee || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: "Missing employee, dates, or reason" });
  }

  const newRequest = {
    id: getNextId(ptoRequests),
    employee: employee.trim(),
    startDate,
    endDate,
    reason: reason.trim(),
    requestedAt: new Date().toISOString(),
    status: "pending"
  };

  ptoRequests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch("/api/requests/pto/:id/status", (req, res) => {
  const requestId = Number(req.params.id);
  const { status } = req.body;

  if (!isValidStatus(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const target = ptoRequests.find(item => item.id === requestId);

  if (!target) {
    return res.status(404).json({ error: "PTO request not found" });
  }

  target.status = status;
  res.json(target);
});

app.get("/api/requests/swaps", (req, res) => {
  const { status } = req.query;
  res.json(applyStatusFilter(swapRequests, status));
});

app.post("/api/requests/swaps", (req, res) => {
  const { fromEmployee, toEmployee, date, role, time, reason } = req.body;

  if (!fromEmployee || !toEmployee || !date || !role || !time || !reason) {
    return res.status(400).json({ error: "Missing employee, schedule, or reason data" });
  }

  const newRequest = {
    id: getNextId(swapRequests),
    fromEmployee: fromEmployee.trim(),
    toEmployee: toEmployee.trim(),
    date,
    role: role.trim(),
    time: time.trim(),
    reason: reason.trim(),
    requestedAt: new Date().toISOString(),
    status: "pending"
  };

  swapRequests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch("/api/requests/swaps/:id/status", (req, res) => {
  const requestId = Number(req.params.id);
  const { status } = req.body;

  if (!isValidStatus(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const target = swapRequests.find(item => item.id === requestId);

  if (!target) {
    return res.status(404).json({ error: "Shift swap request not found" });
  }

  target.status = status;
  res.json(target);
});

app.get("/api/requests/summary", (req, res) => {
  const pendingPto = ptoRequests.filter(item => item.status === "pending").length;
  const pendingSwaps = swapRequests.filter(item => item.status === "pending").length;

  res.json({
    pendingPto,
    pendingSwaps,
    pendingTotal: pendingPto + pendingSwaps
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
