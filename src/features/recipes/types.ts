export type RecipeSource = "howtocook" | "custom";

export type RecipeIngredient = {
  name: string;
  amount?: string;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  source: RecipeSource;
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  records: {
    wantToCook: boolean;
    plannedCount: number;
    cookedCount: number;
  };
};

export type RecipeQuery = {
  q?: string;
  category?: string;
  tag?: string;
};
