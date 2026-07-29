export type RecipeRecordType = "want_to_cook" | "planned" | "cooked";

export type RecipeRecord = {
  id: string;
  recipeId: string | null;
  dishName: string;
  recordType: RecipeRecordType;
  plannedDate: string | null;
  cookedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipeRecordInput = {
  dishName: string;
  recordType: RecipeRecordType;
  recipeId?: string | null;
  plannedDate?: string | null;
  cookedAt?: string | null;
  note?: string | null;
};

export type DeleteRecipeRecordResult = {
  deletedId: string;
};