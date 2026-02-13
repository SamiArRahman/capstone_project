var express = require("express");
var cors = require("cors");

var app = express();

app.use(cors());
app.use(express.json());

app.get("/", function (req, res) {
  res.send("Schedulo Backend Running");
});

var users = [
  { id: 1, username: "manager", password: "1234", role: "manager", name: "Sami" },
  { id: 2, username: "employee", password: "1234", role: "employee", name: "Krishna" }
];

var shifts = [
  { id: 1, employee: "Krishna", time: "09:00 - 17:00" },
  { id: 2, employee: "Sami", time: "10:00 - 18:00" }
];

var ptoRequests = [
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

var swapRequests = [
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

function getNextId(arr) {
  if (arr.length === 0) return 1;
  var max = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id > max) max = arr[i].id;
  }
  return max + 1;
}

app.get("/api/shifts", function (req, res) {
  var weekStart = req.query.weekStart;
  if (!weekStart) {
    res.json(shifts);
    return;
  }
  var start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) {
    res.json(shifts);
    return;
  }
  var end = new Date(start);
  end.setDate(end.getDate() + 7);
  var result = [];
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    if (!s.date) continue;
    var d = new Date(s.date);
    if (d >= start && d < end) result.push(s);
  }
  res.json(result);
});

app.post("/api/shifts", function (req, res) {
  var employee = req.body.employee;
  var time = req.body.time;
  var date = req.body.date;

  if (!employee || !time) {
    res.json({ error: "Missing employee or time" });
    return;
  }

  var shiftDate = null;
  if (date && String(date).trim()) shiftDate = String(date).trim();

  if (shiftDate) {
    for (var i = 0; i < shifts.length; i++) {
      if (shifts[i].employee === employee && shifts[i].date === shiftDate) {
        res.json({ error: "Employee already has a shift on this date" });
        return;
      }
    }
  } else {
    for (var j = 0; j < shifts.length; j++) {
      if (shifts[j].employee === employee && !shifts[j].date) {
        res.json({ error: "Employee already has a shift assigned" });
        return;
      }
    }
  }

  var newShift = {
    id: getNextId(shifts),
    employee: employee.trim(),
    time: time.trim()
  };
  if (shiftDate) newShift.date = shiftDate;

  shifts.push(newShift);
  res.json(newShift);
});

var shiftTemplates = [
  { role: "Floor Manager", time: "09:00 - 17:00" },
  { role: "Server", time: "11:00 - 19:00" },
  { role: "Cook", time: "10:00 - 18:00" }
];

app.post("/api/schedules/generate", function (req, res) {
  var weekStart = req.body.weekStart;
  var weekEnd = req.body.weekEnd;

  if (!weekStart) {
    res.status(400).json({ error: "weekStart (YYYY-MM-DD) is required" });
    return;
  }
  var start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) {
    res.status(400).json({ error: "Invalid weekStart date" });
    return;
  }

  var numDays = 7;
  if (weekEnd) {
    var end = new Date(weekEnd);
    if (!Number.isNaN(end.getTime()) && end >= start) {
      var diff = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
      numDays = diff;
      if (numDays > 7) numDays = 7;
      if (numDays < 1) numDays = 1;
    }
  }

  var employeeNames = [];
  for (var u = 0; u < users.length; u++) {
    if (users[u].role === "employee" && users[u].name) employeeNames.push(users[u].name);
  }
  if (employeeNames.indexOf("Sami") === -1) employeeNames.push("Sami");
  if (employeeNames.indexOf("Krishna") === -1) employeeNames.push("Krishna");
  if (employeeNames.indexOf("Tigran") === -1) employeeNames.push("Tigran");
  if (employeeNames.indexOf("Damon") === -1) employeeNames.push("Damon");
  if (employeeNames.indexOf("Karim") === -1) employeeNames.push("Karim");

  if (employeeNames.length < 3) {
    res.status(400).json({ error: "Need at least 3 employees to generate schedule" });
    return;
  }

  var created = [];
  for (var d = 0; d < numDays; d++) {
    var dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + d);
    var y = dayDate.getFullYear();
    var mo = dayDate.getMonth() + 1;
    var da = dayDate.getDate();
    if (mo < 10) mo = "0" + mo;
    if (da < 10) da = "0" + da;
    var dateStr = y + "-" + mo + "-" + da;
    for (var t = 0; t < shiftTemplates.length; t++) {
      var empIndex = (d + t) % employeeNames.length;
      var emp = employeeNames[empIndex];
      var time = shiftTemplates[t].time;
      var exists = false;
      for (var s = 0; s < shifts.length; s++) {
        if (shifts[s].employee === emp && shifts[s].date === dateStr) {
          exists = true;
          break;
        }
      }
      if (exists) continue;
      var ns = { id: getNextId(shifts), employee: emp, time: time, date: dateStr };
      shifts.push(ns);
      created.push(ns);
    }
  }

  res.status(201).json({ created: created.length, shifts: created });
});

app.post("/api/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  var found = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password === password) {
      found = users[i];
      break;
    }
  }

  if (!found) {
    res.json({ error: "Invalid credentials" });
    return;
  }

  res.json({
    id: found.id,
    username: found.username,
    role: found.role,
    name: found.name
  });
});

app.post("/api/register", function (req, res) {
  var username = (req.body.username && String(req.body.username).trim()) || "";
  var password = (req.body.password && String(req.body.password)) || "";
  var name = (req.body.name && String(req.body.name).trim()) || username;

  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    res.status(400).json({ error: "Username can only contain letters, numbers, underscore and hyphen" });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }
  for (var i = 0; i < users.length; i++) {
    if (users[i].username.toLowerCase() === username.toLowerCase()) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }

  var newUser = {
    id: getNextId(users),
    username: username,
    password: password,
    role: "employee",
    name: name
  };
  users.push(newUser);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    name: newUser.name
  });
});

app.get("/api/requests/pto", function (req, res) {
  var status = req.query.status;
  var list = ptoRequests;
  if (status) {
    list = [];
    for (var i = 0; i < ptoRequests.length; i++) {
      if (ptoRequests[i].status === status) list.push(ptoRequests[i]);
    }
  }
  res.json(list);
});

app.post("/api/requests/pto", function (req, res) {
  var employee = req.body.employee;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var reason = req.body.reason;

  if (!employee || !startDate || !endDate || !reason) {
    res.status(400).json({ error: "Missing employee, dates, or reason" });
    return;
  }

  var newRequest = {
    id: getNextId(ptoRequests),
    employee: employee.trim(),
    startDate: startDate,
    endDate: endDate,
    reason: reason.trim(),
    requestedAt: new Date().toISOString(),
    status: "pending"
  };
  ptoRequests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch("/api/requests/pto/:id/status", function (req, res) {
  var id = Number(req.params.id);
  var status = req.body.status;

  if (status !== "pending" && status !== "approved" && status !== "denied") {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  var target = null;
  for (var i = 0; i < ptoRequests.length; i++) {
    if (ptoRequests[i].id === id) {
      target = ptoRequests[i];
      break;
    }
  }
  if (!target) {
    res.status(404).json({ error: "PTO request not found" });
    return;
  }
  target.status = status;
  res.json(target);
});

app.get("/api/requests/swaps", function (req, res) {
  var status = req.query.status;
  var list = swapRequests;
  if (status) {
    list = [];
    for (var i = 0; i < swapRequests.length; i++) {
      if (swapRequests[i].status === status) list.push(swapRequests[i]);
    }
  }
  res.json(list);
});

app.post("/api/requests/swaps", function (req, res) {
  var fromEmployee = req.body.fromEmployee;
  var toEmployee = req.body.toEmployee;
  var date = req.body.date;
  var role = req.body.role;
  var time = req.body.time;
  var reason = req.body.reason;

  if (!fromEmployee || !toEmployee || !date || !role || !time || !reason) {
    res.status(400).json({ error: "Missing employee, schedule, or reason data" });
    return;
  }

  var newRequest = {
    id: getNextId(swapRequests),
    fromEmployee: fromEmployee.trim(),
    toEmployee: toEmployee.trim(),
    date: date,
    role: role.trim(),
    time: time.trim(),
    reason: reason.trim(),
    requestedAt: new Date().toISOString(),
    status: "pending"
  };
  swapRequests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch("/api/requests/swaps/:id/status", function (req, res) {
  var id = Number(req.params.id);
  var status = req.body.status;

  if (status !== "pending" && status !== "approved" && status !== "denied") {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  var target = null;
  for (var i = 0; i < swapRequests.length; i++) {
    if (swapRequests[i].id === id) {
      target = swapRequests[i];
      break;
    }
  }
  if (!target) {
    res.status(404).json({ error: "Shift swap request not found" });
    return;
  }
  target.status = status;
  res.json(target);
});

app.get("/api/requests/summary", function (req, res) {
  var pendingPto = 0;
  var pendingSwaps = 0;
  for (var i = 0; i < ptoRequests.length; i++) {
    if (ptoRequests[i].status === "pending") pendingPto++;
  }
  for (var j = 0; j < swapRequests.length; j++) {
    if (swapRequests[j].status === "pending") pendingSwaps++;
  }
  res.json({
    pendingPto: pendingPto,
    pendingSwaps: pendingSwaps,
    pendingTotal: pendingPto + pendingSwaps
  });
});

app.get("/api/employees", function (req, res) {
  var list = [];
  for (var i = 0; i < users.length; i++) {
    list.push({
      id: users[i].id,
      username: users[i].username,
      name: users[i].name,
      role: users[i].role
    });
  }
  res.json(list);
});

app.patch("/api/employees/:id", function (req, res) {
  var id = Number(req.params.id);
  var name = req.body.name;
  var username = req.body.username;
  var password = req.body.password;

  var target = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      target = users[i];
      break;
    }
  }
  if (!target) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  if (name != null && String(name).trim()) {
    target.name = String(name).trim();
  }
  if (username != null) {
    var newUsername = String(username).trim();
    if (newUsername.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      res.status(400).json({ error: "Username can only contain letters, numbers, underscore and hyphen" });
      return;
    }
    for (var u = 0; u < users.length; u++) {
      if (users[u].id !== id && users[u].username.toLowerCase() === newUsername.toLowerCase()) {
        res.status(400).json({ error: "Username already taken" });
        return;
      }
    }
    target.username = newUsername;
  }
  if (password != null && String(password).length > 0) {
    if (String(password).length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }
    target.password = String(password);
  }

  res.json({
    id: target.id,
    username: target.username,
    role: target.role,
    name: target.name
  });
});

app.delete("/api/employees/:id", function (req, res) {
  var id = Number(req.params.id);

  var target = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      target = users[i];
      break;
    }
  }
  if (!target) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  var managerCount = 0;
  for (var m = 0; m < users.length; m++) {
    if (users[m].role === "manager") managerCount++;
  }
  if (target.role === "manager" && managerCount <= 1) {
    res.status(400).json({ error: "Cannot delete the last manager" });
    return;
  }

  users = users.filter(function (u) { return u.id !== id; });
  shifts = shifts.filter(function (s) { return s.employee !== target.name; });
  res.status(204).send();
});

var PORT = 4000;
app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});
