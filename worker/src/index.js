import { route, success, error } from './router.js';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
    'access-control-allow-methods': ALLOWED_METHODS,
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), request, env);
      const url = new URL(request.url);
      if (url.pathname !== '/api' && url.pathname !== '/api/') return withCors(error('Not Found', 404), request, env);
      return withCors(await route(request, env), request, env);
    } catch (err) {
      console.error(err);
      return withCors(error(err?.message || String(err), 500), request, env);
    }
  }
};
