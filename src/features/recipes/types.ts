export type RecipeSource = "howtocook" | "custom";

export type RecipeIngredient = {
  name: string;
  amount: string;
};

export type RecipeListItem = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  source: RecipeSource;
  parentRecipeId: string | null;
  summary: string;
  coverImageUrl: string | null;
  ingredients: RecipeIngredient[];
};

export type RecipeDetail = RecipeListItem & {
  familyVersionId: string | null;
  steps: string[];
  updatedAt: string;
};

/** 首页推荐 mock 使用的精简类型；真实菜谱请用 RecipeListItem / RecipeDetail */
export type Recipe = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  source: RecipeSource;
  summary: string;
  coverImageUrl?: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
};

export type RecipePage = {
  items: RecipeListItem[];
  nextId: string | null;
};

export type RecipeQuery = {
  q?: string;
  category?: string;
  tag?: string;
  cursor?: string | null;
  limit?: number;
};

export type RecipeInput = {
  name?: string;
  category?: string;
  tags?: string[];
  summary?: string;
  ingredients?: Array<{ name: string; amount?: string }>;
  steps?: string[];
};

export type DeleteRecipeResult = {
  deletedId: string;
};

export function formatRecipeSource(recipe: {
  source: RecipeSource;
  parentRecipeId?: string | null;
}) {
  if (recipe.source === "howtocook") return "HowToCook";
  if (recipe.parentRecipeId) return "家庭改编";
  return "家庭菜谱";
}
