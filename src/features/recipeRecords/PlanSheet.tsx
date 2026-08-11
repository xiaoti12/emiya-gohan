import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../components/BottomSheet";
import { Chip } from "../../components/Chip";
import { EmptyState } from "../../components/EmptyState";
import {
  createRecipeRecord,
  deleteRecipeRecord,
} from "./api";
import { DishSuggestInput } from "./DishSuggestInput";
import type { RecipeRecord } from "./types";
import { usePlannedRecords } from "../../hooks/useRecipeRecords";
import {
  formatDisplayDate,
  nearestWeekendISO,
  todayISO,
  tomorrowISO,
} from "../../lib/date";
import styles from "./PlanSheet.module.css";

type PlanDateOption = "今天" | "明天" | "周末";
type FilterChip = "今天" | "明天" | "周末" | "全部";

type PlanSheetProps = {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
};

const dateMap: Record<PlanDateOption, string> = {
  今天: todayISO(),
  明天: tomorrowISO(),
  周末: nearestWeekendISO(),
};

const filterChips: FilterChip[] = ["今天", "明天", "周末", "全部"];

const filterDateMap: Record<FilterChip, string | null> = {
  今天: todayISO(),
  明天: tomorrowISO(),
  周末: nearestWeekendISO(),
  全部: null,
};

function dateLabel(record: RecipeRecord) {
  if (record.plannedDate) return formatDisplayDate(record.plannedDate);
  return "未设置日期";
}

// 复用后端排序规则：planned_date ASC（无日期排末尾）→ created_at ASC。
// 删除/新增的乐观更新都借此保持顺序与服务端一致。
function sortPlannedRecords(list: RecipeRecord[]): RecipeRecord[] {
  return [...list].sort((a, b) => {
    const dateA = a.plannedDate ?? "9999-12-31";
    const dateB = b.plannedDate ?? "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

// 用真实记录替换缓存里的临时项；若已存在同名同日期项（重拉对帐过），直接跳过。
function replaceTemp(
  list: RecipeRecord[] | undefined,
  tempId: string,
  created: RecipeRecord,
): RecipeRecord[] {
  const base = list ?? [];
  if (!base.some((item) => item.id === tempId)) {
    if (base.some((item) => item.id === created.id)) return base;
    return [...base, created];
  }
  return base.map((item) => (item.id === tempId ? created : item));
}

export function PlanSheet({ open, onClose, onToast }: PlanSheetProps) {
  const navigate = useNavigate();
  const { records: cachedRecords, error: listError, mutate, loading: listLoading } =
    usePlannedRecords(open);
  const records = cachedRecords ?? [];
  const [filterChip, setFilterChip] = useState<FilterChip>("全部");

  const [dishName, setDishName] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState<PlanDateOption>("今天");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    const filterDate = filterDateMap[filterChip];
    if (!filterDate) return records;
    return records.filter((r) => r.plannedDate === filterDate);
  }, [records, filterChip]);

  function handleSuggestChange(name: string, id: string | null) {
    setDishName(name);
    setRecipeId(id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const finalDishName = dishName.trim() || "一道好菜";
    setSubmitError("");
    setSubmitting(true);

    // 乐观插入：写请求发出前先放一条临时项，UI 立即可见。
    // 用 Date.now() 生成临时 id，写成功后用后端返回的真实记录替换。
    const tempId = `temp-${Date.now()}`;
    const plannedDate = dateMap[planDate];
    const optimisticRecord: RecipeRecord = {
      id: tempId,
      recipeId: recipeId,
      dishName: finalDishName,
      recordType: "planned",
      plannedDate,
      cookedAt: null,
      note: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await mutate(
      (list) => sortPlannedRecords([...(list ?? []), optimisticRecord]),
      { revalidate: false },
    );

    try {
      const created = await createRecipeRecord({
        dishName: finalDishName,
        recordType: "planned",
        recipeId: recipeId,
        plannedDate,
      });
      // 用后端返回的真实记录替换临时项。
      await mutate(
        (list) => sortPlannedRecords(replaceTemp(list, tempId, created)),
        { revalidate: false },
      );
      setDishName("");
      setRecipeId(null);
      setPlanDate("今天");
      onToast(`已添加：${finalDishName}（${planDate}）`);
      void mutate();
    } catch (err: unknown) {
      // 失败：移除临时项并提示。
      await mutate(
        (list) => (list ?? []).filter((item) => item.id !== tempId),
        { revalidate: false },
      );
      const message =
        err instanceof Error ? err.message : "添加失败,请重试";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(record: RecipeRecord) {
    if (deletingId || markingId) return;
    setDeletingId(record.id);
    // 乐观删除：立即从缓存移除，后台再静默对帐。
    const previous = records;
    await mutate(
      (list) => (list ?? []).filter((item) => item.id !== record.id),
      { revalidate: false },
    );
    try {
      await deleteRecipeRecord(record.id);
      onToast("已删除计划");
      void mutate();
    } catch (err: unknown) {
      await mutate(previous, { revalidate: false });
      const message =
        err instanceof Error ? err.message : "删除失败,请重试";
      onToast(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMarkCooked(record: RecipeRecord) {
    if (markingId || deletingId) return;
    setMarkingId(record.id);
    // 乐观删除：先把 planned 缓存里的这条移除，提升顺滑度；失败再回滚。
    const previous = records;
    await mutate(
      (list) => (list ?? []).filter((item) => item.id !== record.id),
      { revalidate: false },
    );
    try {
      await createRecipeRecord({
        dishName: record.dishName,
        recordType: "cooked",
        recipeId: record.recipeId,
        cookedAt: todayISO(),
      });
      try {
        await deleteRecipeRecord(record.id);
        onToast(`已记做过：${record.dishName}`);
        await mutate();
      } catch {
        onToast("已记做过，计划未移除，可手动删除");
        await mutate();
      }
    } catch (err: unknown) {
      // 回滚到操作前的缓存
      await mutate(previous, { revalidate: false });
      const message =
        err instanceof Error ? err.message : "标记失败,请重试";
      onToast(message);
    } finally {
      setMarkingId(null);
    }
  }

  function openCookedHistory() {
    onClose();
    navigate("/cooked-history");
  }

  return (
    <BottomSheet title="要做什么" open={open} onClose={onClose} variant="edge">
      <div className={styles.planSection}>
        <div>
          <div className={styles.listHeader}>
            <div className={styles.chips} aria-label="日期筛选">
              {filterChips.map((chip) => (
                <Chip
                  key={chip}
                  active={filterChip === chip}
                  onClick={() => setFilterChip(chip)}
                >
                  {chip}
                </Chip>
              ))}
            </div>
            <button
              type="button"
              className={styles.historyLink}
              onClick={openCookedHistory}
            >
              最近做过
            </button>
          </div>
          {listError ? (
            <p style={{ color: "#c0392b", fontSize: 13 }}>
              {listError instanceof Error
                ? listError.message
                : "加载计划失败,请重试"}
            </p>
          ) : null}
          {listLoading ? (
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
              加载中…
            </p>
          ) : filteredRecords.length > 0 ? (
            <ul className={styles.list} aria-label="计划列表">
              {filteredRecords.map((record) => {
                const name = record.dishName;
                const busy =
                  deletingId === record.id || markingId === record.id;
                const inner = (
                  <>
                    <span className={styles.itemName}>{name}</span>
                    <span
                      className={`${styles.itemDate} ${
                        record.plannedDate ? "" : styles.itemNoDate
                      }`}
                    >
                      {dateLabel(record)}
                    </span>
                  </>
                );
                return (
                  <li key={record.id} className={styles.planItem}>
                    {record.recipeId ? (
                      <button
                        type="button"
                        className={styles.itemMain}
                        onClick={() => {
                          onClose();
                          navigate(`/recipes/${record.recipeId}`);
                        }}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className={styles.itemMain} aria-disabled>
                        {inner}
                      </div>
                    )}
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.doneButton}
                        aria-label="标记已做"
                        onClick={() => void handleMarkCooked(record)}
                        disabled={busy}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        aria-label="删除计划"
                        onClick={() => void handleDelete(record)}
                        disabled={busy}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="还没有计划"
              description="在下方记一道想吃的菜吧。"
            />
          )}
        </div>

        <hr className={styles.divider} />

        <form onSubmit={handleSubmit}>
          {submitError ? (
            <div className={styles.formError}>{submitError}</div>
          ) : null}
          <div className={styles.field}>
            <label htmlFor="dishInput">菜品</label>
            <DishSuggestInput
              id="dishInput"
              value={dishName}
              onChange={handleSuggestChange}
            />
          </div>
          <div className={styles.field}>
            <label>日期</label>
            <div className={styles.dateRow} role="group" aria-label="快捷日期">
              {(["今天", "明天", "周末"] as PlanDateOption[]).map((item) => (
                <button
                  key={item}
                  className={`${styles.dateButton} ${
                    planDate === item ? styles.dateButtonActive : ""
                  }`}
                  type="button"
                  onClick={() => setPlanDate(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button
            className={styles.submitButton}
            type="submit"
            disabled={submitting}
          >
            添加到计划
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
