import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { TopBar } from "../components/TopBar";
import {
  hasAiApiKey,
  loadAiSettings,
  recognizeIngredientsFromImage,
  type RecognizedIngredient,
} from "../features/ai/api";
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

type UploadStep = "pick" | "recognizing" | "review" | "empty" | "error";

type ReviewItem = RecognizedIngredient & {
  localId: string;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

function createLocalId() {
  return `local_${Math.random().toString(36).slice(2, 10)}`;
}

function toReviewItems(items: RecognizedIngredient[]): ReviewItem[] {
  return items.map((item) => ({
    ...item,
    localId: createLocalId(),
  }));
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] ?? "" : result;
      if (!base64) {
        reject(new Error("读取图片失败"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

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

  const [uploadStep, setUploadStep] = useState<UploadStep>("pick");
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const reviewCount = reviewItems.length;

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

  function resetUploadState() {
    setUploadStep("pick");
    setUploadError("");
    setSelectedFile(null);
    setReviewItems([]);
    setRecognizing(false);
    setImporting(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeUpload() {
    if (recognizing || importing) return;
    setUploadOpen(false);
    resetUploadState();
  }

  function openUpload() {
    resetUploadState();
    setUploadOpen(true);
    if (!hasAiApiKey()) {
      setToast("请先配置 AI API Key");
    }
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

  async function recognizeFile(file: File) {
    setRecognizing(true);
    setUploadStep("recognizing");
    setUploadError("");
    try {
      const base64 = await readFileAsBase64(file);
      const settings = loadAiSettings();
      const items = await recognizeIngredientsFromImage(settings, {
        mimeType: file.type || "image/jpeg",
        base64,
      });
      if (items.length === 0) {
        setReviewItems([]);
        setUploadStep("empty");
        return;
      }
      setReviewItems(toReviewItems(items));
      setUploadStep("review");
    } catch (error) {
      setUploadError(getErrorMessage(error));
      setUploadStep("error");
    } finally {
      setRecognizing(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("图片不能超过 10MB");
      setUploadStep("error");
      return;
    }

    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      setUploadError("请选择图片文件");
      setUploadStep("error");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    await recognizeFile(file);
  }

  function updateReviewItem(localId: string, patch: Partial<ReviewItem>) {
    setReviewItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function removeReviewItem(localId: string) {
    setReviewItems((current) => current.filter((item) => item.localId !== localId));
  }

  function addReviewItem() {
    setReviewItems((current) => [
      ...current,
      {
        localId: createLocalId(),
        name: "",
        category: "other",
        quantity: null,
        unit: null,
      },
    ]);
  }

  async function submitReview() {
    if (importing) return;
    if (reviewItems.length === 0) {
      setUploadError("请至少保留一项食材");
      return;
    }

    const payload = [];
    for (const item of reviewItems) {
      const finalName = item.name.trim();
      if (!finalName || Array.from(finalName).length > 50) {
        setUploadError("每项食材名称需要填写 1–50 个字符");
        return;
      }
      if (item.quantity !== null && (!Number.isFinite(item.quantity) || item.quantity <= 0)) {
        setUploadError(`「${finalName}」数量必须大于 0`);
        return;
      }
      if (item.unit && Array.from(item.unit).length > 20) {
        setUploadError(`「${finalName}」单位不能超过 20 个字符`);
        return;
      }
      payload.push({
        name: finalName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit?.trim() || null,
      });
    }

    setImporting(true);
    setUploadError("");
    try {
      const result = await createIngredients(payload);
      if (result.createdCount > 0) {
        setIngredients((current) => [...result.items, ...current]);
      }
      const parts = [`已加入 ${result.createdCount} 项`];
      if (result.skippedCount > 0) parts.push(`跳过 ${result.skippedCount} 项已存在`);
      setToast(parts.join("，"));
      setUploadOpen(false);
      resetUploadState();
    } catch (error) {
      setUploadError(getErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  function renderUploadBody() {
    if (!hasAiApiKey()) {
      return (
        <>
          <p className={styles.uploadNote}>图片识别需要先配置可用的多模态模型。</p>
          <Link className={styles.settingsLink} to="/ai-settings">
            去 AI 设置
          </Link>
        </>
      );
    }

    if (uploadStep === "recognizing") {
      return (
        <>
          {previewUrl ? <img className={styles.previewImage} src={previewUrl} alt="待识别图片预览" /> : null}
          <p className={styles.uploadNote}>正在识别图片中的食材…</p>
        </>
      );
    }

    if (uploadStep === "empty") {
      return (
        <>
          {previewUrl ? <img className={styles.previewImage} src={previewUrl} alt="待识别图片预览" /> : null}
          <p className={styles.uploadNote}>未识别到食材，可以换一张图或重试。</p>
          <div className={styles.uploadActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                if (selectedFile) void recognizeFile(selectedFile);
              }}
              disabled={recognizing}
            >
              重新识别
            </button>
            <button className={styles.submitButton} type="button" onClick={() => fileInputRef.current?.click()}>
              重选图片
            </button>
          </div>
        </>
      );
    }

    if (uploadStep === "error") {
      return (
        <>
          {previewUrl ? <img className={styles.previewImage} src={previewUrl} alt="待识别图片预览" /> : null}
          <p className={styles.formError} role="alert">
            {uploadError || "识别失败，请重试"}
          </p>
          <div className={styles.uploadActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                if (selectedFile) void recognizeFile(selectedFile);
              }}
              disabled={!selectedFile || recognizing}
            >
              重新识别
            </button>
            <button className={styles.submitButton} type="button" onClick={() => fileInputRef.current?.click()}>
              重选图片
            </button>
          </div>
        </>
      );
    }

    if (uploadStep === "review") {
      return (
        <>
          {previewUrl ? <img className={styles.previewImage} src={previewUrl} alt="待识别图片预览" /> : null}
          <p className={styles.uploadNote}>先核对识别结果，可修改、删除不需要的项或增补后再加入库存。</p>
          <div className={styles.reviewList}>
            {reviewItems.map((item) => (
              <div className={styles.reviewCard} key={item.localId}>
                <div className={styles.field}>
                  <label htmlFor={`review-name-${item.localId}`}>名称</label>
                  <input
                    id={`review-name-${item.localId}`}
                    value={item.name}
                    maxLength={50}
                    disabled={importing}
                    onChange={(event) => updateReviewItem(item.localId, { name: event.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`review-category-${item.localId}`}>分类</label>
                  <select
                    id={`review-category-${item.localId}`}
                    value={item.category}
                    disabled={importing}
                    onChange={(event) =>
                      updateReviewItem(item.localId, {
                        category: event.target.value as IngredientCategory,
                      })
                    }
                  >
                    {ingredientCategoryOrder.map((value) => (
                      <option key={value} value={value}>
                        {ingredientCategoryLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor={`review-quantity-${item.localId}`}>数量</label>
                    <input
                      id={`review-quantity-${item.localId}`}
                      type="number"
                      min="0.01"
                      step="any"
                      inputMode="decimal"
                      value={item.quantity ?? ""}
                      disabled={importing}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateReviewItem(item.localId, {
                          quantity: value ? Number(value) : null,
                        });
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`review-unit-${item.localId}`}>单位</label>
                    <input
                      id={`review-unit-${item.localId}`}
                      value={item.unit ?? ""}
                      maxLength={20}
                      disabled={importing}
                      onChange={(event) =>
                        updateReviewItem(item.localId, {
                          unit: event.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  className={styles.reviewDelete}
                  type="button"
                  disabled={importing}
                  onClick={() => removeReviewItem(item.localId)}
                >
                  删除此项
                </button>
              </div>
            ))}
          </div>
          <button className={styles.moreButton} type="button" onClick={addReviewItem} disabled={importing}>
            ＋ 添加一行
          </button>
          {uploadError ? (
            <p className={styles.formError} role="alert">
              {uploadError}
            </p>
          ) : null}
          <div className={styles.uploadActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              重选图片
            </button>
            <button
              className={styles.submitButton}
              type="button"
              onClick={() => void submitReview()}
              disabled={importing || reviewCount === 0}
            >
              {importing ? "正在加入…" : `加入库存（${reviewCount}）`}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <p className={styles.uploadNote}>拍冰箱、购物小票或菜场食材，识别后可二次编辑再入库。</p>
        <button
          className={styles.uploadBox}
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="选择图片识别食材"
        >
          <span>
            <img className={styles.uploadIcon} src="/picture.svg" alt="" aria-hidden="true" />
            <strong>选择图片开始识别</strong>
            <span>支持 jpeg / png / webp，最大 10MB</span>
          </span>
        </button>
      </>
    );
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
              const amount =
                item.quantity !== null || item.unit !== null
                  ? `${item.quantity ?? ""}${item.unit ?? ""}`
                  : "适量";
              const expired = item.expireDate !== null && item.expireDate < todayISO();

              return (
                <div className={styles.ingredientRow} key={item.id}>
                  <div className={styles.ingredientMain}>
                    <span className={styles.foodMark} aria-hidden="true">
                      {item.name.slice(0, 1)}
                    </span>
                    <span className={styles.foodCopy}>
                      <span className={styles.foodName}>{item.name}</span>
                      <span className={styles.foodAmount}>{amount}</span>
                      {item.expireDate ? (
                        <span className={`${styles.expireDate} ${expired ? styles.expired : ""}`}>
                          {formatDisplayDate(item.expireDate)}
                          {expired ? " · 已过期" : ""}
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
                <input
                  id="ingredientName"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError("");
                  }}
                  placeholder="例如：青椒、里脊肉、鸡蛋"
                  autoComplete="off"
                  maxLength={50}
                  disabled={submitting}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="ingredientCategory">分类</label>
                <select
                  id="ingredientCategory"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as IngredientCategory)}
                  disabled={submitting}
                >
                  {ingredientCategoryOrder.map((item) => (
                    <option key={item} value={item}>
                      {ingredientCategoryLabels[item]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={styles.moreButton}
                type="button"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                {moreOpen ? "收起更多信息" : "＋ 添加数量、单位和保质期"}
              </button>
              {moreOpen ? (
                <div className={styles.moreFields}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="ingredientQuantity">数量</label>
                      <input
                        id="ingredientQuantity"
                        type="number"
                        min="0.01"
                        step="any"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder="例如：3"
                        disabled={submitting}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ingredientUnit">单位</label>
                      <input
                        id="ingredientUnit"
                        value={unit}
                        onChange={(event) => setUnit(event.target.value)}
                        placeholder="个、克、把"
                        maxLength={20}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="ingredientExpireDate">保质期</label>
                    <input
                      id="ingredientExpireDate"
                      type="date"
                      value={expireDate}
                      onChange={(event) => setExpireDate(event.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              ) : null}
              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}
              <button className={styles.submitButton} type="submit" disabled={submitting}>
                {submitting ? "正在加入…" : "加入库存"}
              </button>
            </form>
          </BottomSheet>
          <BottomSheet title="上传图片 AI 录入" open={uploadOpen} onClose={closeUpload}>
            <input
              ref={fileInputRef}
              className={styles.hiddenFileInput}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleFileChange(file);
              }}
            />
            {renderUploadBody()}
          </BottomSheet>
          <Toast message={toast} />
        </>
      }
    >
      <TopBar
        title="食材管理"
        subtitle="把冰箱里的菜、肉和零碎库存都先记好。"
        actionText="＋"
        actionLabel="添加食材"
        onAction={() => setManualOpen(true)}
      />

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
            <span>输入食材和可选信息</span>
          </span>
        </button>
        <button className={styles.addAction} type="button" onClick={openUpload}>
          <span className={styles.actionIcon}>拍</span>
          <span className={styles.actionCopy}>
            <strong>上传图片 AI 录入</strong>
            <span>{hasAiApiKey() ? "识别后可二次编辑" : "需先配置 AI"}</span>
          </span>
        </button>
      </div>

      <nav className={styles.chips} aria-label="食材分类筛选">
        {ingredientCategoryFilters.map((item) => (
          <Chip
            key={item.label}
            active={selectedCategory === item.category}
            onClick={() => setSelectedCategory(item.category)}
          >
            {item.label}
          </Chip>
        ))}
      </nav>

      <section className={styles.categoryList} aria-label="食材分类列表">
        {renderListContent()}
      </section>
    </AppShell>
  );
}
