import type { RecipeListItem } from "../recipes/types";

export type RecommendationQuery = {
  category?: string;
  limit?: number;
  seed?: number;
};

export type RecommendationResult = {
  items: RecipeListItem[];
};
