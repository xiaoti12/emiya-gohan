import { mockRecipes } from "../recipes/mock";
import type { Recipe } from "../recipes/types";

export async function getRecommendations(tag = "全部", limit = 3, seed = Date.now()) {
  const recipes =
    !tag || tag === "全部"
      ? mockRecipes
      : mockRecipes.filter(
          (recipe) => recipe.category === tag || recipe.tags.includes(tag),
        );
  return shuffleBySeed(recipes, seed).slice(0, limit);
}

function shuffleBySeed(items: Recipe[], seed: number) {
  const result = [...items];
  let state = seed || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const next = Math.floor((state / 233280) * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }

  return result;
}
