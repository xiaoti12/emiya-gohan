import type { ApiResponse } from "../types";
import { getCorsHeaders } from "./cors";
import type { Env } from "../types";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export function jsonOk<T>(request: Request, env: Env, data: T, status = 200) {
  const body: ApiResponse<T> = { data, error: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...getCorsHeaders(request, env),
    },
  });
}

export function jsonError(
  request: Request,
  env: Env,
  status: number,
  code: string,
  message: string,
) {
  const body: ApiResponse<never> = {
    data: null,
    error: { code, message },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...getCorsHeaders(request, env),
    },
  });
}
