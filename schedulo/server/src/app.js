const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const { AuditLog, Availability, PtoRequest, Shift, SwapRequest, User, connectToDatabase } = require("./db");
const { DEFAULT_SHIFT_END, DEFAULT_SHIFT_START, DAY_NAMES, REQUEST_STATUSES, VALID_AVAILABILITY_DAYS } = require("./config");
const { comparePassword, hashPassword, signToken, verifyToken } = require("./security");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const app = express();

app.use(cors());
app.use(express.json());

function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  const seen = new Set();
  const result = [];
  skills.forEach((entry) => {
    const clean = String(entry || "").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(clean);
  });
  return result;
}

function timeToMinutes(value) {
  const parts = String(value || "").split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function parseTimeRange(value) {
  const match = String(value || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }
  const startTime = `${match[1]}:${match[2]}`;
  const endTime = `${match[3]}:${match[4]}`;
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return null;
  }
  return { startTime, endTime };
}

function formatTimeRange(startTime, endTime) {
  return `${startTime} - ${endTime}`;
}

function calculateShiftHours(shift) {
  return Math.max(0, (timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime)) / 60);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function getDayName(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return DAY_NAMES[date.getDay()];
}

function getDateRange(startDate, endDate) {
  const result = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  while (current <= end && result.length < 31) {
    result.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function getWeekEndDate(weekStart) {
  const current = new Date(`${weekStart}T12:00:00`);
  current.setDate(current.getDate() + 6);
  return current.toISOString().slice(0, 10);
}

function clampWeekEndDate(weekStart, weekEnd) {
  if (!weekEnd || !isIsoDate(weekEnd)) {
    return getWeekEndDate(weekStart);
  }
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const max = new Date(`${getWeekEndDate(weekStart)}T12:00:00`);
  if (Number.isNaN(end.getTime()) || end < start) {
    return getWeekEndDate(weekStart);
  }
  return (end > max ? max : end).toISOString().slice(0, 10);
}

function serializeUser(user) {
  return {
    id: String(user._id),
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email || "",
    maxHoursPerWeek: user.maxHoursPerWeek != null ? user.maxHoursPerWeek : 40,
    skills: Array.isArray(user.skills) ? user.skills : [],
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

function buildAuthPayload(user) {
  return {
    token: signToken(user),
    user: serializeUser(user)
  };
}

function requireFields(values, response) {
  for (let index = 0; index < values.length; index += 1) {
    if (!values[index].value) {
      response.status(400).json({ error: values[index].message });
      return false;
    }
  }
  return true;
}

function serializeAvailability(record) {
  const user = record.user && record.user._id ? record.user : null;
  return {
    id: String(record._id),
    userId: user ? String(user._id) : String(record.user),
    userName: user ? user.name || user.username : undefined,
    days: Array.isArray(record.days) ? record.days : [],
    timeFrom: record.timeFrom || DEFAULT_SHIFT_START,
    timeTo: record.timeTo || DEFAULT_SHIFT_END,
    updatedAt: record.updatedAt
  };
}

function serializeShift(shift) {
  const employee = shift.employee && shift.employee._id ? shift.employee : null;
  return {
    id: String(shift._id),
    employeeId: employee ? String(employee._id) : String(shift.employee),
    employee: employee ? employee.name || employee.username : "",
    time: formatTimeRange(shift.startTime, shift.endTime),
    date: shift.date,
    role: shift.roleLabel || "Team Member",
    notes: shift.notes || "",
    source: shift.source || "manual",
    createdAt: shift.createdAt
  };
}

function serializePtoRequest(request) {
  const employee = request.employee && request.employee._id ? request.employee : null;
  return {
    id: String(request._id),
    employeeId: employee ? String(employee._id) : String(request.employee),
    employee: employee ? employee.name || employee.username : "",
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    requestedAt: request.createdAt,
    status: request.status,
    reviewedAt: request.reviewedAt
  };
}

function serializeSwapRequest(request) {
  const fromEmployee = request.fromEmployee && request.fromEmployee._id ? request.fromEmployee : null;
  const toEmployee = request.toEmployee && request.toEmployee._id ? request.toEmployee : null;
  return {
    id: String(request._id),
    fromEmployeeId: fromEmployee ? String(fromEmployee._id) : String(request.fromEmployee),
    fromEmployee: fromEmployee ? fromEmployee.name || fromEmployee.username : "",
    toEmployeeId: toEmployee ? String(toEmployee._id) : String(request.toEmployee),
    toEmployee: toEmployee ? toEmployee.name || toEmployee.username : "",
    date: request.date,
    role: request.roleLabel || "Server",
    time: formatTimeRange(request.startTime, request.endTime),
    reason: request.reason,
    requestedAt: request.createdAt,
    status: request.status,
    reviewedAt: request.reviewedAt,
    shiftId: request.shift ? String(request.shift) : null
  };
}

async function logAudit(actor, action, entityType, entityId, details) {
  await AuditLog.create({
    actor: actor ? actor._id : null,
    actorName: actor ? actor.name || actor.username : "System",
    actorRole: actor ? actor.role : "system",
    action,
    entityType,
    entityId: entityId ? String(entityId) : "",
    details: details || {}
  });
}

async function resolveUser(identifier) {
  const clean = String(identifier || "").trim();
  if (!clean) {
    return null;
  }
  if (isValidObjectId(clean)) {
    const byId = await User.findById(clean);
    if (byId) {
      return byId;
    }
  }
  const regex = new RegExp(`^${escapeRegex(clean)}$`, "i");
  return User.findOne({
    $or: [
      { username: regex },
      { name: regex },
      { email: regex }
    ]
  });
}

async function getAvailabilityForUser(userId) {
  return Availability.findOne({ user: userId });
}

async function hasApprovedPto(userId, date) {
  const count = await PtoRequest.countDocuments({
    employee: userId,
    status: "approved",
    startDate: { $lte: date },
    endDate: { $gte: date }
  });
  return count > 0;
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const decoded = verifyToken(header.slice("Bearer ".length));
    const user = await User.findById(decoded.sub);
    if (!user || user.isActive === false) {
      res.status(401).json({ error: "Session is no longer valid" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }
  next();
}

app.use(asyncHandler(async (req, res, next) => {
  await connectToDatabase();
  next();
}));

app.get("/", function rootHandler(req, res) {
  res.json({ ok: true, service: "Schedulo API" });
});

app.get("/api/health", function healthHandler(req, res) {
  res.json({ ok: true });
});

app.post("/api/login", asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");
  if (!requireFields([
    { value: username, message: "Username is required" },
    { value: password, message: "Password is required" }
  ], res)) {
    return;
  }
  const user = await User.findOne({ username });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json(buildAuthPayload(user));
}));

app.post("/api/register", asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");
  const name = String(req.body.name || "").trim() || username;
  const email = String(req.body.email || "").trim();
  const maxHoursPerWeek = Number(req.body.maxHoursPerWeek);
  const skills = normalizeSkills(req.body.skills);
  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (!/^[a-z0-9_-]+$/i.test(username)) {
    res.status(400).json({ error: "Username can only contain letters, numbers, underscore and hyphen" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (await User.findOne({ username })) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  const user = await User.create({
    username,
    passwordHash: await hashPassword(password),
    role: "employee",
    name,
    email,
    maxHoursPerWeek: Number.isFinite(maxHoursPerWeek) && maxHoursPerWeek >= 0 && maxHoursPerWeek <= 168 ? maxHoursPerWeek : 40,
    skills
  });
  await logAudit(user, "employee_registered", "user", user._id, { username: user.username });
  res.status(201).json(buildAuthPayload(user));
}));

app.use("/api", authenticate);

app.get("/api/me", function currentUserHandler(req, res) {
  res.json(serializeUser(req.user));
});

async function ensureEmployeeIsSchedulable(user, date, startTime, endTime) {
  const availability = await getAvailabilityForUser(user._id);
  const dayName = getDayName(date);
  if (!availability || !Array.isArray(availability.days) || availability.days.indexOf(dayName) === -1) {
    return { ok: false, error: "Employee is not available on this day" };
  }
  if (
    timeToMinutes(startTime) < timeToMinutes(availability.timeFrom || DEFAULT_SHIFT_START) ||
    timeToMinutes(endTime) > timeToMinutes(availability.timeTo || DEFAULT_SHIFT_END)
  ) {
    return { ok: false, error: "Shift falls outside the employee's availability window" };
  }
  if (await hasApprovedPto(user._id, date)) {
    return { ok: false, error: "Employee has approved PTO on this date" };
  }
  if (await Shift.findOne({ employee: user._id, date })) {
    return { ok: false, error: "Employee already has a shift on this date" };
  }
  const weekStartDate = new Date(`${date}T12:00:00`);
  const diff = weekStartDate.getDay();
  const mondayOffset = diff === 0 ? -6 : 1 - diff;
  weekStartDate.setDate(weekStartDate.getDate() + mondayOffset);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const weekEnd = getWeekEndDate(weekStart);
  const weekShifts = await Shift.find({
    employee: user._id,
    date: { $gte: weekStart, $lte: weekEnd }
  });
  const projectedHours = weekShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0) +
    ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 60);
  if (projectedHours > (user.maxHoursPerWeek || 40)) {
    return { ok: false, error: "Shift would exceed the employee's max hours for the week" };
  }
  return { ok: true };
}

app.get("/api/employees", asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true }).sort({ role: 1, name: 1, username: 1 });
  res.json(users.map(serializeUser));
}));

app.post("/api/employees", requireManager, asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || "");
  const name = String(req.body.name || "").trim() || username;
  const email = String(req.body.email || "").trim();
  const maxHoursPerWeek = Number(req.body.maxHoursPerWeek);
  const skills = normalizeSkills(req.body.skills);
  const role = req.body.role === "manager" ? "manager" : "employee";
  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (!/^[a-z0-9_-]+$/i.test(username)) {
    res.status(400).json({ error: "Username can only contain letters, numbers, underscore and hyphen" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (await User.findOne({ username })) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  const user = await User.create({
    username,
    passwordHash: await hashPassword(password),
    role,
    name,
    email,
    maxHoursPerWeek: Number.isFinite(maxHoursPerWeek) && maxHoursPerWeek >= 0 && maxHoursPerWeek <= 168 ? maxHoursPerWeek : 40,
    skills
  });
  await logAudit(req.user, "employee_created", "user", user._id, { username: user.username, role: user.role });
  res.status(201).json(serializeUser(user));
}));

app.patch("/api/employees/:id", requireManager, asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee || employee.isActive === false) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (req.body.name != null && String(req.body.name).trim()) {
    employee.name = String(req.body.name).trim();
  }
  if (req.body.email != null) {
    employee.email = String(req.body.email).trim();
  }
  if (req.body.maxHoursPerWeek != null) {
    const maxHoursPerWeek = Number(req.body.maxHoursPerWeek);
    if (!Number.isFinite(maxHoursPerWeek) || maxHoursPerWeek < 0 || maxHoursPerWeek > 168) {
      res.status(400).json({ error: "Max hours per week must be between 0 and 168" });
      return;
    }
    employee.maxHoursPerWeek = maxHoursPerWeek;
  }
  if (req.body.skills != null) {
    employee.skills = normalizeSkills(req.body.skills);
  }
  if (req.body.username != null) {
    const nextUsername = normalizeUsername(req.body.username);
    if (nextUsername.length < 3 || !/^[a-z0-9_-]+$/i.test(nextUsername)) {
      res.status(400).json({ error: "Username must be at least 3 characters and use valid characters" });
      return;
    }
    if (await User.findOne({ username: nextUsername, _id: { $ne: employee._id } })) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    employee.username = nextUsername;
  }
  if (req.body.password != null && String(req.body.password)) {
    if (String(req.body.password).length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    employee.passwordHash = await hashPassword(req.body.password);
  }
  await employee.save();
  await logAudit(req.user, "employee_updated", "user", employee._id, { username: employee.username });
  res.json(serializeUser(employee));
}));

app.delete("/api/employees/:id", requireManager, asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee || employee.isActive === false) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (employee.role === "manager") {
    const managerCount = await User.countDocuments({ role: "manager", isActive: true });
    if (managerCount <= 1) {
      res.status(400).json({ error: "Cannot delete the last manager" });
      return;
    }
  }
  employee.isActive = false;
  await employee.save();
  await Promise.all([
    Availability.deleteOne({ user: employee._id }),
    Shift.deleteMany({ employee: employee._id }),
    PtoRequest.deleteMany({ employee: employee._id }),
    SwapRequest.deleteMany({ $or: [{ fromEmployee: employee._id }, { toEmployee: employee._id }] })
  ]);
  await logAudit(req.user, "employee_deleted", "user", employee._id, { username: employee.username });
  res.status(204).send();
}));

app.get("/api/availability", asyncHandler(async (req, res) => {
  const requestedUserId = String(req.query.userId || req.user._id);
  if (requestedUserId !== String(req.user._id) && req.user.role !== "manager") {
    res.status(403).json({ error: "You can only view your own availability" });
    return;
  }
  const record = await Availability.findOne({ user: requestedUserId }).populate("user", "name username");
  res.json(record ? serializeAvailability(record) : {});
}));

app.get("/api/availability/all", asyncHandler(async (req, res) => {
  const records = await Availability.find({}).populate("user", "name username isActive");
  res.json(records.filter((record) => record.user && record.user.isActive !== false).map(serializeAvailability));
}));

app.put("/api/availability", asyncHandler(async (req, res) => {
  const targetUserId = req.user.role === "manager" && req.body.userId ? String(req.body.userId) : String(req.user._id);
  if (!isValidObjectId(targetUserId)) {
    res.status(400).json({ error: "Valid userId is required" });
    return;
  }
  const targetUser = await User.findById(targetUserId);
  if (!targetUser || targetUser.isActive === false) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const days = Array.isArray(req.body.days) ? req.body.days.filter((entry) => VALID_AVAILABILITY_DAYS.includes(entry)) : [];
  const timeFrom = String(req.body.timeFrom || DEFAULT_SHIFT_START).trim();
  const timeTo = String(req.body.timeTo || DEFAULT_SHIFT_END).trim();
  if (!/^\d{2}:\d{2}$/.test(timeFrom) || !/^\d{2}:\d{2}$/.test(timeTo) || timeToMinutes(timeTo) <= timeToMinutes(timeFrom)) {
    res.status(400).json({ error: "Availability time range is invalid" });
    return;
  }
  const record = await Availability.findOneAndUpdate(
    { user: targetUser._id },
    { user: targetUser._id, days, timeFrom, timeTo, updatedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("user", "name username");
  await logAudit(req.user, "availability_saved", "availability", record._id, { userId: String(targetUser._id), days });
  res.json(serializeAvailability(record));
}));

app.get("/api/shifts", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.weekStart && isIsoDate(req.query.weekStart)) {
    filter.date = { $gte: req.query.weekStart, $lte: clampWeekEndDate(req.query.weekStart, req.query.weekEnd) };
  }
  const shifts = await Shift.find(filter).sort({ date: 1, startTime: 1 }).populate("employee", "name username");
  res.json(shifts.map(serializeShift));
}));

app.post("/api/shifts", requireManager, asyncHandler(async (req, res) => {
  const employee = await resolveUser(req.body.employeeId || req.body.employee);
  const date = String(req.body.date || "").trim();
  const roleLabel = String(req.body.role || "Team Member").trim() || "Team Member";
  const parsedTime = parseTimeRange(req.body.time);
  if (!employee || employee.isActive === false) {
    res.status(400).json({ error: "Employee not found" });
    return;
  }
  if (!isIsoDate(date)) {
    res.status(400).json({ error: "A valid shift date is required" });
    return;
  }
  if (!parsedTime) {
    res.status(400).json({ error: "Time must look like 09:00 - 17:00" });
    return;
  }
  const schedulable = await ensureEmployeeIsSchedulable(employee, date, parsedTime.startTime, parsedTime.endTime);
  if (!schedulable.ok) {
    res.status(400).json({ error: schedulable.error });
    return;
  }
  const shift = await Shift.create({
    employee: employee._id,
    date,
    startTime: parsedTime.startTime,
    endTime: parsedTime.endTime,
    roleLabel,
    source: "manual",
    createdBy: req.user._id
  });
  await shift.populate("employee", "name username");
  await logAudit(req.user, "shift_created", "shift", shift._id, { employeeId: String(employee._id), date, time: req.body.time });
  res.status(201).json(serializeShift(shift));
}));

app.delete("/api/shifts/clear", requireManager, asyncHandler(async (req, res) => {
  const result = await Shift.deleteMany({});
  await logAudit(req.user, "schedule_cleared", "shift", "all", { removed: result.deletedCount || 0 });
  res.json({ removed: result.deletedCount || 0 });
}));

app.delete("/api/shifts/week", requireManager, asyncHandler(async (req, res) => {
  const weekStart = String(req.query.weekStart || "").trim();
  if (!isIsoDate(weekStart)) {
    res.status(400).json({ error: "weekStart (YYYY-MM-DD) is required" });
    return;
  }
  const weekEnd = clampWeekEndDate(weekStart, req.query.weekEnd);
  const result = await Shift.deleteMany({ date: { $gte: weekStart, $lte: weekEnd } });
  await logAudit(req.user, "schedule_week_cleared", "shift", weekStart, { weekStart, weekEnd, removed: result.deletedCount || 0 });
  res.json({ removed: result.deletedCount || 0 });
}));

app.post("/api/schedules/generate", requireManager, asyncHandler(async (req, res) => {
  const weekStart = String(req.body.weekStart || "").trim();
  if (!isIsoDate(weekStart)) {
    res.status(400).json({ error: "weekStart (YYYY-MM-DD) is required" });
    return;
  }
  const weekEnd = clampWeekEndDate(weekStart, req.body.weekEnd);
  const cleanFirst = req.body.cleanFirst === true || req.body.cleanFirst === "true";
  if (cleanFirst) {
    await Shift.deleteMany({ date: { $gte: weekStart, $lte: weekEnd } });
  }
  const daysInRange = getDateRange(weekStart, weekEnd);
  const employees = await User.find({ isActive: true }).sort({ role: 1, name: 1, username: 1 });
  const availabilityRecords = await Availability.find({ user: { $in: employees.map((employee) => employee._id) } });
  const availabilityMap = new Map(availabilityRecords.map((record) => [String(record.user), record]));
  const existingShifts = await Shift.find({ employee: { $in: employees.map((employee) => employee._id) }, date: { $gte: weekStart, $lte: weekEnd } });
  const existingShiftKeys = new Set(existingShifts.map((shift) => `${shift.employee}:${shift.date}`));
  const hoursByUser = new Map();
  existingShifts.forEach((shift) => {
    const key = String(shift.employee);
    hoursByUser.set(key, (hoursByUser.get(key) || 0) + calculateShiftHours(shift));
  });
  const approvedPto = await PtoRequest.find({ employee: { $in: employees.map((employee) => employee._id) }, status: "approved", startDate: { $lte: weekEnd }, endDate: { $gte: weekStart } });
  const ptoByEmployee = new Map();
  approvedPto.forEach((request) => {
    const key = String(request.employee);
    const dates = ptoByEmployee.get(key) || new Set();
    getDateRange(request.startDate, request.endDate).forEach((date) => dates.add(date));
    ptoByEmployee.set(key, dates);
  });
  const created = [];
  for (let dayIndex = 0; dayIndex < daysInRange.length; dayIndex += 1) {
    const date = daysInRange[dayIndex];
    const dayName = getDayName(date);
    const availableEmployees = employees.filter((employee) => {
      const availability = availabilityMap.get(String(employee._id));
      const shiftHours = availability ? Math.max(0, (timeToMinutes(availability.timeTo) - timeToMinutes(availability.timeFrom)) / 60) : 0;
      return availability &&
        availability.days.indexOf(dayName) >= 0 &&
        !existingShiftKeys.has(`${employee._id}:${date}`) &&
        !(ptoByEmployee.get(String(employee._id)) || new Set()).has(date) &&
        (hoursByUser.get(String(employee._id)) || 0) + shiftHours <= (employee.maxHoursPerWeek || 40);
    }).sort((left, right) => {
      const leftHours = hoursByUser.get(String(left._id)) || 0;
      const rightHours = hoursByUser.get(String(right._id)) || 0;
      if (leftHours !== rightHours) return leftHours - rightHours;
      if (left.role !== right.role) return left.role === "employee" ? -1 : 1;
      return String(left.name || left.username).localeCompare(String(right.name || right.username));
    });
    for (let slotIndex = 0; slotIndex < Math.min(3, availableEmployees.length); slotIndex += 1) {
      const employee = availableEmployees[slotIndex];
      const availability = availabilityMap.get(String(employee._id));
      const shift = await Shift.create({
        employee: employee._id,
        date,
        startTime: availability.timeFrom || DEFAULT_SHIFT_START,
        endTime: availability.timeTo || DEFAULT_SHIFT_END,
        roleLabel: "Team Member",
        source: "auto",
        createdBy: req.user._id
      });
      hoursByUser.set(String(employee._id), (hoursByUser.get(String(employee._id)) || 0) + calculateShiftHours(shift));
      existingShiftKeys.add(`${employee._id}:${date}`);
      await shift.populate("employee", "name username");
      created.push(serializeShift(shift));
    }
  }
  await logAudit(req.user, "schedule_generated", "shift", weekStart, { weekStart, weekEnd, cleanFirst, created: created.length });
  res.status(201).json({ created: created.length, shifts: created });
}));

app.get("/api/requests/pto", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && REQUEST_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (req.user.role !== "manager") {
    filter.employee = req.user._id;
  }
  const requests = await PtoRequest.find(filter).sort({ createdAt: -1 }).populate("employee", "name username");
  res.json(requests.map(serializePtoRequest));
}));

app.post("/api/requests/pto", asyncHandler(async (req, res) => {
  const employee = req.user.role === "manager" ? await resolveUser(req.body.employeeId || req.body.employee) : req.user;
  const startDate = String(req.body.startDate || "").trim();
  const endDate = String(req.body.endDate || "").trim();
  const reason = String(req.body.reason || "").trim();
  if (!employee || employee.isActive === false) {
    res.status(400).json({ error: "Employee not found" });
    return;
  }
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) {
    res.status(400).json({ error: "A valid PTO date range is required" });
    return;
  }
  if (!reason) {
    res.status(400).json({ error: "Reason is required" });
    return;
  }
  if (await PtoRequest.findOne({ employee: employee._id, status: { $in: ["pending", "approved"] }, startDate: { $lte: endDate }, endDate: { $gte: startDate } })) {
    res.status(409).json({ error: "A PTO request already exists for this time range" });
    return;
  }
  const request = await PtoRequest.create({ employee: employee._id, startDate, endDate, reason });
  await request.populate("employee", "name username");
  await logAudit(req.user, "pto_requested", "pto_request", request._id, { employeeId: String(employee._id), startDate, endDate });
  res.status(201).json(serializePtoRequest(request));
}));

app.patch("/api/requests/pto/:id/status", requireManager, asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").trim();
  if (!REQUEST_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }
  const request = await PtoRequest.findById(req.params.id).populate("employee", "name username");
  if (!request) {
    res.status(404).json({ error: "PTO request not found" });
    return;
  }
  request.status = status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  if (status === "approved") {
    await Shift.deleteMany({ employee: request.employee._id, date: { $gte: request.startDate, $lte: request.endDate } });
  }
  await logAudit(req.user, "pto_status_updated", "pto_request", request._id, { status });
  res.json(serializePtoRequest(request));
}));

app.get("/api/requests/swaps", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && REQUEST_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (req.user.role !== "manager") {
    filter.$or = [{ fromEmployee: req.user._id }, { toEmployee: req.user._id }];
  }
  const requests = await SwapRequest.find(filter).sort({ createdAt: -1 }).populate("fromEmployee", "name username").populate("toEmployee", "name username");
  res.json(requests.map(serializeSwapRequest));
}));

app.post("/api/requests/swaps", asyncHandler(async (req, res) => {
  const fromEmployee = req.user.role === "manager" ? await resolveUser(req.body.fromEmployeeId || req.body.fromEmployee) : req.user;
  const toEmployee = await resolveUser(req.body.toEmployeeId || req.body.toEmployee);
  const date = String(req.body.date || "").trim();
  const roleLabel = String(req.body.role || "Server").trim() || "Server";
  const parsedTime = parseTimeRange(req.body.time);
  const reason = String(req.body.reason || "").trim();
  if (!fromEmployee || fromEmployee.isActive === false || !toEmployee || toEmployee.isActive === false) {
    res.status(400).json({ error: "Both employees must exist" });
    return;
  }
  if (String(fromEmployee._id) === String(toEmployee._id)) {
    res.status(400).json({ error: "Swap target must be a different employee" });
    return;
  }
  if (!isIsoDate(date) || !parsedTime || !reason) {
    res.status(400).json({ error: "Date, time, and reason are required" });
    return;
  }
  const shift = await Shift.findOne({ employee: fromEmployee._id, date, startTime: parsedTime.startTime, endTime: parsedTime.endTime });
  if (!shift) {
    res.status(400).json({ error: "No matching shift was found for the employee on that date and time" });
    return;
  }
  if (await SwapRequest.findOne({ shift: shift._id, status: "pending" })) {
    res.status(409).json({ error: "A pending swap request already exists for that shift" });
    return;
  }
  const request = await SwapRequest.create({
    fromEmployee: fromEmployee._id,
    toEmployee: toEmployee._id,
    shift: shift._id,
    date,
    roleLabel,
    startTime: parsedTime.startTime,
    endTime: parsedTime.endTime,
    reason
  });
  await request.populate("fromEmployee", "name username");
  await request.populate("toEmployee", "name username");
  await logAudit(req.user, "swap_requested", "swap_request", request._id, { shiftId: String(shift._id), date });
  res.status(201).json(serializeSwapRequest(request));
}));

app.patch("/api/requests/swaps/:id/status", requireManager, asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").trim();
  if (!REQUEST_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }
  const request = await SwapRequest.findById(req.params.id).populate("fromEmployee", "name username maxHoursPerWeek").populate("toEmployee", "name username maxHoursPerWeek");
  if (!request) {
    res.status(404).json({ error: "Shift swap request not found" });
    return;
  }
  if (status === "approved") {
    const shift = await Shift.findById(request.shift);
    if (!shift) {
      res.status(400).json({ error: "The original shift no longer exists" });
      return;
    }
    const schedulable = await ensureEmployeeIsSchedulable(request.toEmployee, request.date, request.startTime, request.endTime);
    if (!schedulable.ok) {
      res.status(400).json({ error: schedulable.error });
      return;
    }
    shift.employee = request.toEmployee._id;
    shift.roleLabel = request.roleLabel || shift.roleLabel;
    shift.source = "swap";
    await shift.save();
  }
  request.status = status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  await logAudit(req.user, "swap_status_updated", "swap_request", request._id, { status });
  res.json(serializeSwapRequest(request));
}));

app.get("/api/requests/summary", asyncHandler(async (req, res) => {
  const ptoFilter = { status: "pending" };
  const swapFilter = { status: "pending" };
  if (req.user.role !== "manager") {
    ptoFilter.employee = req.user._id;
    swapFilter.$or = [{ fromEmployee: req.user._id }, { toEmployee: req.user._id }];
  }
  const [pendingPto, pendingSwaps] = await Promise.all([
    PtoRequest.countDocuments(ptoFilter),
    SwapRequest.countDocuments(swapFilter)
  ]);
  res.json({ pendingPto, pendingSwaps, pendingTotal: pendingPto + pendingSwaps });
}));

app.get("/api/audit", requireManager, asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(250);
  res.json(logs.map((entry) => ({
    id: String(entry._id),
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
    createdAt: entry.createdAt
  })));
}));

app.use(function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error && error.code === 11000) {
    res.status(409).json({ error: "A record with that value already exists" });
    return;
  }
  res.status(500).json({ error: error && error.message ? error.message : "Unexpected server error" });
});

module.exports = app;
