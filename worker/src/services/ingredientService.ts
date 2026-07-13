import { ingredientQueries } from "../db/queries";
import type { Env } from "../types";
import { HttpError } from "../utils/httpError";
import { createId } from "../utils/id";
import { normalizeText } from "../utils/normalize";

const ingredientCategories = ["vegetable", "meat", "other"] as const;
const maxCreateItems = 50;
type IngredientCategory = (typeof ingredientCategories)[number];

export type IngredientDto = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
  expireDate: string | null;
  note: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
  expire_date: string | null;
  note: string | null;
};

type ValidatedIngredient = {
  name: string;
  normalizedName: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
  expireDate: string | null;
  note: string | null;
};

function toIngredientDto(row: IngredientRow): IngredientDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expireDate: row.expire_date,
    note: row.note,
  };
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label} 格式不正确`);
  }

  return value as Record<string, unknown>;
}

function validateName(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", `${label}.name 必须是字符串`);
  }

  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 1 || length > 50) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.name 需要填写 1–50 个字符`);
  }

  return { name, normalizedName: normalizeText(name) };
}

function validateCategory(
  value: unknown,
  label: string,
  fallback: IngredientCategory = "other",
): IngredientCategory {
  const category = value === undefined ? fallback : value;
  if (
    typeof category !== "string" ||
    !ingredientCategories.includes(category as IngredientCategory)
  ) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.category 不合法`);
  }

  return category as IngredientCategory;
}

function validateQuantity(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.quantity 必须是大于 0 的数字`);
  }

  return value;
}

function validateOptionalText(
  value: unknown,
  fieldName: "unit" | "note",
  label: string,
  maxLength?: number,
) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", `${label}.${fieldName} 必须是字符串`);
  }

  const text = value.trim();
  if (maxLength !== undefined && Array.from(text).length > maxLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `${label}.${fieldName} 不能超过 ${maxLength} 个字符`,
    );
  }

  return text || null;
}

function validateExpireDate(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.expireDate 必须是 YYYY-MM-DD`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, "INVALID_INPUT", `${label}.expireDate 不是有效日期`);
  }

  return value;
}

function validateCreateItem(value: unknown, index: number): ValidatedIngredient {
  const label = `items[${index}]`;
  const item = requireObject(value, label);
  const { name, normalizedName } = validateName(item.name, label);

  return {
    name,
    normalizedName,
    category: validateCategory(item.category, label),
    quantity: validateQuantity(item.quantity, label),
    unit: validateOptionalText(item.unit, "unit", label, 20),
    expireDate: validateExpireDate(item.expireDate, label),
    note: validateOptionalText(item.note, "note", label),
  };
}

function validateCategoryFilter(value: string | null) {
  if (value === null) return null;
  if (!ingredientCategories.includes(value as IngredientCategory)) {
    throw new HttpError(400, "INVALID_INPUT", "category 查询参数不合法");
  }

  return value as IngredientCategory;
}

export async function listIngredients(
  env: Env,
  familyId: string,
  categoryValue: string | null,
) {
  const category = validateCategoryFilter(categoryValue);
  const statement = category
    ? env.DB.prepare(ingredientQueries.listByCategory).bind(familyId, category)
    : env.DB.prepare(ingredientQueries.list).bind(familyId);
  const result = await statement.all<IngredientRow>();
  return result.results.map(toIngredientDto);
}

export async function createIngredients(
  env: Env,
  familyId: string,
  body: unknown,
) {
  const input = requireObject(body, "请求体");
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new HttpError(400, "INVALID_INPUT", "items 必须是非空数组");
  }
  if (input.items.length > maxCreateItems) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `一次最多添加 ${maxCreateItems} 个食材`,
    );
  }

  const items = input.items.map(validateCreateItem);
  const statements = items.map((item) =>
    env.DB.prepare(ingredientQueries.create).bind(
      createId("ing"),
      familyId,
      item.name,
      item.normalizedName,
      item.category,
      item.quantity,
      item.unit,
      item.expireDate,
      item.note,
    ),
  );
  const results = await env.DB.batch<IngredientRow>(statements);
  const createdItems = results.flatMap((result) =>
    result.results.map(toIngredientDto),
  );

  return {
    items: createdItems,
    createdCount: createdItems.length,
    skippedCount: items.length - createdItems.length,
  };
}

export async function updateIngredient(
  env: Env,
  familyId: string,
  ingredientId: string,
  body: unknown,
) {
  const input = requireObject(body, "请求体");
  const supportedFields = [
    "name",
    "category",
    "quantity",
    "unit",
    "expireDate",
    "note",
  ] as const;
  const hasSupportedField = supportedFields.some((field) =>
    Object.prototype.hasOwnProperty.call(input, field),
  );
  if (!hasSupportedField) {
    throw new HttpError(400, "INVALID_INPUT", "至少需要提供一个可修改字段");
  }

  const current = await env.DB.prepare(ingredientQueries.findById)
    .bind(ingredientId, familyId)
    .first<IngredientRow>();
  if (!current) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "没有找到这个食材");
  }

  const nameResult = Object.prototype.hasOwnProperty.call(input, "name")
    ? validateName(input.name, "ingredient")
    : { name: current.name, normalizedName: normalizeText(current.name) };
  const category = Object.prototype.hasOwnProperty.call(input, "category")
    ? validateCategory(input.category, "ingredient", current.category)
    : current.category;
  const quantity = Object.prototype.hasOwnProperty.call(input, "quantity")
    ? validateQuantity(input.quantity, "ingredient")
    : current.quantity;
  const unit = Object.prototype.hasOwnProperty.call(input, "unit")
    ? validateOptionalText(input.unit, "unit", "ingredient", 20)
    : current.unit;
  const expireDate = Object.prototype.hasOwnProperty.call(input, "expireDate")
    ? validateExpireDate(input.expireDate, "ingredient")
    : current.expire_date;
  const note = Object.prototype.hasOwnProperty.call(input, "note")
    ? validateOptionalText(input.note, "note", "ingredient")
    : current.note;

  const updated = await env.DB.prepare(ingredientQueries.update)
    .bind(
      nameResult.name,
      nameResult.normalizedName,
      category,
      quantity,
      unit,
      expireDate,
      note,
      ingredientId,
      familyId,
    )
    .first<IngredientRow>();

  if (updated) {
    return toIngredientDto(updated);
  }

  const stillExists = await env.DB.prepare(ingredientQueries.findById)
    .bind(ingredientId, familyId)
    .first<IngredientRow>();
  if (!stillExists) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "没有找到这个食材");
  }

  throw new HttpError(409, "INGREDIENT_NAME_CONFLICT", "这个食材已经存在");
}

export async function deleteIngredient(
  env: Env,
  familyId: string,
  ingredientId: string,
) {
  const deleted = await env.DB.prepare(ingredientQueries.remove)
    .bind(ingredientId, familyId)
    .first<{ id: string }>();

  if (!deleted) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "没有找到这个食材");
  }

  return { deletedId: deleted.id };
}
