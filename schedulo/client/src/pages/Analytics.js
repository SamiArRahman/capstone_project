import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000/api";

const DEFAULT_SUNDAY_SHIFTS = [
  { employee: "Sami", time: "09:00 - 17:00" },
  { employee: "Krishna", time: "11:00 - 19:00" },
  { employee: "Tigran", time: "10:00 - 18:00" }
];

function parseShiftHours(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.split(/\s*-\s*/).map(s => s.trim());
  if (parts.length < 2) return 0;
  const parse = (t) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };
  const start = parse(parts[0]);
  const end = parse(parts[1]);
  return Math.max(0, end - start);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvFile(filename, csvString) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvString], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function buildWeeklyRequestData(ptoRequests, swapRequests, numWeeks = 8) {
  const now = new Date();
  const weeks = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * i);
    const key = getWeekKey(d);
    const weekStart = new Date(key);
    weeks.push({
      key,
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pto: 0,
      swaps: 0
    });
  }
  const byWeek = {};
  weeks.forEach((w) => { byWeek[w.key] = w; });
  ptoRequests.forEach((r) => {
    const key = getWeekKey(r.requestedAt || r.startDate);
    if (byWeek[key]) byWeek[key].pto += 1;
  });
  swapRequests.forEach((r) => {
    const key = getWeekKey(r.requestedAt);
    if (byWeek[key]) byWeek[key].swaps += 1;
  });
  return weeks;
}

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shifts, setShifts] = useState([]);
  const [ptoRequests, setPtoRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [auditTab, setAuditTab] = useState("All");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [shiftsRes, ptoRes, swapRes] = await Promise.all([
          fetch(`${API_BASE}/shifts`),
          fetch(`${API_BASE}/requests/pto`),
          fetch(`${API_BASE}/requests/swaps`)
        ]);
        const [shiftsData, ptoData, swapData] = await Promise.all([
          shiftsRes.json(),
          ptoRes.json(),
          swapRes.json()
        ]);
        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
        setPtoRequests(Array.isArray(ptoData) ? ptoData : []);
        setSwapRequests(Array.isArray(swapData) ? swapData : []);
      } catch (e) {
        setError(e.message || "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const employeeSet = new Set();
  shifts.forEach((s) => employeeSet.add(s.employee));
  ptoRequests.forEach((r) => employeeSet.add(r.employee));
  swapRequests.forEach((r) => {
    employeeSet.add(r.fromEmployee);
    employeeSet.add(r.toEmployee);
  });
  DEFAULT_SUNDAY_SHIFTS.forEach((s) => employeeSet.add(s.employee));
  const employeeList = Array.from(employeeSet).sort();

  const ptoShiftData = employeeList.map((employee) => {
    const pto = ptoRequests.filter((r) => r.employee === employee);
    const swap = swapRequests.filter((r) => r.fromEmployee === employee);
    const ptoApproved = pto.filter((r) => r.status === "approved").length;
    const ptoDenied = pto.filter((r) => r.status === "denied").length;
    const swapApproved = swap.filter((r) => r.status === "approved").length;
    const swapDenied = swap.filter((r) => r.status === "denied").length;
    return {
      employee,
      pto: pto.length,
      shiftSwap: swap.length,
      approvals: ptoApproved + swapApproved,
      rejections: ptoDenied + swapDenied
    };
  });

  const ptoTotals = {
    pto: ptoRequests.length,
    shiftSwap: swapRequests.length,
    approvals: ptoShiftData.reduce((a, r) => a + r.approvals, 0),
    rejections: ptoShiftData.reduce((a, r) => a + r.rejections, 0)
  };

  const weeklyRequestData = buildWeeklyRequestData(ptoRequests, swapRequests, 8);
  const maxRequests = Math.max(1, ...weeklyRequestData.map((w) => w.pto + w.swaps));

  const activityLog = [];
  ptoRequests.forEach((r) => {
    let action = "PTO Request";
    let actionClass = "tag-beige";
    if (r.status === "approved") {
      action = "Approved PTO";
      actionClass = "tag-green";
    } else if (r.status === "denied") {
      action = "Rejected PTO";
      actionClass = "tag-red";
    }
    activityLog.push({
      timestamp: r.requestedAt,
      user: r.employee,
      role: "Employee",
      action,
      actionClass,
      details: `PTO ${r.startDate} – ${r.endDate}${r.reason ? ` (${r.reason})` : ""}`
    });
  });
  swapRequests.forEach((r) => {
    let action = "Shift Swap Request";
    let actionClass = "tag-beige";
    if (r.status === "approved") {
      action = "Approved Shift Swap";
      actionClass = "tag-green";
    } else if (r.status === "denied") {
      action = "Rejected Shift Swap";
      actionClass = "tag-red";
    }
    activityLog.push({
      timestamp: r.requestedAt,
      user: r.fromEmployee,
      role: "Employee",
      action,
      actionClass,
      details: `Swap: ${r.fromEmployee} → ${r.toEmployee}, ${r.date} ${r.time}`
    });
  });
  activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredActivity =
    auditTab === "Approvals"
      ? activityLog.filter((r) => r.action.startsWith("Approved"))
      : auditTab === "Rejections"
        ? activityLog.filter((r) => r.action.startsWith("Rejected"))
        : activityLog;

  const approvedCount =
    ptoRequests.filter((r) => r.status === "approved").length +
    swapRequests.filter((r) => r.status === "approved").length;
  const rejectedCount =
    ptoRequests.filter((r) => r.status === "denied").length +
    swapRequests.filter((r) => r.status === "denied").length;
  const auditMetrics = {
    actionsToday: 0,
    approvals: approvedCount,
    rejections: rejectedCount,
    scheduleChanges: 0
  };

  const activityTabs = ["All", "Approvals", "Rejections"];

  const hoursByEmployeeMap = {};
  shifts.forEach((s) => {
    const h = parseShiftHours(s.time);
    if (!hoursByEmployeeMap[s.employee]) hoursByEmployeeMap[s.employee] = 0;
    hoursByEmployeeMap[s.employee] += h;
  });
  const apiEmployeeNames = new Set(shifts.map((s) => s.employee));
  DEFAULT_SUNDAY_SHIFTS.forEach((defaultShift) => {
    if (!apiEmployeeNames.has(defaultShift.employee)) {
      const h = parseShiftHours(defaultShift.time);
      if (!hoursByEmployeeMap[defaultShift.employee]) hoursByEmployeeMap[defaultShift.employee] = 0;
      hoursByEmployeeMap[defaultShift.employee] += h;
    }
  });
  const hoursByEmployee = employeeList.map((employee) => {
    const total = hoursByEmployeeMap[employee] ?? 0;
    return {
      employee,
      role: "",
      totalHours: total.toFixed(1),
      overtime: "0.0"
    };
  });
  const totalHoursSum = Object.values(hoursByEmployeeMap).reduce((a, b) => a + b, 0);
  const hoursTotals = { totalHours: totalHoursSum.toFixed(1), overtime: "0.0" };
  const numEmployeesInReport = employeeList.length || 1;
  const resolvedTotal = approvedCount + rejectedCount;
  const reportsMetrics = {
    totalHours: totalHoursSum.toFixed(1),
    avgHours: (totalHoursSum / numEmployeesInReport).toFixed(1),
    ptoRequests: ptoRequests.length,
    approvalRate: resolvedTotal > 0 ? `${Math.round((approvedCount / resolvedTotal) * 100)}%` : "—"
  };

  const downloadCsv = (type) => () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (type === "PTO & Shift Swap") {
      const headers = ["Employee", "PTO Requests", "Shift Swap Requests", "Approvals", "Rejections"];
      const dataRows = ptoShiftData.map((r) =>
        [r.employee, r.pto, r.shiftSwap, r.approvals, r.rejections].map(escapeCsvCell).join(",")
      );
      const totalRow = [escapeCsvCell("Total"), ptoTotals.pto, ptoTotals.shiftSwap, ptoTotals.approvals, ptoTotals.rejections].join(",");
      downloadCsvFile(`pto-shift-swap-activity-${timestamp}.csv`, [headers.map(escapeCsvCell).join(","), ...dataRows, totalRow].join("\r\n"));
    } else if (type === "Hours Worked") {
      const headers = ["Employee", "Role", "Total Hours", "Overtime Hours"];
      const dataRows = hoursByEmployee.map((r) =>
        [r.employee, r.role || "", r.totalHours, r.overtime].map(escapeCsvCell).join(",")
      );
      const totalRow = [escapeCsvCell("Total"), "", hoursTotals.totalHours, hoursTotals.overtime].map(escapeCsvCell).join(",");
      downloadCsvFile(`hours-worked-${timestamp}.csv`, [headers.map(escapeCsvCell).join(","), ...dataRows, totalRow].join("\r\n"));
    } else if (type === "Reports") {
      const summaryLines = [
        "Reports Summary",
        "Metric,Value",
        `Total Hours (This Period),${escapeCsvCell(reportsMetrics.totalHours)}`,
        `Avg Hours / Employee,${escapeCsvCell(reportsMetrics.avgHours)}`,
        `PTO Requests (Total),${reportsMetrics.ptoRequests}`,
        `Approval Rate,${escapeCsvCell(reportsMetrics.approvalRate)}`,
        "",
        "Hours Worked by Employee",
        "Employee,Role,Total Hours,Overtime Hours"
      ];
      const hoursRows = hoursByEmployee.map((r) =>
        [r.employee, r.role || "", r.totalHours, r.overtime].map(escapeCsvCell).join(",")
      );
      const hoursTotalRow = [escapeCsvCell("Total"), "", hoursTotals.totalHours, hoursTotals.overtime].map(escapeCsvCell).join(",");
      downloadCsvFile(`reports-${timestamp}.csv`, [...summaryLines, ...hoursRows, hoursTotalRow].join("\r\n"));
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <p className="analytics-loading">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <section className="info-block analytics-section">
        <div className="analytics-section-head">
          <h3>PTO & Shift Swap Activity</h3>
          <button type="button" className="analytics-link-button" onClick={downloadCsv("PTO & Shift Swap")}>
            Download CSV
          </button>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>PTO Requests</th>
                <th>Shift Swap Requests</th>
                <th>Approvals</th>
                <th>Rejections</th>
              </tr>
            </thead>
            <tbody>
              {ptoShiftData.map((row) => (
                <tr key={row.employee}>
                  <td>{row.employee}</td>
                  <td>{row.pto}</td>
                  <td>{row.shiftSwap}</td>
                  <td><span className="pill pill-green">{row.approvals}</span></td>
                  <td><span className="pill pill-red">{row.rejections}</span></td>
                </tr>
              ))}
              {ptoShiftData.length === 0 ? (
                <tr><td colSpan={5}>No request data yet</td></tr>
              ) : null}
              {ptoShiftData.length > 0 && (
                <tr className="analytics-table-total">
                  <td><strong>Total</strong></td>
                  <td>{ptoTotals.pto}</td>
                  <td>{ptoTotals.shiftSwap}</td>
                  <td><span className="pill pill-green">{ptoTotals.approvals}</span></td>
                  <td><span className="pill pill-red">{ptoTotals.rejections}</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="analytics-formula-note">Approval Rate = Approvals / (Approvals + Rejections)</p>

        <h3 className="analytics-subhead">Requests Per Week</h3>
        <div className="requests-chart">
          <div className="requests-chart-legend">
            <span className="requests-chart-legend-item"><span className="requests-chart-legend-swatch requests-chart-pto" /> PTO</span>
            <span className="requests-chart-legend-item"><span className="requests-chart-legend-swatch requests-chart-swap" /> Shift swaps</span>
          </div>
          <div className="requests-chart-bars">
            {weeklyRequestData.map((week) => (
              <div key={week.key} className="requests-chart-week">
                <div className="requests-chart-bar-group">
                  <div
                    className="requests-chart-bar requests-chart-pto"
                    style={{ height: `${(week.pto / maxRequests) * 100}%` }}
                    title={`PTO: ${week.pto}`}
                  />
                  <div
                    className="requests-chart-bar requests-chart-swap"
                    style={{ height: `${(week.swaps / maxRequests) * 100}%` }}
                    title={`Shift swaps: ${week.swaps}`}
                  />
                </div>
                <span className="requests-chart-label">{week.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="info-block analytics-section">
        <div className="analytics-page-head">
          <div>
            <h2 className="analytics-title">Audit Log</h2>
            <p className="analytics-desc">Track all schedule, PTO, and shift swap changes for accountability</p>
          </div>
          <div className="analytics-filters">
            <select className="analytics-select" defaultValue=""><option value="">All Actions</option></select>
            <select className="analytics-select" defaultValue=""><option value="">This Week</option></select>
          </div>
        </div>
        <div className="stats-grid">
          <article className="stat-card stat-blue analytics-stat">
            <span className="analytics-stat-icon analytics-icon-blue">🕐</span>
            <p>Actions Today</p>
            <h3>{auditMetrics.actionsToday}</h3>
          </article>
          <article className="stat-card stat-green analytics-stat">
            <span className="analytics-stat-icon analytics-icon-green">✓</span>
            <p>Approvals</p>
            <h3>{auditMetrics.approvals}</h3>
          </article>
          <article className="stat-card analytics-stat stat-danger">
            <span className="analytics-stat-icon analytics-icon-red">✕</span>
            <p>Rejections</p>
            <h3>{auditMetrics.rejections}</h3>
          </article>
          <article className="stat-card stat-violet analytics-stat">
            <span className="analytics-stat-icon analytics-icon-violet">📅</span>
            <p>Schedule Changes</p>
            <h3>{auditMetrics.scheduleChanges}</h3>
          </article>
        </div>
        <h3 className="analytics-subhead">Activity History</h3>
        <div className="analytics-tabs">
          {activityTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`analytics-tab-btn ${auditTab === tab ? "analytics-tab-btn-active" : ""}`}
              onClick={() => setAuditTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table analytics-table-audit">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivity.length === 0 ? (
                <tr><td colSpan={5}>No activity recorded</td></tr>
              ) : (
                filteredActivity.map((row, i) => (
                  <tr key={i}>
                    <td>{formatDateTime(row.timestamp)}</td>
                    <td>{row.user}</td>
                    <td>{row.role}</td>
                    <td><span className={`activity-tag ${row.actionClass}`}>{row.action}</span></td>
                    <td>{row.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-block analytics-section">
        <div className="analytics-page-head">
          <div>
            <h2 className="analytics-title">Reports</h2>
            <p className="analytics-desc">Analyze hours worked, request volume, and approval rates</p>
            <p className="analytics-desc-sub">Exports summary data as CSV for payroll or analysis</p>
          </div>
          <button type="button" className="primary-button" onClick={downloadCsv("Reports")}>
            Export CSV
          </button>
        </div>
        <div className="analytics-filters analytics-filters-inline">
          <select className="analytics-select" defaultValue=""><option value="">This Month</option></select>
          <select className="analytics-select" defaultValue=""><option value="">View: All Metrics</option></select>
        </div>
        <div className="stats-grid">
          <article className="stat-card stat-blue analytics-stat">
            <span className="analytics-stat-icon analytics-icon-blue">🕐</span>
            <p>Total Hours (This Period)</p>
            <h3>{reportsMetrics.totalHours}</h3>
          </article>
          <article className="stat-card stat-green analytics-stat">
            <span className="analytics-stat-icon analytics-icon-green">📈</span>
            <p>Avg Hours / Employee</p>
            <h3>{reportsMetrics.avgHours}</h3>
          </article>
          <article className="stat-card stat-violet analytics-stat">
            <span className="analytics-stat-icon analytics-icon-violet">📅</span>
            <p>PTO Requests (Total)</p>
            <h3>{reportsMetrics.ptoRequests}</h3>
          </article>
          <article className="stat-card stat-orange analytics-stat">
            <span className="analytics-stat-icon analytics-icon-orange">📊</span>
            <p>Approval Rate</p>
            <h3>{reportsMetrics.approvalRate}</h3>
          </article>
        </div>
        <div className="analytics-section-head">
          <h3>Hours Worked by Employee</h3>
          <button type="button" className="analytics-link-button" onClick={downloadCsv("Hours Worked")}>
            Download CSV
          </button>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Total Hours</th>
                <th>Overtime Hours</th>
              </tr>
            </thead>
            <tbody>
              {hoursByEmployee.map((row) => (
                <tr key={row.employee}>
                  <td>{row.employee}</td>
                  <td>{row.role || "—"}</td>
                  <td>{row.totalHours}</td>
                  <td className={parseFloat(row.overtime) > 0 ? "overtime-cell" : ""}>{row.overtime}</td>
                </tr>
              ))}
              {hoursByEmployee.length === 0 ? (
                <tr><td colSpan={4}>No shift data yet</td></tr>
              ) : (
                <tr className="analytics-table-total">
                  <td><strong>Total</strong></td>
                  <td></td>
                  <td>{hoursTotals.totalHours}</td>
                  <td className="overtime-cell">{hoursTotals.overtime}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
