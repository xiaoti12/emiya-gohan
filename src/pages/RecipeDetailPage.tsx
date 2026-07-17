import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { TopBar } from "../components/TopBar";
import { getRecipeById } from "../features/recipes/api";
import {
  formatRecipeSource,
  type RecipeDetail,
} from "../features/recipes/types";
import { ApiError, getErrorMessage } from "../lib/errors";
import styles from "./RecipeDetailPage.module.css";

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setLoadError("");
    setRecipe(null);

    void getRecipeById(id, controller.signal)
      .then((result) => {
        setRecipe(result);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof ApiError && error.code === "RECIPE_NOT_FOUND") {
          setNotFound(true);
          return;
        }
        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  function handleEdit() {
    if (!recipe) return;
    const targetId =
      recipe.source === "howtocook" && recipe.familyVersionId
        ? recipe.familyVersionId
        : recipe.id;
    navigate(`/recipes/${targetId}/edit`, { replace: recipe.id !== targetId });
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar title="菜谱详情" subtitle="正在打开这道菜…" backTo="/recipes" />
        <p className={styles.loadingText}>加载中…</p>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell>
        <TopBar title="菜谱详情" subtitle="没有找到这道菜。" backTo="/recipes" />
        <EmptyState
          title="菜谱不存在"
          description="可能已被删除，或这道菜不属于当前家庭。先回菜谱浏览页看看其他菜。"
        />
      </AppShell>
    );
  }

  if (loadError || !recipe) {
    return (
      <AppShell>
        <TopBar title="菜谱详情" subtitle="暂时打不开这道菜。" backTo="/recipes" />
        <EmptyState
          title="菜谱加载失败"
          description={loadError || "请稍后再试"}
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
      </AppShell>
    );
  }

  const isBase = recipe.source === "howtocook";
  const editLabel = isBase ? "改成我家的版本" : "编辑";

  return (
    <AppShell>
      <TopBar
        title={recipe.name}
        subtitle="看看食材清单和做法，再决定今天做不做。"
        backTo="/recipes"
        actionText="✎"
        actionLabel={editLabel}
        onAction={handleEdit}
      />
      <PaperCard className={styles.coverCard} tone="white" tilt="left">
        <div
          className={
            recipe.coverImageUrl
              ? styles.cover
              : `${styles.cover} ${styles.coverEmpty}`
          }
        >
          {recipe.coverImageUrl ? (
            <img src={recipe.coverImageUrl} alt={recipe.name} />
          ) : null}
        </div>
      </PaperCard>
      <PaperCard className={styles.metaCard} tone="warm" tilt="right">
        <div className={styles.tags}>
          <span className={styles.tag}>{recipe.category}</span>
          <span className={styles.tag}>{formatRecipeSource(recipe)}</span>
          {recipe.tags.map((tag) => (
            <span className={styles.tag} key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {isBase ? (
          <p className={styles.readOnlyNote}>
            这是公共基础菜谱。编辑会生成你家的改编版；基础版本身不能删除。
          </p>
        ) : null}
        {recipe.summary ? <p className={styles.summary}>{recipe.summary}</p> : null}
      </PaperCard>
      <PaperCard className={styles.sectionCard} tone="green" tilt="left">
        <h2>需要食材</h2>
        <ul className={styles.list}>
          {recipe.ingredients.map((item) => (
            <li key={`${item.name}-${item.amount}`}>
              <strong>{item.name}</strong>
              <span>{item.amount || "适量"}</span>
            </li>
          ))}
        </ul>
      </PaperCard>
      <PaperCard className={styles.sectionCard} tone="blue" tilt="right">
        <h2>步骤简述</h2>
        {recipe.steps.length > 0 ? (
          <ol className={styles.stepList}>
            {recipe.steps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptySteps}>还没有填写做法步骤</p>
        )}
      </PaperCard>
      <div className={styles.actionRow}>
        <button className={styles.actionButton} type="button" onClick={handleEdit}>
          {editLabel}
        </button>
      </div>
    </AppShell>
  );
}
