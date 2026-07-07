import { mockFamily } from "./mock";
import { loadStoredFamily, saveStoredFamily } from "./familyStore";
import type { Family } from "./types";

export async function getCurrentFamily(): Promise<Family> {
  const storedFamily = loadStoredFamily();

  if (storedFamily) {
    return storedFamily;
  }

  saveStoredFamily(mockFamily);
  return mockFamily;
}
