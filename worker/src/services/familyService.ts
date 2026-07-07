import type { Env } from "../types";
import { familyQueries } from "../db/queries";
import { HttpError } from "../utils/httpError";
import { createFamilyId } from "../utils/id";
import { requireNonEmpty } from "../utils/normalize";

export type FamilyDto = {
  familyId: string;
  displayName: string;
};

type FamilyRow = {
  id: string;
  display_name: string;
};

function toFamilyDto(row: FamilyRow): FamilyDto {
  return {
    familyId: row.id,
    displayName: row.display_name,
  };
}

export async function createFamily(env: Env, body: unknown): Promise<FamilyDto> {
  const displayName = requireNonEmpty(
    typeof body === "object" && body !== null && "displayName" in body
      ? (body as { displayName?: unknown }).displayName
      : undefined,
    "displayName",
  );
  const familyId = createFamilyId();

  const row = await env.DB.prepare(familyQueries.create)
    .bind(familyId, displayName)
    .first<FamilyRow>();

  if (!row) {
    throw new HttpError(500, "FAMILY_CREATE_FAILED", "创建空间失败");
  }

  return toFamilyDto(row);
}

export async function verifyFamily(env: Env, body: unknown): Promise<FamilyDto> {
  const familyId = requireNonEmpty(
    typeof body === "object" && body !== null && "familyId" in body
      ? (body as { familyId?: unknown }).familyId
      : undefined,
    "familyId",
  );
  const row = await env.DB.prepare(familyQueries.findById)
    .bind(familyId)
    .first<FamilyRow>();

  if (!row) {
    throw new HttpError(404, "FAMILY_NOT_FOUND", "没有找到这个空间");
  }

  return toFamilyDto(row);
}
