const nodemailer = require("nodemailer");

let cachedTransport = null;
let cachedTransportKey = "";

function parseBoolean(value, fallback) {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim().toLowerCase() === "true";
}

function getEmailSettings() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: String(process.env.SMTP_HOST || "").trim(),
    port: Number.isFinite(port) ? port : 587,
    secure: parseBoolean(process.env.SMTP_SECURE, port === 465),
    user: String(process.env.SMTP_USER || "").trim(),
    pass: String(process.env.SMTP_PASS || "").trim(),
    from: String(process.env.EMAIL_FROM || process.env.SMTP_FROM || "").trim()
  };
}

function isEmailConfigured() {
  const settings = getEmailSettings();
  return Boolean(settings.host && settings.port && settings.user && settings.pass && settings.from);
}

function getTransport() {
  const settings = getEmailSettings();
  if (!isEmailConfigured()) {
    return null;
  }

  const transportKey = JSON.stringify([
    settings.host,
    settings.port,
    settings.secure,
    settings.user,
    settings.pass
  ]);

  if (!cachedTransport || cachedTransportKey !== transportKey) {
    cachedTransport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass
      }
    });
    cachedTransportKey = transportKey;
  }

  return cachedTransport;
}

function buildShiftLine(shift) {
  return `- ${shift.date}: ${shift.time} (${shift.role || "Team Member"})`;
}

function buildScheduleText(employeeName, weekStart, weekEnd, shifts) {
  const lines = shifts.map(buildShiftLine);
  return [
    `Hi ${employeeName},`,
    "",
    `Your schedule for ${weekStart} to ${weekEnd} has been finalized.`,
    "",
    "Shifts:",
    lines.join("\n"),
    "",
    "Please sign in to Schedulo if you need to review details or request changes.",
    "",
    "Schedulo"
  ].join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildScheduleHtml(employeeName, weekStart, weekEnd, shifts) {
  const items = shifts.map((shift) => {
    return `<li><strong>${escapeHtml(shift.date)}</strong>: ${escapeHtml(shift.time)} (${escapeHtml(shift.role || "Team Member")})</li>`;
  }).join("");

  return [
    `<p>Hi ${escapeHtml(employeeName)},</p>`,
    `<p>Your schedule for <strong>${escapeHtml(weekStart)}</strong> to <strong>${escapeHtml(weekEnd)}</strong> has been finalized.</p>`,
    "<p>Shifts:</p>",
    `<ul>${items}</ul>`,
    "<p>Please sign in to Schedulo if you need to review details or request changes.</p>",
    "<p>Schedulo</p>"
  ].join("");
}

async function sendScheduleFinalizedEmail(payload) {
  const settings = getEmailSettings();
  const transport = getTransport();

  if (!transport) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM on the backend.");
  }

  await transport.sendMail({
    from: settings.from,
    to: payload.to,
    subject: `Your schedule for ${payload.weekStart} to ${payload.weekEnd}`,
    text: buildScheduleText(payload.employeeName, payload.weekStart, payload.weekEnd, payload.shifts),
    html: buildScheduleHtml(payload.employeeName, payload.weekStart, payload.weekEnd, payload.shifts)
  });
}

module.exports = {
  isEmailConfigured,
  sendScheduleFinalizedEmail
};
