import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { TopBar } from "../components/TopBar";
import { listRecipes } from "../features/recipes/api";
import {
  RECIPE_CATEGORY_FILTERS,
  RECIPE_PAGE_SIZE,
} from "../features/recipes/constants";
import {
  formatRecipeSource,
  type RecipeListItem,
} from "../features/recipes/types";
import { withCoverImageParams } from "../lib/coverImage";
import { getErrorMessage } from "../lib/errors";
import styles from "./RecipeBrowsePage.module.css";

export function RecipeBrowsePage() {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [category, setCategory] = useState<string>("全部");
  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [nextId, setNextId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const controller = new AbortController();
    setInitialLoading(true);
    setLoadError("");
    setLoadMoreError("");
    setItems([]);
    setNextId(null);

    void listRecipes(
      {
        q: debouncedKeyword || undefined,
        category: category === "全部" ? undefined : category,
        limit: RECIPE_PAGE_SIZE,
      },
      controller.signal,
    )
      .then((page) => {
        setItems(page.items);
        setNextId(page.nextId);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialLoading(false);
      });

    return () => controller.abort();
  }, [debouncedKeyword, category, reloadToken]);

  async function loadMore() {
    if (!nextId || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const page = await listRecipes({
        q: debouncedKeyword || undefined,
        category: category === "全部" ? undefined : category,
        cursor: nextId,
        limit: RECIPE_PAGE_SIZE,
      });
      setItems((current) => [...current, ...page.items]);
      setNextId(page.nextId);
    } catch (error) {
      setLoadMoreError(getErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }

  function renderList() {
    if (initialLoading) {
      return (
        <div className={styles.emptyWrap}>
          <p className={styles.loadingText}>正在翻菜谱本…</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className={styles.emptyWrap}>
          <EmptyState
            title="菜谱暂时没加载出来"
            description={loadError}
            action={
              <button
                className={styles.retryButton}
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                重新加载
              </button>
            }
          />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className={styles.emptyWrap}>
          <EmptyState
            title="没找到这道菜"
            description="可以换个关键词，或点击右上角新增一道家庭菜谱。"
          />
        </div>
      );
    }

    return (
      <>
        {items.map((recipe, index) => {
          const preview =
            recipe.ingredients
              .map((item) => item.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(" · ") || recipe.summary;
          return (
            <Link
              key={recipe.id}
              to={`/recipes/${recipe.id}`}
              aria-label={`查看${recipe.name}`}
            >
              <PaperCard
                className={styles.recipeCard}
                tone={
                  index % 4 === 1
                    ? "warm"
                    : index % 4 === 2
                      ? "green"
                      : index % 4 === 3
                        ? "blue"
                        : "white"
                }
                tilt={index % 2 ? "right" : "left"}
                interactive
              >
                {recipe.coverImageUrl ? (
                  <div className={styles.recipeCover}>
                    <img
                      src={
                        withCoverImageParams(recipe.coverImageUrl, { q: 60 }) ??
                        recipe.coverImageUrl
                      }
                      alt={recipe.name}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className={`${styles.recipeCover} ${styles.recipeCoverPlaceholder}`}>
                    <img
                      src="/fork-and-knife.svg"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={styles.recipeBody}>
                  <h2 className={styles.recipeName}>{recipe.name}</h2>
                  <div className={styles.recipeTags}>
                    <span className={styles.tag}>{recipe.category}</span>
                    {recipe.tags.slice(0, 2).map((tag) => (
                      <span className={styles.tag} key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={styles.recipeMeta}>
                    <span className={styles.source}>
                      {formatRecipeSource(recipe)}
                    </span>
                    <span>{preview}</span>
                  </div>
                </div>
              </PaperCard>
            </Link>
          );
        })}
        <div className={styles.loadMoreWrap}>
          {loadMoreError ? (
            <div className={styles.loadMoreError}>
              <p>{loadMoreError}</p>
              <button className={styles.retryButton} type="button" onClick={() => void loadMore()}>
                重试加载
              </button>
            </div>
          ) : null}
          {nextId ? (
            <button
              className={styles.loadMoreButton}
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "加载中…" : "加载更多"}
            </button>
          ) : (
            <p className={styles.endHint}>已经到底啦</p>
          )}
        </div>
      </>
    );
  }

  return (
    <AppShell>
      <TopBar
        title="菜谱浏览"
        subtitle="搜菜名、标签，找今天灵感。"
        actionText="＋"
        actionLabel="新增菜谱"
        actionTo="/recipes/new"
        backTo="/"
        backLabel="返回首页"
      />

      <section className={styles.searchCard} aria-label="搜索菜谱">
        <label className={styles.searchRow} htmlFor="searchInput">
          <span className={styles.searchIcon} aria-hidden="true">
            搜
          </span>
          <input
            id="searchInput"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入菜名、标签或食材"
            autoComplete="off"
          />
        </label>
      </section>

      <nav className={styles.chips} aria-label="菜谱分类筛选">
        {RECIPE_CATEGORY_FILTERS.map((item) => (
          <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
            {item}
          </Chip>
        ))}
      </nav>

      <section className={styles.recipeGrid} aria-label="菜谱列表">
        {renderList()}
      </section>
    </AppShell>
  );
}
