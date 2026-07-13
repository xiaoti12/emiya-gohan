import { apiFetch } from "../../lib/apiClient";
import type { Family } from "./types";

export type VerifyFamilyInput =
  | { familyId: string; displayName?: never }
  | { displayName: string; familyId?: never };

export function createFamily(displayName: string) {
  return apiFetch<Family>("/families/v1", {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

export function verifyFamily(input: VerifyFamilyInput) {
  return apiFetch<Family>("/families/verify/v1", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
