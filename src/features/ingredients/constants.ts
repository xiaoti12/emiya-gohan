import type { IngredientCategory } from "./types";

export const ingredientCategoryOrder: IngredientCategory[] = [
  "vegetable",
  "meat",
  "other",
];

export const ingredientCategoryLabels: Record<IngredientCategory, string> = {
  vegetable: "蔬菜",
  meat: "肉类",
  other: "其他",
};

export const ingredientCategoryFilters = [
  { label: "全部", category: null },
  { label: "蔬菜", category: "vegetable" },
  { label: "肉类", category: "meat" },
  { label: "其他", category: "other" },
] as const satisfies ReadonlyArray<{
  label: string;
  category: IngredientCategory | null;
}>;
