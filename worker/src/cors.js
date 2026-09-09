export function corsHeaders(env, request) {
  const configured = String(env.ALLOWED_ORIGIN || "").trim();
  const requestOrigin = request.headers.get("Origin") || "";

  let origin = "*";
  if (configured) {
    origin = requestOrigin === configured ? configured : "null";
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

export function jsonResponse(env, request, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(env, request)
    }
  });
}

export function success(env, request, data) {
  return jsonResponse(env, request, { status: "success", data });
}

export function failure(env, request, message, status = 400) {
  return jsonResponse(env, request, { status: "error", message }, status);
}
