import { mockIngredients } from "./mock";
import type { CreateIngredientInput, Ingredient, IngredientCategory } from "./types";

let localIngredients = [...mockIngredients];

export async function listIngredients(category?: IngredientCategory) {
  return category ? localIngredients.filter((item) => item.category === category) : localIngredients;
}

export async function createIngredients(items: CreateIngredientInput[]) {
  const created: Ingredient[] = items
    .filter((item) => item.name.trim())
    .map((item) => ({
      id: `ing-local-${crypto.randomUUID()}`,
      name: item.name.trim(),
      category: item.category ?? "other",
      quantity: item.quantity,
      unit: item.unit,
      expireDate: item.expireDate,
    }));

  localIngredients = [...created, ...localIngredients];
  return { createdCount: created.length, skippedCount: items.length - created.length, items: created };
}

export async function deleteIngredient(id: string) {
  const target = localIngredients.find((item) => item.id === id);
  localIngredients = localIngredients.filter((item) => item.id !== id);
  return target ?? null;
}
