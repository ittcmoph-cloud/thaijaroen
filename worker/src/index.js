import { corsHeaders, failure } from "./cors.js";
import { D1Repository } from "./repository.js";
import { routeRequest } from "./router.js";

export async function handleRequest(request, env, repoOverride = null) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(env, request)
    });
  }

  try {
    const repo = repoOverride || new D1Repository(env.DB);
    return await routeRequest(request, env, repo);
  } catch (error) {
    console.error("Worker error:", error);
    return failure(env, request, "เกิดข้อผิดพลาดภายในระบบ", 500);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
