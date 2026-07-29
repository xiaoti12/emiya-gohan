import { recipeRecordQueries } from "../db/queries";
import type { Env } from "../types";
import { HttpError } from "../utils/httpError";
import { createId } from "../utils/id";

const recordTypes = ["want_to_cook", "planned", "cooked"] as const;
type RecordType = (typeof recordTypes)[number];

const maxDishNameLength = 50;
const maxNoteLength = 200;

export type RecipeRecordDto = {
  id: string;
  recipeId: string | null;
  dishName: string;
  recordType: RecordType;
  plannedDate: string | null;
  cookedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type RecipeRecordRow = {
  id: string;
  family_id: string;
  recipe_id: string | null;
  dish_name: string;
  record_type: RecordType;
  planned_date: string | null;
  cooked_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const allowedBodyKeys = [
  "dishName",
  "recordType",
  "recipeId",
  "plannedDate",
  "cookedAt",
  "note",
] as const;

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

function validateDishName(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", "dishName 必须是字符串");
  }
  const name = value.trim();
  const length = charLength(name);
  if (length < 1 || length > maxDishNameLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `dishName 需要填写 1–${maxDishNameLength} 个字符`,
    );
  }
  return name;
}

function validateRecordType(value: unknown): RecordType {
  if (typeof value !== "string" || !recordTypes.includes(value as RecordType)) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "recordType 必须是 want_to_cook、planned 或 cooked",
    );
  }
  return value as RecordType;
}

function validateDate(value: unknown, field: "plannedDate" | "cookedAt") {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", `${field} 必须是 YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, "INVALID_INPUT", `${field} 不是有效日期`);
  }
  return value;
}

function validateNote(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", "note 必须是字符串");
  }
  const text = value.trim();
  if (charLength(text) > maxNoteLength) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      `note 不能超过 ${maxNoteLength} 个字符`,
    );
  }
  return text || null;
}

function validateRecipeId(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", "recipeId 必须是字符串");
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function toDto(row: RecipeRecordRow): RecipeRecordDto {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    dishName: row.dish_name,
    recordType: row.record_type,
    plannedDate: row.planned_date,
    cookedAt: row.cooked_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 将请求中的 recipeId 解析为当前家庭可见集合中的有效 id。
 * - 已在 effective_recipes 中：原样返回
 * - 是已被家庭派生覆盖的基础菜：返回派生版 id
 * - 否则 404
 */
async function resolveEffectiveRecipeId(
  env: Env,
  familyId: string,
  recipeId: string,
) {
  const visible = await env.DB.prepare(recipeRecordQueries.recipeVisibleToFamily)
    .bind(familyId, familyId, recipeId)
    .first();
  if (visible) return recipeId;

  const familyVersion = await env.DB.prepare(
    recipeRecordQueries.findFamilyVersionIdByParent,
  )
    .bind(familyId, recipeId)
    .first<{ id: string }>();
  if (familyVersion) return familyVersion.id;

  throw new HttpError(404, "RECIPE_NOT_FOUND", "没有找到这道菜");
}

function validateRecordTypeFilter(value: string | null) {
  if (value === null) return null;
  if (!recordTypes.includes(value as RecordType)) {
    throw new HttpError(400, "INVALID_INPUT", "recordType 不合法");
  }
  return value as RecordType;
}

export async function listRecipeRecords(
  env: Env,
  familyId: string,
  recordTypeValue: string | null,
) {
  const recordType = validateRecordTypeFilter(recordTypeValue);
  const statement =
    recordType === "cooked"
      ? env.DB.prepare(recipeRecordQueries.listCookedByFamily).bind(familyId)
      : env.DB.prepare(recipeRecordQueries.listByFamilyAndType).bind(
          familyId,
          recordType,
        );
  const result = await statement.all<RecipeRecordRow>();
  return result.results.map(toDto);
}

export async function createRecipeRecord(
  env: Env,
  familyId: string,
  body: unknown,
) {
  const input = requireObject(body, "请求体");
  rejectUnknownKeys(input, "请求体");

  if (!Object.prototype.hasOwnProperty.call(input, "dishName")) {
    throw new HttpError(400, "INVALID_INPUT", "dishName 为必填字段");
  }
  if (!Object.prototype.hasOwnProperty.call(input, "recordType")) {
    throw new HttpError(400, "INVALID_INPUT", "recordType 为必填字段");
  }

  const dishName = validateDishName(input.dishName);
  const recordType = validateRecordType(input.recordType);
  const requestedRecipeId = validateRecipeId(input.recipeId);
  const plannedDate = validateDate(input.plannedDate, "plannedDate");
  const cookedAt = validateDate(input.cookedAt, "cookedAt");
  const note = validateNote(input.note);

  const recipeId = requestedRecipeId
    ? await resolveEffectiveRecipeId(env, familyId, requestedRecipeId)
    : null;

  const row = await env.DB.prepare(recipeRecordQueries.create)
    .bind(
      createId("rec"),
      familyId,
      recipeId,
      dishName,
      recordType,
      plannedDate,
      cookedAt,
      note,
    )
    .first<RecipeRecordRow>();

  if (!row) {
    throw new HttpError(500, "INTERNAL_ERROR", "创建记录失败");
  }

  return toDto(row);
}

export async function deleteRecipeRecord(
  env: Env,
  familyId: string,
  recordId: string,
) {
  const deleted = await env.DB.prepare(recipeRecordQueries.remove)
    .bind(recordId, familyId)
    .first<{ id: string }>();

  if (!deleted) {
    throw new HttpError(404, "RECORD_NOT_FOUND", "没有找到这条记录");
  }

  return { deletedId: deleted.id };
}