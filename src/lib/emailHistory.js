const KEY = "email_history_v1";
const MAX = 10;

export function getEmailHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveEmailToHistory(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return;

  try {
    const prev = getEmailHistory();
    const next = [e, ...prev.filter((x) => x !== e)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
