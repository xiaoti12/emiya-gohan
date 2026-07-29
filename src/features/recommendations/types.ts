import type { RecipeListItem } from "../recipes/types";

export type RecommendationQuery = {
  category?: string;
  limit?: number;
  seed?: number;
  /** 排除 cookedAt/创建日 >= 该日期的做过菜（YYYY-MM-DD，本地日历） */
  excludeSince?: string;
};

export type RecommendationResult = {
  items: RecipeListItem[];
};
