import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../components/BottomSheet";
import { Chip } from "../../components/Chip";
import { EmptyState } from "../../components/EmptyState";
import {
  createRecipeRecord,
  deleteRecipeRecord,
  listRecipeRecords,
} from "./api";
import { DishSuggestInput } from "./DishSuggestInput";
import type { RecipeRecord } from "./types";
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

export function PlanSheet({ open, onClose, onToast }: PlanSheetProps) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecipeRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [filterChip, setFilterChip] = useState<FilterChip>("全部");

  const [dishName, setDishName] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState<PlanDateOption>("今天");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!open) return;
    setListLoading(true);
    setListError("");
    try {
      const result = await listRecipeRecords("planned");
      setRecords(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "加载计划失败,请重试";
      setListError(message);
    } finally {
      setListLoading(false);
    }
  }, [open]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

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
    try {
      await createRecipeRecord({
        dishName: finalDishName,
        recordType: "planned",
        recipeId: recipeId,
        plannedDate: dateMap[planDate],
      });
      setDishName("");
      setRecipeId(null);
      setPlanDate("今天");
      onToast(`已添加：${finalDishName}（${planDate}）`);
      await fetchRecords();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "添加失败,请重试";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(record: RecipeRecord) {
    if (deletingId) return;
    setDeletingId(record.id);
    try {
      await deleteRecipeRecord(record.id);
      setRecords((list) => list.filter((item) => item.id !== record.id));
      onToast("已删除计划");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "删除失败,请重试";
      onToast(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <BottomSheet title="要做什么" open={open} onClose={onClose} variant="edge">
      <div className={styles.planSection}>
        <div>
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
          {listError ? (
            <p style={{ color: "#c0392b", fontSize: 13 }}>{listError}</p>
          ) : null}
          {listLoading ? (
            <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
              加载中…
            </p>
          ) : filteredRecords.length > 0 ? (
            <ul className={styles.list} aria-label="计划列表">
              {filteredRecords.map((record) => {
                const name = record.dishName;
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
                    <button
                      type="button"
                      className={styles.deleteButton}
                      aria-label="删除计划"
                      onClick={() => void handleDelete(record)}
                      disabled={deletingId === record.id}
                    >
                      ×
                    </button>
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