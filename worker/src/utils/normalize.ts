export function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

import { HttpError } from "./httpError";

export function requireNonEmpty(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "INVALID_INPUT", `${fieldName} 不能为空`);
  }

  return value.trim();
}
