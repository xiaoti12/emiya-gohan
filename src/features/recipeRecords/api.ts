import { mockRecipeRecords } from "./mock";
import type { CreateRecipeRecordInput, RecipeRecord } from "./types";

let localRecords = [...mockRecipeRecords];

export async function listRecipeRecords() {
  return localRecords;
}

export async function createRecipeRecord(input: CreateRecipeRecordInput) {
  const record: RecipeRecord = {
    id: `record-local-${crypto.randomUUID()}`,
    ...input,
  };
  localRecords = [record, ...localRecords];
  return record;
}
