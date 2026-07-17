import { recipeQueries } from "../db/queries";
import type { Env } from "../types";
import { HttpError } from "../utils/httpError";
import { createId } from "../utils/id";
import { normalizeText } from "../utils/normalize";

const defaultCategory = "其他";
const maxNameLength = 80;
const maxCategoryLength = 30;
const maxSummaryLength = 500;
const maxTagCount = 10;
const maxTagLength = 20;
const maxStepCount = 30;
const maxStepLength = 500;
const maxIngredientCount = 50;
const maxIngredientNameLength = 50;
const maxAmountLength = 50;
const defaultLimit = 30;
const maxLimit = 30;
const allowedBodyKeys = [
  "name",
  "category",
  "tags",
  "summary",
  "ingredients",
  "steps",
] as const;

export type RecipeSource = "howtocook" | "custom";

export type RecipeIngredientDto = {
  name: string;
  amount: string;
};

export type RecipeListItemDto = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  source: RecipeSource;
  parentRecipeId: string | null;
  summary: string;
  coverImageUrl: string | null;
  ingredients: RecipeIngredientDto[];
};

export type RecipeDetailDto = RecipeListItemDto & {
  familyVersionId: string | null;
  steps: string[];
  updatedAt: string;
};

export type RecipePageDto = {
  items: RecipeListItemDto[];
  nextId: string | null;
};

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

type ValidatedIngredient = {
  name: string;
  normalizedName: string;
  amount: string;
};

type ValidatedRecipeFields = {
  name: string;
  normalizedName: string;
  category: string;
  tags: string[];
  summary: string;
  steps: string[];
  ingredients: ValidatedIngredient[];
};

function charLength(value: string) {
  return Array.from(value).length;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label} 格式不正确`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(input: Record<string, unknown>, label: string) {
  for (const key of Object.keys(input)) {
    if (!(allowedBodyKeys as readonly string[]).includes(key)) {
      throw new HttpError(400, "INVALID_INPUT", `${label} 包含不支持的字段: ${key}`);
    }
  }
}

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

function validateName(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", `${label}.name 必须是字符串`);
  }
  const name = value.trim();
  const length = charLength(name);
  if (length < 1 || length > maxNameLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `${label}.name 需要填写 1–${maxNameLength} 个字符`,
    );
  }
  return { name, normalizedName: normalizeText(name) };
}

function validateCategory(value: unknown, label: string, fallback = defaultCategory) {
  const raw = value === undefined ? fallback : value;
  if (typeof raw !== "string") {
    throw new HttpError(400, "INVALID_INPUT", `${label}.category 必须是字符串`);
  }
  const category = raw.trim();
  const length = charLength(category);
  if (length < 1 || length > maxCategoryLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `${label}.category 需要填写 1–${maxCategoryLength} 个字符`,
    );
  }
  return category;
}

function validateSummary(value: unknown, label: string) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", `${label}.summary 必须是字符串`);
  }
  const summary = value.trim();
  if (charLength(summary) > maxSummaryLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `${label}.summary 不能超过 ${maxSummaryLength} 个字符`,
    );
  }
  return summary;
}

function validateTags(value: unknown, label: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.tags 必须是数组`);
  }
  if (value.length > maxTagCount) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.tags 最多 ${maxTagCount} 个`);
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      throw new HttpError(400, "INVALID_INPUT", `${label}.tags[${index}] 必须是字符串`);
    }
    const tag = item.trim();
    if (!tag) {
      throw new HttpError(400, "INVALID_INPUT", `${label}.tags[${index}] 不能为空`);
    }
    if (charLength(tag) > maxTagLength) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        `${label}.tags[${index}] 不能超过 ${maxTagLength} 个字符`,
      );
    }
    const normalized = normalizeText(tag);
    if (seen.has(normalized)) {
      throw new HttpError(400, "INVALID_INPUT", `${label}.tags 存在重复标签`);
    }
    seen.add(normalized);
    tags.push(tag);
  });
  return tags;
}

function validateSteps(value: unknown, label: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.steps 必须是数组`);
  }
  if (value.length > maxStepCount) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.steps 最多 ${maxStepCount} 步`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new HttpError(400, "INVALID_INPUT", `${label}.steps[${index}] 必须是字符串`);
    }
    const step = item.trim();
    if (!step) {
      throw new HttpError(400, "INVALID_INPUT", `${label}.steps[${index}] 不能为空`);
    }
    if (charLength(step) > maxStepLength) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        `${label}.steps[${index}] 不能超过 ${maxStepLength} 个字符`,
      );
    }
    return step;
  });
}

function validateIngredients(
  value: unknown,
  label: string,
  options: { required: boolean },
) {
  if (value === undefined) {
    if (options.required) {
      throw new HttpError(400, "INVALID_INPUT", `${label}.ingredients 至少需要 1 项`);
    }
    return [] as ValidatedIngredient[];
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.ingredients 必须是数组`);
  }
  if (value.length > maxIngredientCount) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `${label}.ingredients 最多 ${maxIngredientCount} 项`,
    );
  }
  if (options.required && value.length < 1) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.ingredients 至少需要 1 项`);
  }

  const ingredients: ValidatedIngredient[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const itemLabel = `${label}.ingredients[${index}]`;
    const object = requireObject(item, itemLabel);
    for (const key of Object.keys(object)) {
      if (key !== "name" && key !== "amount") {
        throw new HttpError(
          400,
          "INVALID_INPUT",
          `${itemLabel} 包含不支持的字段: ${key}`,
        );
      }
    }
    if (typeof object.name !== "string") {
      throw new HttpError(400, "INVALID_INPUT", `${itemLabel}.name 必须是字符串`);
    }
    const name = object.name.trim();
    if (!name || charLength(name) > maxIngredientNameLength) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        `${itemLabel}.name 需要填写 1–${maxIngredientNameLength} 个字符`,
      );
    }
    let amount = "";
    if (object.amount !== undefined && object.amount !== null) {
      if (typeof object.amount !== "string") {
        throw new HttpError(400, "INVALID_INPUT", `${itemLabel}.amount 必须是字符串`);
      }
      amount = object.amount.trim();
      if (charLength(amount) > maxAmountLength) {
        throw new HttpError(
          400,
          "INVALID_INPUT",
          `${itemLabel}.amount 不能超过 ${maxAmountLength} 个字符`,
        );
      }
    }
    const normalizedName = normalizeText(name);
    if (seen.has(normalizedName)) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        `${label}.ingredients 存在重复食材: ${name}`,
      );
    }
    seen.add(normalizedName);
    ingredients.push({ name, normalizedName, amount });
  });
  return ingredients;
}

function validateCreateBody(body: unknown): ValidatedRecipeFields {
  const input = requireObject(body, "请求体");
  rejectUnknownKeys(input, "请求体");
  if (!Object.prototype.hasOwnProperty.call(input, "name")) {
    throw new HttpError(400, "INVALID_INPUT", "name 为必填字段");
  }
  if (!Object.prototype.hasOwnProperty.call(input, "ingredients")) {
    throw new HttpError(400, "INVALID_INPUT", "ingredients 为必填字段");
  }

  const nameResult = validateName(input.name, "recipe");
  return {
    name: nameResult.name,
    normalizedName: nameResult.normalizedName,
    category: validateCategory(input.category, "recipe"),
    tags: validateTags(input.tags, "recipe"),
    summary: validateSummary(input.summary, "recipe"),
    steps: validateSteps(input.steps, "recipe"),
    ingredients: validateIngredients(input.ingredients, "recipe", {
      required: true,
    }),
  };
}

function validateLimit(value: string | null) {
  if (value === null || value === "") return defaultLimit;
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", "limit 必须是 1–30 的整数");
  }
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new HttpError(400, "INVALID_INPUT", "limit 必须是 1–30 的整数");
  }
  return limit;
}

function validateOptionalFilter(value: string | null, fieldName: string) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, "INVALID_INPUT", `${fieldName} 不能为空字符串`);
  }
  return normalizeText(trimmed);
}

function validateOptionalQueryText(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return normalizeText(trimmed);
}

function toIngredientDto(row: RecipeIngredientRow): RecipeIngredientDto {
  return {
    name: row.name,
    amount: row.amount ?? "",
  };
}

function toListItem(
  row: RecipeRow,
  ingredients: RecipeIngredientDto[],
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

function toDetail(
  row: RecipeRow,
  ingredients: RecipeIngredientDto[],
  familyVersionId: string | null,
): RecipeDetailDto {
  return {
    ...toListItem(row, ingredients),
    familyVersionId,
    steps: parseStringArray(row.steps_json),
    updatedAt: row.updated_at,
  };
}

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("unique") ||
    message.includes("constraint") ||
    message.includes("idx_recipes_active_family_name") ||
    message.includes("idx_recipes_active_family_parent")
  );
}

async function loadIngredientsByRecipeIds(env: Env, recipeIds: string[]) {
  const map = new Map<string, RecipeIngredientDto[]>();
  if (recipeIds.length === 0) return map;

  const placeholders = recipeIds.map(() => "?").join(", ");
  const sql = `${recipeQueries.listIngredientsByRecipeIdsPrefix} (${placeholders})`;
  const result = await env.DB.prepare(sql)
    .bind(...recipeIds)
    .all<RecipeIngredientRow>();

  for (const row of result.results) {
    const list = map.get(row.recipe_id) ?? [];
    list.push(toIngredientDto(row));
    map.set(row.recipe_id, list);
  }
  return map;
}

async function loadIngredients(env: Env, recipeId: string) {
  const result = await env.DB.prepare(recipeQueries.listIngredientsByRecipeId)
    .bind(recipeId)
    .all<RecipeIngredientRow>();
  return result.results.map(toIngredientDto);
}

function buildIngredientStatements(
  env: Env,
  recipeId: string,
  ingredients: ValidatedIngredient[],
) {
  return ingredients.map((item) =>
    env.DB.prepare(recipeQueries.createIngredient).bind(
      createId("recipe_ing"),
      recipeId,
      item.name,
      item.normalizedName,
      item.amount,
    ),
  );
}

async function assertNoNameConflict(
  env: Env,
  familyId: string,
  normalizedName: string,
  excludeId: string | null,
) {
  const conflict = await env.DB.prepare(recipeQueries.findFamilyNameConflict)
    .bind(familyId, normalizedName, excludeId, excludeId)
    .first<{ id: string }>();
  if (conflict) {
    throw new HttpError(409, "RECIPE_NAME_CONFLICT", "这个菜名已经存在");
  }
}

async function getDetailForFamilyRecipe(
  env: Env,
  familyId: string,
  recipeId: string,
) {
  const row = await env.DB.prepare(recipeQueries.findFamilyById)
    .bind(recipeId, familyId)
    .first<RecipeRow>();
  if (!row) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
  }
  const ingredients = await loadIngredients(env, recipeId);
  return toDetail(row, ingredients, null);
}

export async function listRecipes(env: Env, familyId: string, url: URL) {
  const limit = validateLimit(url.searchParams.get("limit"));
  const q = validateOptionalQueryText(url.searchParams.get("q"));
  const category = validateOptionalFilter(
    url.searchParams.get("category"),
    "category",
  );
  const tag = validateOptionalFilter(url.searchParams.get("tag"), "tag");
  const cursor = url.searchParams.get("cursor");

  let anchorUpdatedAt: string | null = null;
  let anchorId: string | null = null;

  if (cursor !== null && cursor !== "") {
    const anchor = await env.DB.prepare(recipeQueries.findAnchor)
      .bind(
        familyId,
        familyId,
        cursor,
        q,
        q,
        q,
        q,
        category,
        category,
        tag,
        tag,
      )
      .first<{ updated_at: string; id: string }>();

    if (!anchor) {
      return { items: [], nextId: null } satisfies RecipePageDto;
    }
    anchorUpdatedAt = anchor.updated_at;
    anchorId = anchor.id;
  }

  const rows = await env.DB.prepare(recipeQueries.list)
    .bind(
      familyId,
      familyId,
      q,
      q,
      q,
      q,
      category,
      category,
      tag,
      tag,
      anchorUpdatedAt,
      anchorUpdatedAt,
      anchorUpdatedAt,
      anchorId,
      limit + 1,
    )
    .all<RecipeRow>();

  const pageRows = rows.results.slice(0, limit);
  const hasMore = rows.results.length > limit;
  const ingredientMap = await loadIngredientsByRecipeIds(
    env,
    pageRows.map((row) => row.id),
  );
  const items = pageRows.map((row) =>
    toListItem(row, ingredientMap.get(row.id) ?? []),
  );

  return {
    items,
    nextId: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
  } satisfies RecipePageDto;
}

export async function getRecipe(env: Env, familyId: string, recipeId: string) {
  const familyRecipe = await env.DB.prepare(recipeQueries.findFamilyById)
    .bind(recipeId, familyId)
    .first<RecipeRow>();
  if (familyRecipe) {
    const ingredients = await loadIngredients(env, familyRecipe.id);
    return toDetail(familyRecipe, ingredients, null);
  }

  const baseRecipe = await env.DB.prepare(recipeQueries.findBaseById)
    .bind(recipeId)
    .first<RecipeRow>();
  if (!baseRecipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
  }

  const familyVersion = await env.DB.prepare(recipeQueries.findFamilyVersionByParent)
    .bind(familyId, baseRecipe.id)
    .first<RecipeRow>();
  const ingredients = await loadIngredients(env, baseRecipe.id);
  return toDetail(baseRecipe, ingredients, familyVersion?.id ?? null);
}

export async function createRecipe(env: Env, familyId: string, body: unknown) {
  const fields = validateCreateBody(body);
  await assertNoNameConflict(env, familyId, fields.normalizedName, null);

  const recipeId = createId("recipe");
  const statements = [
    env.DB.prepare(recipeQueries.create).bind(
      recipeId,
      familyId,
      null,
      fields.name,
      fields.normalizedName,
      fields.category,
      JSON.stringify(fields.tags),
      "custom",
      fields.summary,
      null,
      JSON.stringify(fields.steps),
    ),
    ...buildIngredientStatements(env, recipeId, fields.ingredients),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "RECIPE_NAME_CONFLICT", "这个菜名已经存在");
    }
    throw error;
  }

  return getDetailForFamilyRecipe(env, familyId, recipeId);
}

export async function updateRecipe(
  env: Env,
  familyId: string,
  recipeId: string,
  body: unknown,
) {
  const input = requireObject(body, "请求体");
  rejectUnknownKeys(input, "请求体");
  const hasSupportedField = allowedBodyKeys.some((field) =>
    Object.prototype.hasOwnProperty.call(input, field),
  );
  if (!hasSupportedField) {
    throw new HttpError(400, "INVALID_INPUT", "至少需要提供一个可修改字段");
  }

  const familyRecipe = await env.DB.prepare(recipeQueries.findFamilyById)
    .bind(recipeId, familyId)
    .first<RecipeRow>();

  if (familyRecipe) {
    return patchFamilyRecipe(env, familyId, familyRecipe, input);
  }

  const baseRecipe = await env.DB.prepare(recipeQueries.findBaseById)
    .bind(recipeId)
    .first<RecipeRow>();
  if (!baseRecipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
  }

  const existingVersion = await env.DB.prepare(recipeQueries.findFamilyVersionByParent)
    .bind(familyId, baseRecipe.id)
    .first<RecipeRow>();

  if (existingVersion) {
    return patchFamilyRecipe(env, familyId, existingVersion, input);
  }

  return deriveFromBase(env, familyId, baseRecipe, input);
}

async function patchFamilyRecipe(
  env: Env,
  familyId: string,
  current: RecipeRow,
  input: Record<string, unknown>,
) {
  const nameResult = Object.prototype.hasOwnProperty.call(input, "name")
    ? validateName(input.name, "recipe")
    : { name: current.name, normalizedName: current.normalized_name };
  const category = Object.prototype.hasOwnProperty.call(input, "category")
    ? validateCategory(input.category, "recipe", current.category)
    : current.category;
  const tags = Object.prototype.hasOwnProperty.call(input, "tags")
    ? validateTags(input.tags, "recipe")
    : parseStringArray(current.tags);
  const summary = Object.prototype.hasOwnProperty.call(input, "summary")
    ? validateSummary(input.summary, "recipe")
    : (current.summary ?? "");
  const steps = Object.prototype.hasOwnProperty.call(input, "steps")
    ? validateSteps(input.steps, "recipe")
    : parseStringArray(current.steps_json);
  const hasIngredients = Object.prototype.hasOwnProperty.call(input, "ingredients");
  const ingredients = hasIngredients
    ? validateIngredients(input.ingredients, "recipe", { required: true })
    : null;

  if (nameResult.normalizedName !== current.normalized_name) {
    await assertNoNameConflict(
      env,
      familyId,
      nameResult.normalizedName,
      current.id,
    );
  }

  const statements = [
    env.DB.prepare(recipeQueries.update).bind(
      nameResult.name,
      nameResult.normalizedName,
      category,
      JSON.stringify(tags),
      summary,
      JSON.stringify(steps),
      current.id,
      familyId,
    ),
  ];

  if (ingredients) {
    statements.push(
      env.DB.prepare(recipeQueries.deleteIngredientsByRecipeId).bind(current.id),
      ...buildIngredientStatements(env, current.id, ingredients),
    );
  }

  try {
    const results = await env.DB.batch(statements);
    const updated = results[0]?.results?.[0] as RecipeRow | undefined;
    if (!updated) {
      throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "RECIPE_NAME_CONFLICT", "这个菜名已经存在");
    }
    throw error;
  }

  return getDetailForFamilyRecipe(env, familyId, current.id);
}

async function deriveFromBase(
  env: Env,
  familyId: string,
  base: RecipeRow,
  input: Record<string, unknown>,
) {
  const nameResult = Object.prototype.hasOwnProperty.call(input, "name")
    ? validateName(input.name, "recipe")
    : { name: base.name, normalizedName: base.normalized_name };
  const category = Object.prototype.hasOwnProperty.call(input, "category")
    ? validateCategory(input.category, "recipe", base.category)
    : base.category;
  const tags = Object.prototype.hasOwnProperty.call(input, "tags")
    ? validateTags(input.tags, "recipe")
    : parseStringArray(base.tags);
  const summary = Object.prototype.hasOwnProperty.call(input, "summary")
    ? validateSummary(input.summary, "recipe")
    : (base.summary ?? "");
  const steps = Object.prototype.hasOwnProperty.call(input, "steps")
    ? validateSteps(input.steps, "recipe")
    : parseStringArray(base.steps_json);
  const hasIngredients = Object.prototype.hasOwnProperty.call(input, "ingredients");
  const ingredients = hasIngredients
    ? validateIngredients(input.ingredients, "recipe", { required: true })
    : (
        await env.DB.prepare(recipeQueries.listIngredientsByRecipeId)
          .bind(base.id)
          .all<RecipeIngredientRow>()
      ).results.map((row) => ({
        name: row.name,
        normalizedName: row.normalized_name,
        amount: row.amount ?? "",
      }));

  if (ingredients.length < 1) {
    throw new HttpError(400, "INVALID_INPUT", "ingredients 至少需要 1 项");
  }

  await assertNoNameConflict(env, familyId, nameResult.normalizedName, null);

  const derivedId = createId("recipe");
  const statements = [
    env.DB.prepare(recipeQueries.create).bind(
      derivedId,
      familyId,
      base.id,
      nameResult.name,
      nameResult.normalizedName,
      category,
      JSON.stringify(tags),
      "custom",
      summary,
      base.cover_image_url,
      JSON.stringify(steps),
    ),
    ...buildIngredientStatements(env, derivedId, ingredients),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "RECIPE_NAME_CONFLICT", "这个菜名已经存在");
    }
    throw error;
  }

  return getDetailForFamilyRecipe(env, familyId, derivedId);
}

export async function deleteRecipe(env: Env, familyId: string, recipeId: string) {
  const baseRecipe = await env.DB.prepare(recipeQueries.findBaseById)
    .bind(recipeId)
    .first<RecipeRow>();
  if (baseRecipe) {
    throw new HttpError(403, "BASE_RECIPE_READ_ONLY", "基础菜谱不能删除");
  }

  const deleted = await env.DB.prepare(recipeQueries.remove)
    .bind(recipeId, familyId)
    .first<{ id: string }>();
  if (!deleted) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
  }

  return { deletedId: deleted.id };
}
