export function clampString(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

export function parseLegacyRow(dataJson) {
  try {
    const row = JSON.parse(dataJson);
    if (!Array.isArray(row)) return [];
    return row.map(v => v == null ? "" : String(v));
  } catch {
    return [];
  }
}

export function overlayView(dataset, row, count) {
  const out = row.slice();
  if (dataset === "News") {
    while (out.length < 6) out.push("");
    out[5] = String(Number(count || 0));
  } else if (dataset === "Announcements") {
    while (out.length < 5) out.push("");
    out[4] = String(Number(count || 0));
  }
  return out;
}

export function bangkokDisplayDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute}`;
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function constantTimeTextEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
