import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import { createIngredients, deleteIngredient, listIngredients } from "../features/ingredients/api";
import { ingredientCategories, ingredientCategoryLabels } from "../features/ingredients/mock";
import type { Ingredient, IngredientCategory } from "../features/ingredients/types";
import styles from "./IngredientsPage.module.css";

const categoryOrder: IngredientCategory[] = ["vegetable", "meat", "other"];
const labelToCategory: Record<string, IngredientCategory | undefined> = {
  蔬菜: "vegetable",
  肉类: "meat",
  其他: "other",
};

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [manualOpen, setManualOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("other");
  const [toast, setToast] = useState("");

  async function refresh() {
    const next = await listIngredients(labelToCategory[selectedCategory]);
    setIngredients(next);
  }

  useEffect(() => {
    void refresh();
  }, [selectedCategory]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    return categoryOrder.map((item) => ({
      category: item,
      count: ingredients.filter((ingredient) => ingredient.category === item).length,
    }));
  }, [ingredients]);

  const grouped = useMemo(() => {
    return categoryOrder
      .map((item) => ({
        category: item,
        items: ingredients.filter((ingredient) => ingredient.category === item),
      }))
      .filter((group) => group.items.length > 0);
  }, [ingredients]);

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createIngredients([{ name, category }]);
    setManualOpen(false);
    setName("");
    setCategory("other");
    await refresh();
    setToast(result.createdCount > 0 ? `已加入：${result.items[0]?.name}` : "没有可加入的食材");
  }

  async function removeIngredient(item: Ingredient) {
    await deleteIngredient(item.id);
    await refresh();
    setToast(`已删除：${item.name}`);
  }

  return (
    <AppShell
      overlaySlot={
        <>
          <BottomSheet title="手动录入" open={manualOpen} onClose={() => setManualOpen(false)}>
            <p className={styles.formNote}>先用本地 mock 记录食材；后续对接 Worker 后会写入云端空间。</p>
            <form onSubmit={submitManual}>
              <div className={styles.field}>
                <label htmlFor="ingredientName">食材名称</label>
                <input id="ingredientName" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：青椒、里脊肉、鸡蛋" autoComplete="off" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ingredientCategory">分类</label>
                <select id="ingredientCategory" value={category} onChange={(event) => setCategory(event.target.value as IngredientCategory)}>
                  {categoryOrder.map((item) => <option key={item} value={item}>{ingredientCategoryLabels[item]}</option>)}
                </select>
              </div>
              <button className={styles.submitButton} type="submit">加入库存</button>
            </form>
          </BottomSheet>
          <BottomSheet title="上传图片 AI 录入" open={uploadOpen} onClose={() => setUploadOpen(false)}>
            <p className={styles.uploadNote}>上传入口先作为占位：后续会识别冰箱照片、购物小票或菜市场拍照内容。</p>
            <div className={styles.uploadBox} aria-label="上传图片占位">
              <span>
                <span className={styles.uploadIcon}>图</span>
                <strong>图片识别待接入</strong>
                <span>Phase1 只保留入口，不做真实上传和 AI 调用。</span>
              </span>
            </div>
            <button className={styles.submitButton} type="button" onClick={() => setToast("图片 AI 录入将在后续接入")}>知道了</button>
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
          <span className={styles.actionCopy}>
            <strong>手动录入</strong>
            <span>输入食材名称</span>
          </span>
        </button>
        <button className={styles.addAction} type="button" onClick={() => setUploadOpen(true)}>
          <span className={styles.actionIcon}>拍</span>
          <span className={styles.actionCopy}>
            <strong>上传图片 AI 录入</strong>
            <span>后续识别冰箱/小票</span>
          </span>
        </button>
      </div>

      <nav className={styles.chips} aria-label="食材分类筛选">
        {ingredientCategories.map((item) => <Chip key={item} active={selectedCategory === item} onClick={() => setSelectedCategory(item)}>{item}</Chip>)}
      </nav>

      <section className={styles.categoryList} aria-label="食材分类列表">
        {grouped.map((group, index) => (
          <PaperCard className={styles.categoryCard} key={group.category} tone={index % 3 === 1 ? "warm" : index % 3 === 2 ? "green" : "white"} tilt={index % 2 ? "right" : "left"}>
            <div className={styles.categoryHead}>
              <h2 className={styles.categoryName}>{ingredientCategoryLabels[group.category]}</h2>
              <span className={styles.categoryCount}>{group.items.length} 样</span>
            </div>
            <div className={styles.ingredientList}>
              {group.items.map((item) => (
                <div className={styles.ingredientRow} key={item.id}>
                  <div className={styles.ingredientMain}>
                    <span className={styles.foodMark} aria-hidden="true">{item.name.slice(0, 1)}</span>
                    <span>
                      <span className={styles.foodName}>{item.name}</span>
                      <span className={styles.foodAmount}>{item.quantity ? `${item.quantity}${item.unit ?? ""}` : "适量"}</span>
                    </span>
                  </div>
                  <button className={styles.deleteButton} type="button" aria-label={`删除 ${item.name}`} onClick={() => void removeIngredient(item)}>删</button>
                </div>
              ))}
            </div>
            <p className={styles.swipeHint}>右侧露出删除区，模拟滑动管理。</p>
          </PaperCard>
        ))}
        {grouped.length === 0 ? <EmptyState title="这里还没有食材" description="点击手动录入，先把冰箱里最常用的食材记下来。" /> : null}
      </section>
    </AppShell>
  );
}
