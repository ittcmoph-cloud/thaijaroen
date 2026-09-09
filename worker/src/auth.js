import { constantTimeTextEqual, sha256Hex } from "./utils.js";

export async function checkAdminPassword(env, password) {
  const expected = String(env.ADMIN_PASSWORD_SHA256 || "").toLowerCase().trim();
  if (!expected || expected.length !== 64) {
    throw new Error("ADMIN_PASSWORD_SHA256 is not configured");
  }

  const actual = await sha256Hex(String(password || ""));
  return constantTimeTextEqual(actual, expected);
}
