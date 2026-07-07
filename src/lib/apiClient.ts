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

async function readPayload<T>(response: Response): Promise<ApiPayload<T>> {
  if (response.status === 204) {
    return { data: null, error: null };
  }

  const text = await response.text();
  if (!text) {
    return { data: null, error: null };
  }

  return JSON.parse(text) as ApiPayload<T>;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const familyId = localStorage.getItem(storageKeys.familyId);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(familyId ? { "X-Family-Id": familyId } : {}),
      ...init.headers,
    },
  });

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
