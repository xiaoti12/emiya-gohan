import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { createIngredients, deleteIngredient, listIngredients } from "../features/ingredients/api";
import {
  ingredientCategoryFilters,
  ingredientCategoryLabels,
  ingredientCategoryOrder,
} from "../features/ingredients/constants";
import type { Ingredient, IngredientCategory } from "../features/ingredients/types";
import { formatDisplayDate, todayISO } from "../lib/date";
import { getErrorMessage } from "../lib/errors";
import styles from "./IngredientsPage.module.css";

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("other");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void listIngredients()
      .then((items) => {
        if (active) setIngredients(items);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(
    () =>
      ingredientCategoryOrder.map((item) => ({
        category: item,
        count: ingredients.filter((ingredient) => ingredient.category === item).length,
      })),
    [ingredients],
  );

  const visibleIngredients = useMemo(
    () =>
      selectedCategory
        ? ingredients.filter((ingredient) => ingredient.category === selectedCategory)
        : ingredients,
    [ingredients, selectedCategory],
  );

  const grouped = useMemo(
    () =>
      ingredientCategoryOrder
        .map((item) => ({
          category: item,
          items: visibleIngredients.filter((ingredient) => ingredient.category === item),
        }))
        .filter((group) => group.items.length > 0),
    [visibleIngredients],
  );

  function closeManual() {
    if (!submitting) setManualOpen(false);
  }

  function resetForm() {
    setName("");
    setCategory("other");
    setQuantity("");
    setUnit("");
    setExpireDate("");
    setMoreOpen(false);
    setFormError("");
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const finalName = name.trim();
    if (!finalName || Array.from(finalName).length > 50) {
      setFormError("食材名称需要填写 1–50 个字符");
      return;
    }

    let finalQuantity: number | null = null;
    if (quantity) {
      finalQuantity = Number(quantity);
      if (!Number.isFinite(finalQuantity) || finalQuantity <= 0) {
        setFormError("数量必须是大于 0 的数字");
        return;
      }
    }

    if (Array.from(unit.trim()).length > 20) {
      setFormError("单位不能超过 20 个字符");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const result = await createIngredients([
        {
          name: finalName,
          category,
          quantity: finalQuantity,
          unit: unit.trim() || null,
          expireDate: expireDate || null,
        },
      ]);

      if (result.createdCount > 0) {
        setIngredients((current) => [...result.items, ...current]);
        setToast(`已加入：${result.items[0]?.name ?? finalName}`);
      } else {
        setToast(`${finalName} 已存在，已跳过`);
      }
      setManualOpen(false);
      resetForm();
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeIngredient(item: Ingredient) {
    if (deletingIds.includes(item.id)) return;
    setDeletingIds((current) => [...current, item.id]);
    try {
      const result = await deleteIngredient(item.id);
      setIngredients((current) => current.filter((ingredient) => ingredient.id !== result.deletedId));
      setToast(`已删除：${item.name}`);
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setDeletingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  function renderListContent() {
    if (loading) {
      return <p className={styles.loadingText}>正在看看冰箱里有什么…</p>;
    }

    if (loadError) {
      return (
        <EmptyState
          title="食材暂时没加载出来"
          description={loadError}
          action={
            <button className={styles.retryButton} type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              重新加载
            </button>
          }
        />
      );
    }

    if (grouped.length === 0) {
      return (
        <EmptyState
          title={ingredients.length > 0 ? "这个分类还没有食材" : "这里还没有食材"}
          description={ingredients.length > 0 ? "换个分类看看，或者录入一种新食材。" : "点击手动录入，先把冰箱里最常用的食材记下来。"}
          action={
            ingredients.length > 0 ? (
              <button className={styles.retryButton} type="button" onClick={() => setSelectedCategory(null)}>
                查看全部
              </button>
            ) : null
          }
        />
      );
    }

    return grouped.map((group) => {
      const cardTone = group.category === "meat" ? "warm" : group.category === "other" ? "green" : "white";
      const cardClass = group.category === "meat" ? styles.meatCard : group.category === "other" ? styles.otherCard : styles.vegetableCard;

      return (
      <PaperCard className={`${styles.categoryCard} ${cardClass}`} key={group.category} tone={cardTone}>
        <div className={styles.categoryHead}>
          <h2 className={styles.categoryName}>{ingredientCategoryLabels[group.category]}</h2>
          <span className={styles.categoryCount}>{group.items.length} 样</span>
        </div>
        <div className={styles.ingredientList}>
          {group.items.map((item) => {
            const deleting = deletingIds.includes(item.id);
            const amount = item.quantity !== null || item.unit !== null
              ? `${item.quantity ?? ""}${item.unit ?? ""}`
              : "适量";
            const expired = item.expireDate !== null && item.expireDate < todayISO();

            return (
              <div className={styles.ingredientRow} key={item.id}>
                <div className={styles.ingredientMain}>
                  <span className={styles.foodMark} aria-hidden="true">{item.name.slice(0, 1)}</span>
                  <span className={styles.foodCopy}>
                    <span className={styles.foodName}>{item.name}</span>
                    <span className={styles.foodAmount}>{amount}</span>
                    {item.expireDate ? (
                      <span className={`${styles.expireDate} ${expired ? styles.expired : ""}`}>
                        {formatDisplayDate(item.expireDate)}{expired ? " · 已过期" : ""}
                      </span>
                    ) : null}
                  </span>
                </div>
                <button
                  className={styles.deleteButton}
                  type="button"
                  aria-label={`删除 ${item.name}`}
                  disabled={deleting}
                  onClick={() => void removeIngredient(item)}
                >
                  {deleting ? "…" : "删"}
                </button>
              </div>
            );
          })}
        </div>
      </PaperCard>
      );
    });
  }

  return (
    <AppShell
      overlaySlot={
        <>
          <BottomSheet title="手动录入" open={manualOpen} onClose={closeManual}>
            <p className={styles.formNote}>名称和分类先记好，需要时再补充数量和保质期。</p>
            <form onSubmit={submitManual}>
              <div className={styles.field}>
                <label htmlFor="ingredientName">食材名称</label>
                <input id="ingredientName" value={name} onChange={(event) => { setName(event.target.value); setFormError(""); }} placeholder="例如：青椒、里脊肉、鸡蛋" autoComplete="off" maxLength={50} disabled={submitting} />
              </div>
              <div className={styles.field}>
                <label htmlFor="ingredientCategory">分类</label>
                <select id="ingredientCategory" value={category} onChange={(event) => setCategory(event.target.value as IngredientCategory)} disabled={submitting}>
                  {ingredientCategoryOrder.map((item) => <option key={item} value={item}>{ingredientCategoryLabels[item]}</option>)}
                </select>
              </div>
              <button className={styles.moreButton} type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
                {moreOpen ? "收起更多信息" : "＋ 添加数量、单位和保质期"}
              </button>
              {moreOpen ? (
                <div className={styles.moreFields}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="ingredientQuantity">数量</label>
                      <input id="ingredientQuantity" type="number" min="0.01" step="any" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="例如：3" disabled={submitting} />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ingredientUnit">单位</label>
                      <input id="ingredientUnit" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="个、克、把" maxLength={20} disabled={submitting} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="ingredientExpireDate">保质期</label>
                    <input id="ingredientExpireDate" type="date" value={expireDate} onChange={(event) => setExpireDate(event.target.value)} disabled={submitting} />
                  </div>
                </div>
              ) : null}
              {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
              <button className={styles.submitButton} type="submit" disabled={submitting}>{submitting ? "正在加入…" : "加入库存"}</button>
            </form>
          </BottomSheet>
          <BottomSheet title="上传图片 AI 录入" open={uploadOpen} onClose={() => setUploadOpen(false)}>
            <p className={styles.uploadNote}>以后可以识别冰箱照片、购物小票或菜市场拍照内容。</p>
            <div className={styles.uploadBox} aria-label="上传图片即将支持">
              <span>
                <span className={styles.uploadIcon}>图</span>
                <strong>图片识别即将支持</strong>
                <span>Phase 2 先把手动录入和家庭库存打通。</span>
              </span>
            </div>
            <button className={styles.submitButton} type="button" onClick={() => setUploadOpen(false)}>知道了</button>
          </BottomSheet>
          <Toast message={toast} />
        </>
      }
    >
      <TopBar title="食材管理" subtitle="把冰箱里的菜、肉和零碎库存都先记好。" actionText="＋" actionLabel="添加食材" onAction={() => setManualOpen(true)} />

      <section className={styles.overviewCard} aria-label="冰箱库存概览">
        <div className={styles.overviewHead}>
          <div>
            <p className={styles.eyebrow}>冰箱库存</p>
            <h2 className={styles.overviewTitle}>今天有 {ingredients.length} 样食材可用</h2>
          </div>
        </div>
        <div className={styles.statRow} aria-label="分类统计">
          {stats.map((item) => (
            <div className={styles.statChip} key={item.category}>
              <span className={styles.statNum}>{item.count}</span>
              <span className={styles.statLabel}>{ingredientCategoryLabels[item.category]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.addActions}>
        <button className={styles.addAction} type="button" onClick={() => setManualOpen(true)}>
          <span className={styles.actionIcon}>写</span>
          <span className={styles.actionCopy}><strong>手动录入</strong><span>输入食材和可选信息</span></span>
        </button>
        <button className={styles.addAction} type="button" onClick={() => setUploadOpen(true)}>
          <span className={styles.actionIcon}>拍</span>
          <span className={styles.actionCopy}><strong>上传图片 AI 录入</strong><span>即将支持冰箱/小票识别</span></span>
        </button>
      </div>

      <nav className={styles.chips} aria-label="食材分类筛选">
        {ingredientCategoryFilters.map((item) => (
          <Chip key={item.label} active={selectedCategory === item.category} onClick={() => setSelectedCategory(item.category)}>{item.label}</Chip>
        ))}
      </nav>

      <section className={styles.categoryList} aria-label="食材分类列表">
        {renderListContent()}
      </section>
    </AppShell>
  );
}
