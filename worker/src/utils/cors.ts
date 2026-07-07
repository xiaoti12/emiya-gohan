import type { Env } from "../types";

const defaultMethods = "GET,POST,PATCH,DELETE,OPTIONS";
const defaultHeaders = "Content-Type,X-Family-Id";

function parseAllowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(env);

  if (!origin || !allowedOrigins.includes(origin)) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": defaultMethods,
    "Access-Control-Allow-Headers": defaultHeaders,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleOptions(request: Request, env: Env) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, env),
  });
}
