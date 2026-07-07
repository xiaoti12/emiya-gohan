export type IngredientCategory = "vegetable" | "meat" | "other";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity?: number;
  unit?: string;
  expireDate?: string;
};

export type CreateIngredientInput = {
  name: string;
  category?: IngredientCategory;
  quantity?: number;
  unit?: string;
  expireDate?: string;
};
