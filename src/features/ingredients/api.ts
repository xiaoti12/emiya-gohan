import { apiFetch } from "../../lib/apiClient";
import type {
  CreateIngredientInput,
  CreateIngredientsResult,
  DeleteIngredientResult,
  Ingredient,
  IngredientCategory,
  UpdateIngredientInput,
} from "./types";

export function listIngredients(category?: IngredientCategory) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<Ingredient[]>(`/ingredients/v1${query}`);
}

export function createIngredients(items: CreateIngredientInput[]) {
  return apiFetch<CreateIngredientsResult>("/ingredients/v1", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function updateIngredient(id: string, input: UpdateIngredientInput) {
  return apiFetch<Ingredient>(`/ingredients/v1/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteIngredient(id: string) {
  return apiFetch<DeleteIngredientResult>(
    `/ingredients/v1/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
