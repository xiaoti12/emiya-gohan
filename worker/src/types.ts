export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
}

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiErrorBody };

export type RouteHandler = (
  request: Request,
  env: Env,
  params?: Record<string, string>,
) => Promise<Response> | Response;
