import { recommendationQueries, recipeQueries } from "../db/queries";
import type { Env } from "../types";
import { HttpError } from "../utils/httpError";
import { normalizeText } from "../utils/normalize";
import type { RecipeListItemDto, RecipeSource } from "./recipeService";

const defaultLimit = 3;
const maxLimit = 10;

type RecipeRow = {
  id: string;
  family_id: string | null;
  parent_recipe_id: string | null;
  name: string;
  normalized_name: string;
  category: string;
  tags: string;
  source: RecipeSource;
  summary: string | null;
  cover_image_url: string | null;
  steps_json: string;
  updated_at: string;
};

type RecipeIngredientRow = {
  id: string;
  recipe_id: string;
  name: string;
  normalized_name: string;
  amount: string | null;
};

export type RecommendationResultDto = {
  items: RecipeListItemDto[];
};

function parseStringArray(value: string | null | undefined, fallback: string[] = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return fallback;
  }
}

function validateLimit(value: string | null) {
  if (value === null || value === "") return defaultLimit;
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", "limit 必须是 1–10 的整数");
  }
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new HttpError(400, "INVALID_INPUT", "limit 必须是 1–10 的整数");
  }
  return limit;
}

function validateCategory(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, "INVALID_INPUT", "category 不能为空字符串");
  }
  return normalizeText(trimmed);
}

function validateSeed(value: string | null) {
  if (value === null || value === "") return Date.now();
  const seed = Number(value);
  if (!Number.isFinite(seed)) {
    throw new HttpError(400, "INVALID_INPUT", "seed 必须是有限数字");
  }
  return seed;
}

function validateExcludeSince(value: string | null) {
  if (value === null || value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", "excludeSince 必须是 YYYY-MM-DD");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, "INVALID_INPUT", "excludeSince 不是有效日期");
  }
  return value;
}

function shuffleBySeed<T>(items: T[], seed: number) {
  const result = [...items];
  let state = Math.abs(Math.trunc(seed)) || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const next = Math.floor((state / 233280) * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }

  return result;
}

function toListItem(
  row: RecipeRow,
  ingredients: Array<{ name: string; amount: string }>,
): RecipeListItemDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: parseStringArray(row.tags),
    source: row.source,
    parentRecipeId: row.parent_recipe_id,
    summary: row.summary ?? "",
    coverImageUrl: row.cover_image_url ?? null,
    ingredients,
  };
}

async function loadIngredientsByRecipeIds(env: Env, recipeIds: string[]) {
  const map = new Map<string, Array<{ name: string; amount: string }>>();
  if (recipeIds.length === 0) return map;

  const placeholders = recipeIds.map(() => "?").join(", ");
  const sql = `${recipeQueries.listIngredientsByRecipeIdsPrefix} (${placeholders})`;
  const result = await env.DB.prepare(sql)
    .bind(...recipeIds)
    .all<RecipeIngredientRow>();

  for (const row of result.results) {
    const list = map.get(row.recipe_id) ?? [];
    list.push({
      name: row.name,
      amount: row.amount ?? "",
    });
    map.set(row.recipe_id, list);
  }
  return map;
}

async function loadRecipesByIds(env: Env, recipeIds: string[]) {
  if (recipeIds.length === 0) return new Map<string, RecipeRow>();

  const placeholders = recipeIds.map(() => "?").join(", ");
  const sql = `${recommendationQueries.listByIdsPrefix} (${placeholders})`;
  const result = await env.DB.prepare(sql)
    .bind(...recipeIds)
    .all<RecipeRow>();

  return new Map(result.results.map((row) => [row.id, row]));
}

export async function getRecommendations(env: Env, familyId: string, url: URL) {
  const limit = validateLimit(url.searchParams.get("limit"));
  const category = validateCategory(url.searchParams.get("category"));
  const seed = validateSeed(url.searchParams.get("seed"));
  const excludeSince = validateExcludeSince(url.searchParams.get("excludeSince"));

  const candidates = await env.DB.prepare(recommendationQueries.listCandidateIds)
    .bind(
      familyId,
      familyId,
      category,
      category,
      excludeSince,
      familyId,
      excludeSince,
    )
    .all<{ id: string }>();

  const selectedIds = shuffleBySeed(
    candidates.results.map((row) => row.id),
    seed,
  ).slice(0, limit);

  const [recipeMap, ingredientMap] = await Promise.all([
    loadRecipesByIds(env, selectedIds),
    loadIngredientsByRecipeIds(env, selectedIds),
  ]);

  const items = selectedIds.flatMap((id) => {
    const row = recipeMap.get(id);
    if (!row) return [];
    return [toListItem(row, ingredientMap.get(id) ?? [])];
  });

  return { items } satisfies RecommendationResultDto;
}
