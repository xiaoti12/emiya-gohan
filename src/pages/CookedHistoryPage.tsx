import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { TopBar } from "../components/TopBar";
import { listRecipeRecords } from "../features/recipeRecords/api";
import type { RecipeRecord } from "../features/recipeRecords/types";
import { formatDisplayDate } from "../lib/date";
import { getErrorMessage } from "../lib/errors";
import styles from "./CookedHistoryPage.module.css";

function cookedDateLabel(record: RecipeRecord) {
  if (record.cookedAt) return formatDisplayDate(record.cookedAt);
  return formatDisplayDate(record.createdAt.slice(0, 10));
}

export function CookedHistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    void listRecipeRecords("cooked", controller.signal)
      .then((result) => {
        setRecords(result);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  function renderBody() {
    if (loading) {
      return <p className={styles.loadingText}>正在翻最近做过的菜…</p>;
    }

    if (error) {
      return (
        <EmptyState
          title="暂时加载不出来"
          description={error}
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
      );
    }

    if (records.length === 0) {
      return (
        <EmptyState
          title="还没有做过的菜"
          description="在「要做什么」里把计划标记为已做吧。"
        />
      );
    }

    return (
      <ul className={styles.list} aria-label="做过的菜">
        {records.map((record) => {
          const inner = (
            <>
              <span className={styles.itemName}>{record.dishName}</span>
              <span className={styles.itemDate}>{cookedDateLabel(record)}</span>
            </>
          );

          return (
            <li key={record.id} className={styles.item}>
              {record.recipeId ? (
                <button
                  type="button"
                  className={styles.itemMain}
                  onClick={() => navigate(`/recipes/${record.recipeId}`)}
                >
                  {inner}
                </button>
              ) : (
                <div className={styles.itemMain} aria-disabled>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <AppShell>
      <TopBar title="最近做过" showBack />
      <div className={styles.page}>{renderBody()}</div>
    </AppShell>
  );
}
