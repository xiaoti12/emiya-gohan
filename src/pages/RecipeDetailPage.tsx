import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { getRecipeById } from "../features/recipes/api";
import type { Recipe } from "../features/recipes/types";
import { createRecipeRecord } from "../features/recipeRecords/api";
import { todayISO } from "../lib/date";
import styles from "./RecipeDetailPage.module.css";

export function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void getRecipeById(id ?? "").then((result) => {
      setRecipe(result);
      setLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function addRecord(type: "want_to_cook" | "cooked") {
    if (!recipe) return;
    await createRecipeRecord({
      recordType: type,
      recipeId: recipe.id,
      dishName: recipe.name,
      planDate: type === "cooked" ? todayISO() : undefined,
    });
    setToast(type === "want_to_cook" ? `已标记想做：${recipe.name}` : `已记录做过：${recipe.name}`);
  }

  if (loaded && !recipe) {
    return (
      <AppShell>
        <TopBar title="菜谱详情" subtitle="没有找到这道菜。" />
        <EmptyState title="菜谱不存在" description="可能还没有导入，先回菜谱浏览页看看其他菜。" />
      </AppShell>
    );
  }

  return (
    <AppShell overlaySlot={<Toast message={toast} />}>
      <TopBar title={recipe?.name ?? "菜谱详情"} subtitle="看看食材清单和做法，再决定今天做不做。" />
      {recipe ? (
        <>
          <PaperCard className={styles.coverCard} tone="white" tilt="left">
            <div className={styles.cover}>
              <img src="/dish.jpg" alt={recipe.name} />
            </div>
          </PaperCard>
          <PaperCard className={styles.metaCard} tone="warm" tilt="right">
            <div className={styles.tags}>
              <span className={styles.tag}>{recipe.category}</span>
              <span className={styles.tag}>{recipe.source === "howtocook" ? "HowToCook" : "自定义"}</span>
              {recipe.tags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}
            </div>
            <p className={styles.summary}>{recipe.summary}</p>
          </PaperCard>
          <PaperCard className={styles.sectionCard} tone="green" tilt="left">
            <h2>需要食材</h2>
            <ul className={styles.list}>
              {recipe.ingredients.map((item) => (
                <li key={`${item.name}-${item.amount}`}>
                  <strong>{item.name}</strong>
                  <span>{item.amount ?? "适量"}</span>
                </li>
              ))}
            </ul>
          </PaperCard>
          <PaperCard className={styles.sectionCard} tone="blue" tilt="right">
            <h2>步骤简述</h2>
            <ol className={styles.stepList}>
              {recipe.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </PaperCard>
          <div className={styles.actionRow}>
            <button className={`${styles.actionButton} ${styles.secondaryButton}`} type="button" onClick={() => void addRecord("want_to_cook")}>
              标记想做
            </button>
            <button className={styles.actionButton} type="button" onClick={() => void addRecord("cooked")}>
              记录做过
            </button>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
