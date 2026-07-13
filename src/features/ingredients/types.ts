export type IngredientCategory = "vegetable" | "meat" | "other";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
  expireDate: string | null;
  note: string | null;
};

export type CreateIngredientInput = {
  name: string;
  category?: IngredientCategory;
  quantity?: number | null;
  unit?: string | null;
  expireDate?: string | null;
  note?: string | null;
};

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

export type CreateIngredientsResult = {
  items: Ingredient[];
  createdCount: number;
  skippedCount: number;
};

export type DeleteIngredientResult = {
  deletedId: string;
};
