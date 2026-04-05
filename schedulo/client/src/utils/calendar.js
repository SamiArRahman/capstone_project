export function parseYmdLocal(ymd) {
  var p = String(ymd || "").trim().split("-");
  if (p.length !== 3) return new Date(NaN);
  var y = Number(p[0]);
  var m = Number(p[1]) - 1;
  var day = Number(p[2]);
  return new Date(y, m, day);
}

export function formatYmdLocal(d) {
  if (Number.isNaN(d.getTime())) return "";
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1);
  if (m.length === 1) m = "0" + m;
  var day = String(d.getDate());
  if (day.length === 1) day = "0" + day;
  return y + "-" + m + "-" + day;
}

export function addDaysYmdLocal(ymd, delta) {
  var d = parseYmdLocal(ymd);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + delta);
  return formatYmdLocal(d);
}

export function getWeekMondayYmdToday() {
  var d = new Date();
  var day = d.getDay();
  var diff = d.getDate() - (day === 0 ? 6 : day - 1);
  var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(diff);
  return formatYmdLocal(monday);
}

export function getWeekMondayYmdFromAny(input) {
  var d;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    d = parseYmdLocal(input.trim());
  } else {
    d = new Date(input);
  }
  if (Number.isNaN(d.getTime())) return formatYmdLocal(new Date());
  var day = d.getDay();
  var diff = d.getDate() - (day === 0 ? 6 : day - 1);
  var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(diff);
  return formatYmdLocal(monday);
}
