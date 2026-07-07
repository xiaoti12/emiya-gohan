import { storageKeys } from "../../lib/storageKeys";
import type { Family } from "./types";

export function loadStoredFamily(): Family | null {
  const familyId = localStorage.getItem(storageKeys.familyId);
  const displayName = localStorage.getItem(storageKeys.familyName);

  if (!familyId || !displayName) {
    return null;
  }

  return { familyId, displayName };
}

export function saveStoredFamily(family: Family) {
  localStorage.setItem(storageKeys.familyId, family.familyId);
  localStorage.setItem(storageKeys.familyName, family.displayName);
}

export function clearStoredFamily() {
  localStorage.removeItem(storageKeys.familyId);
  localStorage.removeItem(storageKeys.familyName);
}
