import type { Env } from "../types";
import { familyQueries } from "../db/queries";
import { HttpError } from "../utils/httpError";
import { createFamilyId } from "../utils/id";
import { normalizeText } from "../utils/normalize";

export type FamilyDto = {
  familyId: string;
  displayName: string;
};

type FamilyRow = {
  id: string;
  display_name: string;
};

type FamilyRecord = {
  id: string;
  displayName: string;
};

function toFamilyDto(row: FamilyRow): FamilyDto {
  return {
    familyId: row.id,
    displayName: row.display_name,
  };
}

function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "INVALID_INPUT", "请求体格式不正确");
  }

  return body as Record<string, unknown>;
}

function validateDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_INPUT", "displayName 必须是字符串");
  }

  const displayName = value.trim();
  const length = Array.from(displayName).length;
  if (length < 2 || length > 30) {
    throw new HttpError(400, "INVALID_INPUT", "家庭名称需要填写 2–30 个字符");
  }

  return {
    displayName,
    normalizedName: normalizeText(displayName),
  };
}

function validateFamilyId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "INVALID_INPUT", "familyId 不能为空");
  }

  return value.trim();
}

export async function createFamily(env: Env, body: unknown): Promise<FamilyDto> {
  const input = requireObject(body);
  const { displayName, normalizedName } = validateDisplayName(input.displayName);
  const familyId = createFamilyId();

  const row = await env.DB.prepare(familyQueries.create)
    .bind(familyId, displayName, normalizedName)
    .first<FamilyRow>();

  if (!row) {
    throw new HttpError(
      409,
      "FAMILY_NAME_CONFLICT",
      "这个家庭名称已经存在，请切换到加入",
    );
  }

  return toFamilyDto(row);
}

export async function verifyFamily(env: Env, body: unknown): Promise<FamilyDto> {
  const input = requireObject(body);
  const hasFamilyId = Object.prototype.hasOwnProperty.call(input, "familyId");
  const hasDisplayName = Object.prototype.hasOwnProperty.call(input, "displayName");

  if (hasFamilyId === hasDisplayName) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "familyId 和 displayName 必须且只能填写一个",
    );
  }

  let row: FamilyRow | null;
  if (hasFamilyId) {
    const familyId = validateFamilyId(input.familyId);
    row = await env.DB.prepare(familyQueries.findById)
      .bind(familyId)
      .first<FamilyRow>();
  } else {
    const { normalizedName } = validateDisplayName(input.displayName);
    row = await env.DB.prepare(familyQueries.findByNormalizedName)
      .bind(normalizedName)
      .first<FamilyRow>();
  }

  if (!row) {
    throw new HttpError(404, "FAMILY_NOT_FOUND", "没有找到这个家庭");
  }

  return toFamilyDto(row);
}

export async function requireFamily(
  request: Request,
  env: Env,
): Promise<FamilyRecord> {
  const familyId = request.headers.get("X-Family-Id")?.trim();
  if (!familyId) {
    throw new HttpError(401, "FAMILY_ID_REQUIRED", "缺少家庭空间信息");
  }

  const row = await env.DB.prepare(familyQueries.findById)
    .bind(familyId)
    .first<FamilyRow>();

  if (!row) {
    throw new HttpError(401, "FAMILY_ID_INVALID", "家庭空间已失效");
  }

  return {
    id: row.id,
    displayName: row.display_name,
  };
}
