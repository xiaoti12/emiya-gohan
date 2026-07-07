import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { listRecipes } from "../features/recipes/api";
import { recipeCategories } from "../features/recipes/mock";
import type { Recipe } from "../features/recipes/types";
import styles from "./RecipeBrowsePage.module.css";

export function RecipeBrowsePage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void listRecipes({ q: keyword, category }).then(setRecipes);
  }, [keyword, category]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function randomRecipe() {
    const target = recipes[Math.floor(Math.random() * recipes.length)];
    setToast(target ? `今天试试：${target.name}` : "没找到可推荐的菜谱");
  }

  return (
    <AppShell overlaySlot={<Toast message={toast} />}>
      <TopBar title="菜谱浏览" subtitle="搜索家常菜、汤羹和主食，先收藏想做的那一道。" actionText="骰" actionLabel="随机看看" onAction={randomRecipe} />

      <section className={styles.searchCard} aria-label="搜索菜谱">
        <label className={styles.searchRow} htmlFor="searchInput">
          <span className={styles.searchIcon} aria-hidden="true">搜</span>
          <input
            id="searchInput"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入菜名或食材，例如：鸡蛋、排骨"
            autoComplete="off"
          />
        </label>
      </section>

      <nav className={styles.chips} aria-label="菜谱分类筛选">
        {recipeCategories.map((item) => (
          <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
            {item}
          </Chip>
        ))}
      </nav>

      <section className={styles.recipeGrid} aria-label="菜谱列表">
        {recipes.map((recipe, index) => (
          <Link key={recipe.id} to={`/recipes/${recipe.id}`} aria-label={`查看${recipe.name}`}>
            <PaperCard className={styles.recipeCard} tone={index % 4 === 1 ? "warm" : index % 4 === 2 ? "green" : index % 4 === 3 ? "blue" : "white"} tilt={index % 2 ? "right" : "left"} interactive>
              <div className={styles.recipeCover}>
                <img src="/dish.jpg" alt={recipe.name} loading="lazy" />
              </div>
              <div className={styles.recipeBody}>
                <h2 className={styles.recipeName}>{recipe.name}</h2>
                <div className={styles.recipeTags}>
                  <span className={styles.tag}>{recipe.category}</span>
                  {recipe.tags.slice(0, 2).map((tag) => (
                    <span className={styles.tag} key={tag}>{tag}</span>
                  ))}
                </div>
                <div className={styles.recipeMeta}>
                  <span className={styles.source}>{recipe.source === "howtocook" ? "HowToCook" : "自定义"}</span>
                  <span>{recipe.ingredients.map((item) => item.name).slice(0, 3).join(" · ")}</span>
                </div>
              </div>
            </PaperCard>
          </Link>
        ))}
        {recipes.length === 0 ? (
          <div className={styles.emptyWrap}>
            <EmptyState title="没找到这道菜" description="可以先换个食材关键词；后续也能通过聊天入口自然语言添加新菜谱。" />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
