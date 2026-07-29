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
  if (query.excludeSince) {
    params.set("excludeSince", query.excludeSince);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** 最近 7 个日历日（含今天）做过的菜不推荐 */
export const RECENT_COOKED_EXCLUDE_DAYS = 7;

export function getRecommendations(
  query: RecommendationQuery = {},
  signal?: AbortSignal,
) {
  return apiFetch<RecommendationResult>(
    `/recommendations/v1${buildQuery(query)}`,
    { signal },
  );
}
