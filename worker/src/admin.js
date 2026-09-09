async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkAdminLogin(password, env) {
  if (!password || !env.ADMIN_PASSWORD_SHA256) return { success: false };
  const supplied = await sha256Hex(password);
  if (supplied !== env.ADMIN_PASSWORD_SHA256.toLowerCase()) return { success: false };
  return { success: true, sheetUrl: env.ADMIN_SHEET_URL || '' };
}
