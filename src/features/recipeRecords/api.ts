import { apiFetch } from "../../lib/apiClient";
import type {
  CreateRecipeRecordInput,
  DeleteRecipeRecordResult,
  RecipeRecord,
  RecipeRecordType,
} from "./types";

export function listRecipeRecords(recordType?: RecipeRecordType, signal?: AbortSignal) {
  const query = recordType ? `?recordType=${recordType}` : "";
  return apiFetch<RecipeRecord[]>(`/recipe-records/v1${query}`, { signal });
}

export function createRecipeRecord(input: CreateRecipeRecordInput) {
  return apiFetch<RecipeRecord>("/recipe-records/v1", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteRecipeRecord(id: string) {
  return apiFetch<DeleteRecipeRecordResult>(
    `/recipe-records/v1/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}