const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VALID_AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const REQUEST_STATUSES = ["pending", "approved", "denied"];
const USER_ROLES = ["manager", "employee"];
const DEFAULT_SHIFT_START = "09:00";
const DEFAULT_SHIFT_END = "17:00";
const DEFAULT_MANAGER = {
  username: process.env.SEED_MANAGER_USERNAME || "manager",
  password: process.env.SEED_MANAGER_PASSWORD || "Manager1234!",
  name: process.env.SEED_MANAGER_NAME || "Store Manager",
  email: process.env.SEED_MANAGER_EMAIL || "manager@schedulo.local"
};
const DEFAULT_EMPLOYEE = {
  username: process.env.SEED_EMPLOYEE_USERNAME || "employee",
  password: process.env.SEED_EMPLOYEE_PASSWORD || "Employee1234!",
  name: process.env.SEED_EMPLOYEE_NAME || "Sample Employee",
  email: process.env.SEED_EMPLOYEE_EMAIL || "employee@schedulo.local"
};

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI || "";
}

function getAllowedCorsOrigins() {
  return String(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return "schedulo-dev-secret-change-me";
}

module.exports = {
  DAY_NAMES,
  DEFAULT_EMPLOYEE,
  DEFAULT_MANAGER,
  DEFAULT_SHIFT_END,
  DEFAULT_SHIFT_START,
  REQUEST_STATUSES,
  USER_ROLES,
  VALID_AVAILABILITY_DAYS,
  getAllowedCorsOrigins,
  getJwtSecret,
  getMongoUri
};
