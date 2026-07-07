import type { Ingredient } from "./types";

type IngredientListProps = {
  items: Ingredient[];
};

export function IngredientList({ items }: IngredientListProps) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
