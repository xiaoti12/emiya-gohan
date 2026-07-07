import type { Recipe } from "./types";

type RecipeCardProps = {
  recipe: Recipe;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <article>
      <h3>{recipe.name}</h3>
      <p>{recipe.summary}</p>
    </article>
  );
}
