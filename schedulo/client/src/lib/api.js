const API_BASE = process.env.REACT_APP_API_BASE || "/api";
const STORAGE_KEY = "schedulo.session";

export function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token || !parsed.user) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

export function storeSession(session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function apiFetch(path, options = {}) {
  const session = loadStoredSession();
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const pathPart = String(path || "").startsWith("/") ? path : `/${path}`;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session && session.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE}${pathPart}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data && data.error ? data.error : `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_BASE };
