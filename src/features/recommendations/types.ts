import type { Recipe } from "../recipes/types";

export type RecommendationQuery = {
  tag?: string;
  limit?: number;
  seed?: number;
};

export type RecommendationResult = {
  items: Recipe[];
};
