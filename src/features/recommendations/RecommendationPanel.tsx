import type { RecipeListItem } from "../recipes/types";

type RecommendationPanelProps = {
  items: RecipeListItem[];
};

export function RecommendationPanel({ items }: RecommendationPanelProps) {
  return (
    <section>
      {items.map((item) => (
        <article key={item.id}>{item.name}</article>
      ))}
    </section>
  );
}
