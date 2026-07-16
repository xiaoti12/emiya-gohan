import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  useBlocker,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  updateRecipe,
} from "../features/recipes/api";
import {
  DEFAULT_RECIPE_CATEGORY,
  RECIPE_CATEGORY_SUGGESTIONS,
} from "../features/recipes/constants";
import type { RecipeDetail, RecipeInput } from "../features/recipes/types";
import { ApiError, getErrorMessage } from "../lib/errors";
import styles from "./RecipeFormPage.module.css";

type IngredientDraft = {
  clientId: string;
  name: string;
  amount: string;
};

type FormSnapshot = {
  name: string;
  category: string;
  customCategory: string;
  summary: string;
  tags: string[];
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
};

function createClientId() {
  return `local_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyIngredient(): IngredientDraft {
  return { clientId: createClientId(), name: "", amount: "" };
}

function buildSnapshot(input: {
  name: string;
  category: string;
  customCategory: string;
  summary: string;
  tags: string[];
  ingredients: IngredientDraft[];
  steps: string[];
}): FormSnapshot {
  return {
    name: input.name.trim(),
    category: input.category,
    customCategory: input.customCategory.trim(),
    summary: input.summary.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    ingredients: input.ingredients
      .map((item) => ({
        name: item.name.trim(),
        amount: item.amount.trim(),
      }))
      .filter((item) => item.name || item.amount),
    steps: input.steps.map((step) => step.trim()).filter(Boolean),
  };
}

function snapshotsEqual(a: FormSnapshot, b: FormSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveCategory(category: string, customCategory: string) {
  const custom = customCategory.trim();
  if (custom) return custom;
  return category || DEFAULT_RECIPE_CATEGORY;
}

export function RecipeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedRecipe, setLoadedRecipe] = useState<RecipeDetail | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_RECIPE_CATEGORY);
  const [customCategory, setCustomCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([
    emptyIngredient(),
  ]);
  const [steps, setSteps] = useState<string[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<FormSnapshot>(() =>
    buildSnapshot({
      name: "",
      category: DEFAULT_RECIPE_CATEGORY,
      customCategory: "",
      summary: "",
      tags: [],
      ingredients: [emptyIngredient()],
      steps: [],
    }),
  );

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [allowLeave, setAllowLeave] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setNotFound(false);

    void getRecipeById(id, controller.signal)
      .then((recipe) => {
        if (recipe.source === "howtocook" && recipe.familyVersionId) {
          navigate(`/recipes/${recipe.familyVersionId}/edit`, { replace: true });
          return;
        }

        const suggestionMatch = (RECIPE_CATEGORY_SUGGESTIONS as readonly string[]).includes(
          recipe.category,
        );
        const nextName = recipe.name;
        const nextCategory = suggestionMatch
          ? recipe.category
          : DEFAULT_RECIPE_CATEGORY;
        const nextCustom = suggestionMatch ? "" : recipe.category;
        const nextSummary = recipe.summary;
        const nextTags = [...recipe.tags];
        const nextIngredients =
          recipe.ingredients.length > 0
            ? recipe.ingredients.map((item) => ({
                clientId: createClientId(),
                name: item.name,
                amount: item.amount,
              }))
            : [emptyIngredient()];
        const nextSteps = [...recipe.steps];

        setLoadedRecipe(recipe);
        setName(nextName);
        setCategory(nextCategory);
        setCustomCategory(nextCustom);
        setSummary(nextSummary);
        setTags(nextTags);
        setIngredients(nextIngredients);
        setSteps(nextSteps);
        setInitialSnapshot(
          buildSnapshot({
            name: nextName,
            category: nextCategory,
            customCategory: nextCustom,
            summary: nextSummary,
            tags: nextTags,
            ingredients: nextIngredients,
            steps: nextSteps,
          }),
        );
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
  }, [id, isEdit, navigate, reloadToken]);

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        name,
        category,
        customCategory,
        summary,
        tags,
        ingredients,
        steps,
      }),
    [name, category, customCategory, summary, tags, ingredients, steps],
  );

  const isDirty =
    !loading && !notFound && !loadError && !snapshotsEqual(currentSnapshot, initialSnapshot);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowLeave &&
      !submitting &&
      !deleting &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    setLeaveOpen(blocker.state === "blocked");
  }, [blocker.state]);

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function addTagFromInput() {
    const tag = tagInput.trim();
    if (!tag) return;
    if (tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) {
      setFieldErrors((current) => ({ ...current, tags: "最多 10 个标签" }));
      return;
    }
    if (Array.from(tag).length > 20) {
      setFieldErrors((current) => ({ ...current, tags: "单个标签最多 20 个字符" }));
      return;
    }
    setTags((current) => [...current, tag]);
    setTagInput("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.tags;
      return next;
    });
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTagFromInput();
    }
  }

  function validateForm(): RecipeInput | null {
    const errors: Record<string, string> = {};
    const finalName = name.trim();
    if (!finalName || Array.from(finalName).length > 80) {
      errors.name = "菜名需要填写 1–80 个字符";
    }

    const finalCategory = resolveCategory(category, customCategory);
    if (!finalCategory || Array.from(finalCategory).length > 30) {
      errors.category = "分类需要填写 1–30 个字符";
    }

    const finalSummary = summary.trim();
    if (Array.from(finalSummary).length > 500) {
      errors.summary = "摘要不能超过 500 个字符";
    }

    const finalTags = tags
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tagInput.trim()) {
      // 未按回车的输入也一并纳入
      const pending = tagInput.trim();
      if (
        !finalTags.some((tag) => tag.toLowerCase() === pending.toLowerCase()) &&
        finalTags.length < 10 &&
        Array.from(pending).length <= 20
      ) {
        finalTags.push(pending);
      }
    }
    if (finalTags.length > 10) {
      errors.tags = "最多 10 个标签";
    }

    const finalIngredients = ingredients
      .map((item) => ({
        name: item.name.trim(),
        amount: item.amount.trim(),
      }))
      .filter((item) => item.name);
    if (finalIngredients.length < 1) {
      errors.ingredients = "至少填写 1 项食材";
    }
    const ingredientNames = new Set<string>();
    for (const item of finalIngredients) {
      if (Array.from(item.name).length > 50) {
        errors.ingredients = "食材名称最多 50 个字符";
        break;
      }
      if (Array.from(item.amount).length > 50) {
        errors.ingredients = "用量最多 50 个字符";
        break;
      }
      const key = item.name.trim().toLowerCase().replace(/\s+/g, "");
      if (ingredientNames.has(key)) {
        errors.ingredients = "同一道菜不能有重复食材";
        break;
      }
      ingredientNames.add(key);
    }

    const finalSteps = steps.map((step) => step.trim()).filter(Boolean);
    if (finalSteps.length > 30) {
      errors.steps = "最多 30 个步骤";
    }
    for (const step of finalSteps) {
      if (Array.from(step).length > 500) {
        errors.steps = "每个步骤最多 500 个字符";
        break;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError("请先修正表单中的问题");
      return null;
    }

    setFormError("");
    return {
      name: finalName,
      category: finalCategory,
      tags: finalTags,
      summary: finalSummary,
      ingredients: finalIngredients,
      steps: finalSteps,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || deleting) return;
    const payload = validateForm();
    if (!payload) return;

    setSubmitting(true);
    setFormError("");
    try {
      const saved = isEdit && id
        ? await updateRecipe(id, payload)
        : await createRecipe(payload);
      setAllowLeave(true);
      setInitialSnapshot(currentSnapshot);
      navigate(`/recipes/${saved.id}`, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await deleteRecipe(id);
      setAllowLeave(true);
      setDeleteOpen(false);
      navigate("/recipes", { replace: true });
    } catch (error) {
      setDeleteOpen(false);
      setFormError(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  function resetLeave() {
    if (blocker.state === "blocked") blocker.reset?.();
    setLeaveOpen(false);
  }

  function confirmLeave() {
    if (blocker.state === "blocked") blocker.proceed?.();
    setLeaveOpen(false);
  }

  if (loading) {
    return (
      <AppShell>
        <TopBar title={isEdit ? "编辑菜谱" : "新增菜谱"} backTo="/recipes" />
        <p className={styles.loadingText}>正在准备表单…</p>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell>
        <TopBar title="编辑菜谱" backTo="/recipes" />
        <EmptyState title="菜谱不存在" description="可能已被删除，或这道菜不属于当前家庭。" />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <TopBar title="编辑菜谱" backTo="/recipes" />
        <EmptyState
          title="菜谱加载失败"
          description={loadError}
          action={
            <button
              className={styles.primaryButton}
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

  const canDelete =
    isEdit && loadedRecipe && loadedRecipe.source === "custom";

  return (
    <AppShell
      overlaySlot={
        <>
          <Toast message={toast} />
          <BottomSheet
            title="放弃未保存的修改？"
            open={leaveOpen}
            onClose={resetLeave}
          >
            <p className={styles.confirmText}>离开后，当前填写的内容不会保存。</p>
            <div className={styles.confirmActions}>
              <button className={styles.secondaryButton} type="button" onClick={resetLeave}>
                继续编辑
              </button>
              <button className={styles.dangerButton} type="button" onClick={confirmLeave}>
                放弃修改
              </button>
            </div>
          </BottomSheet>
          <BottomSheet
            title="确认删除这道菜？"
            open={deleteOpen}
            onClose={() => {
              if (!deleting) setDeleteOpen(false);
            }}
          >
            <p className={styles.confirmText}>
              将软删除「{loadedRecipe?.name ?? name}」。删除后可重新从基础菜或新建恢复，但当前版本不会自动还原。
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                取消
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </BottomSheet>
        </>
      }
    >
      <TopBar
        title={isEdit ? "编辑菜谱" : "新增菜谱"}
        subtitle={
          loadedRecipe?.source === "howtocook"
            ? "保存后会生成你家的改编版。"
            : "把家常做法记下来，下次直接照着做。"
        }
        backTo="/recipes"
      />

      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <PaperCard className={styles.section} tone="white" tilt="left">
          <h2>基本信息</h2>
          <label className={styles.field}>
            <span>菜名</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="例如：番茄炒蛋"
              disabled={submitting}
            />
            {fieldErrors.name ? <em>{fieldErrors.name}</em> : null}
          </label>

          <div className={styles.field}>
            <span>分类</span>
            <div className={styles.chipRow}>
              {RECIPE_CATEGORY_SUGGESTIONS.map((item) => (
                <Chip
                  key={item}
                  active={!customCategory && category === item}
                  onClick={() => {
                    setCategory(item);
                    setCustomCategory("");
                  }}
                >
                  {item}
                </Chip>
              ))}
            </div>
            <input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              maxLength={30}
              placeholder="自定义分类（可选，填写后覆盖上方选择）"
              disabled={submitting}
            />
            {fieldErrors.category ? <em>{fieldErrors.category}</em> : null}
          </div>

          <label className={styles.field}>
            <span>摘要（选填）</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="一句话介绍这道菜"
              disabled={submitting}
            />
            {fieldErrors.summary ? <em>{fieldErrors.summary}</em> : null}
          </label>
        </PaperCard>

        <PaperCard className={styles.section} tone="warm" tilt="right">
          <h2>标签（选填）</h2>
          <div className={styles.tagList}>
            {tags.map((tag) => (
              <button
                key={tag}
                className={styles.tagChip}
                type="button"
                disabled={submitting}
                onClick={() => setTags((current) => current.filter((item) => item !== tag))}
              >
                {tag} ×
              </button>
            ))}
          </div>
          <label className={styles.field}>
            <span>输入后按回车添加</span>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              maxLength={20}
              placeholder="例如：快手"
              disabled={submitting}
            />
            {fieldErrors.tags ? <em>{fieldErrors.tags}</em> : null}
          </label>
        </PaperCard>

        <PaperCard className={styles.section} tone="green" tilt="left">
          <div className={styles.sectionHead}>
            <h2>食材</h2>
            <button
              className={styles.ghostButton}
              type="button"
              disabled={submitting || ingredients.length >= 50}
              onClick={() => setIngredients((current) => [...current, emptyIngredient()])}
            >
              添加食材
            </button>
          </div>
          {fieldErrors.ingredients ? (
            <p className={styles.inlineError}>{fieldErrors.ingredients}</p>
          ) : null}
          <div className={styles.dynamicList}>
            {ingredients.map((item, index) => (
              <div className={styles.ingredientRow} key={item.clientId}>
                <input
                  value={item.name}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, name: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="食材名"
                  disabled={submitting}
                />
                <input
                  value={item.amount}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, amount: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="用量（选填）"
                  disabled={submitting}
                />
                <button
                  className={styles.removeButton}
                  type="button"
                  aria-label="删除食材"
                  disabled={submitting || ingredients.length <= 1}
                  onClick={() =>
                    setIngredients((current) =>
                      current.length <= 1
                        ? current
                        : current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </PaperCard>

        <PaperCard className={styles.section} tone="blue" tilt="right">
          <div className={styles.sectionHead}>
            <h2>步骤（选填）</h2>
            <button
              className={styles.ghostButton}
              type="button"
              disabled={submitting || steps.length >= 30}
              onClick={() => setSteps((current) => [...current, ""])}
            >
              添加步骤
            </button>
          </div>
          {fieldErrors.steps ? (
            <p className={styles.inlineError}>{fieldErrors.steps}</p>
          ) : null}
          <div className={styles.dynamicList}>
            {steps.length === 0 ? (
              <p className={styles.hint}>还没有步骤，可稍后补充。</p>
            ) : (
              steps.map((step, index) => (
                <div className={styles.stepRow} key={`step-${index}`}>
                  <span className={styles.stepIndex}>{index + 1}</span>
                  <textarea
                    value={step}
                    onChange={(event) =>
                      setSteps((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? event.target.value : row,
                        ),
                      )
                    }
                    rows={2}
                    placeholder="这一步做什么"
                    disabled={submitting}
                  />
                  <button
                    className={styles.removeButton}
                    type="button"
                    aria-label="删除步骤"
                    disabled={submitting}
                    onClick={() =>
                      setSteps((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </PaperCard>

        <div className={styles.footer}>
          <button className={styles.primaryButton} type="submit" disabled={submitting || deleting}>
            {submitting ? "保存中…" : "保存菜谱"}
          </button>
          {canDelete ? (
            <button
              className={styles.dangerButton}
              type="button"
              disabled={submitting || deleting}
              onClick={() => setDeleteOpen(true)}
            >
              删除这道菜
            </button>
          ) : null}
        </div>
      </form>
    </AppShell>
  );
}
