import type { Recipe } from "../recipes/types";

type RecommendationPanelProps = {
  items: Recipe[];
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
