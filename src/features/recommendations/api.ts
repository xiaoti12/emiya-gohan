import { apiFetch } from "../../lib/apiClient";
import type { RecommendationQuery, RecommendationResult } from "./types";

function buildQuery(query: RecommendationQuery = {}) {
  const params = new URLSearchParams();
  const category = query.category?.trim();
  if (category && category !== "全部") {
    params.set("category", category);
  }
  if (query.limit != null) {
    params.set("limit", String(query.limit));
  }
  if (query.seed != null) {
    params.set("seed", String(query.seed));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function getRecommendations(
  query: RecommendationQuery = {},
  signal?: AbortSignal,
) {
  return apiFetch<RecommendationResult>(
    `/recommendations/v1${buildQuery(query)}`,
    { signal },
  );
}
