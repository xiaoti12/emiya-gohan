import { mockRecipes } from "./mock";
import type { Recipe, RecipeQuery } from "./types";

function matchRecipe(recipe: Recipe, query: RecipeQuery) {
  const keyword = query.q?.trim().toLowerCase();
  const matchCategory = !query.category || query.category === "全部" || recipe.category === query.category || recipe.tags.includes(query.category);
  const matchTag = !query.tag || query.tag === "全部" || recipe.tags.includes(query.tag);
  const haystack = `${recipe.name} ${recipe.category} ${recipe.tags.join(" ")} ${recipe.summary} ${recipe.ingredients.map((item) => item.name).join(" ")}`.toLowerCase();

  return matchCategory && matchTag && (!keyword || haystack.includes(keyword));
}

export async function listRecipes(query: RecipeQuery = {}) {
  return mockRecipes.filter((recipe) => matchRecipe(recipe, query));
}

export async function getRecipeById(id: string) {
  return mockRecipes.find((recipe) => recipe.id === id) ?? null;
}
