import { apiFetch } from "../../lib/apiClient";
import { RECIPE_PAGE_SIZE } from "./constants";
import type {
  DeleteRecipeResult,
  RecipeDetail,
  RecipeInput,
  RecipePage,
  RecipeQuery,
} from "./types";

function buildListQuery(query: RecipeQuery = {}) {
  const params = new URLSearchParams();
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.category && query.category !== "全部") {
    params.set("category", query.category);
  }
  if (query.tag && query.tag !== "全部") {
    params.set("tag", query.tag);
  }
  if (query.cursor) params.set("cursor", query.cursor);
  params.set("limit", String(query.limit ?? RECIPE_PAGE_SIZE));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function listRecipes(query: RecipeQuery = {}, signal?: AbortSignal) {
  return apiFetch<RecipePage>(`/recipes/v1${buildListQuery(query)}`, { signal });
}

export function getRecipeById(id: string, signal?: AbortSignal) {
  return apiFetch<RecipeDetail>(`/recipes/v1/${encodeURIComponent(id)}`, { signal });
}

export function createRecipe(input: RecipeInput) {
  return apiFetch<RecipeDetail>("/recipes/v1", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRecipe(id: string, input: RecipeInput) {
  return apiFetch<RecipeDetail>(`/recipes/v1/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteRecipe(id: string) {
  return apiFetch<DeleteRecipeResult>(`/recipes/v1/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
