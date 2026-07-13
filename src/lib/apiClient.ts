import { ApiError } from "./errors";
import { storageKeys } from "./storageKeys";

type ApiPayload<T> = {
  data: T | null;
  error: null | {
    code: string;
    message: string;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function isApiPayload<T>(value: unknown): value is ApiPayload<T> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  if (!("data" in payload) || !("error" in payload)) {
    return false;
  }

  if (payload.error === null) return true;
  if (typeof payload.error !== "object" || Array.isArray(payload.error)) {
    return false;
  }

  const error = payload.error as Record<string, unknown>;
  return typeof error.code === "string" && typeof error.message === "string";
}

async function readPayload<T>(response: Response): Promise<ApiPayload<T>> {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("NETWORK_ERROR", "网络不太稳定，请稍后再试");
  }
  if (!text) {
    if (response.status === 204) {
      return { data: null, error: null };
    }

    throw new ApiError(
      response.ok ? "INVALID_RESPONSE" : "REQUEST_FAILED",
      "服务返回了无法识别的内容，请稍后再试",
      response.status,
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ApiError(
      response.ok ? "INVALID_RESPONSE" : "REQUEST_FAILED",
      "服务返回了无法识别的内容，请稍后再试",
      response.status,
    );
  }

  if (!isApiPayload<T>(value)) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "服务返回了无法识别的内容，请稍后再试",
      response.status,
    );
  }

  return value;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const familyId = localStorage.getItem(storageKeys.familyId);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(familyId ? { "X-Family-Id": familyId } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError("NETWORK_ERROR", "网络不太稳定，请稍后再试");
  }

  const payload = await readPayload<T>(response);
  if (!response.ok || payload.error) {
    throw new ApiError(
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? "网络不太稳定，请稍后再试",
      response.status,
    );
  }

  return payload.data as T;
}
