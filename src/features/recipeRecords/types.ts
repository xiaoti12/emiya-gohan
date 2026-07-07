export type RecipeRecordType = "want_to_cook" | "planned" | "cooked";

export type RecipeRecord = {
  id: string;
  recipeId?: string;
  dishName: string;
  recordType: RecipeRecordType;
  planDate?: string;
  note?: string;
};

export type CreateRecipeRecordInput = Omit<RecipeRecord, "id">;
