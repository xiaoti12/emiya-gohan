import { useEffect, useRef, useState } from "react";
import { listRecipes } from "../recipes/api";
import type { RecipeListItem } from "../recipes/types";
import styles from "./DishSuggestInput.module.css";

type DishSuggestInputProps = {
  value: string;
  onChange: (dishName: string, recipeId: string | null) => void;
  placeholder?: string;
  id?: string;
};

export function DishSuggestInput({
  value,
  onChange,
  placeholder,
  id,
}: DishSuggestInputProps) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  function runSearch(q: string) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    listRecipes({ q, limit: 8 }, controller.signal)
      .then((page) => setSuggestions(page.items))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
        setError("联想菜谱失败,可直接填写菜名");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    onChange(text, null);
    setSelectedRecipeId(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    timerRef.current = window.setTimeout(() => runSearch(q), 300);
  }

  function handleFocus() {
    setFocused(true);
    const q = value.trim();
    if (q && suggestions.length === 0 && !loading && !error) {
      runSearch(q);
    }
  }

  function handleBlur() {
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(() => setFocused(false), 150);
  }

  function pickSuggestion(recipe: RecipeListItem) {
    onChange(recipe.name, recipe.id);
    setSelectedRecipeId(recipe.id);
    setSuggestions([]);
    setFocused(false);
  }

  function pickCustom() {
    const name = value.trim() || value;
    onChange(name, null);
    setSelectedRecipeId(null);
    setSuggestions([]);
    setFocused(false);
  }

  const q = value.trim();
  const showDropdown = focused && q.length >= 1;
  const hasCustomMatch = suggestions.some(
    (item) => item.name.trim() === q || item.name.trim() === value.trim(),
  );

  return (
    <div className={styles.suggestInput}>
      <input
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder ?? "例如：番茄炒蛋、冬瓜排骨汤"}
        autoComplete="off"
      />
      {showDropdown ? (
        <div className={styles.dropdown} role="listbox">
          {loading ? (
            <div className={styles.loading}>搜索中…</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : suggestions.length === 0 ? (
            <div className={styles.empty}>没有匹配的菜谱,可直接填写菜名</div>
          ) : (
            suggestions.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className={styles.option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickSuggestion(recipe)}
                aria-selected={selectedRecipeId === recipe.id}
                role="option"
              >
                <span className={styles.optionName}>{recipe.name}</span>
                <span className={styles.optionCategory}>{recipe.category}</span>
              </button>
            ))
          )}
          {!hasCustomMatch ? (
            <button
              type="button"
              className={styles.customOption}
              onMouseDown={(event) => event.preventDefault()}
              onClick={pickCustom}
            >
              用 “{q}” 作为自定义菜名
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}