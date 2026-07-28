import type { Env } from "../types";
import {
  createRecipeRecord,
  deleteRecipeRecord,
  listRecipeRecords,
} from "../services/recipeRecordService";
import { requireFamily } from "../services/familyService";
import { HttpError } from "../utils/httpError";
import { readJson } from "../utils/request";
import { jsonOk } from "../utils/response";

const recordItemPattern = /^\/recipe-records\/v1\/([^/]+)$/;

export async function handleRecipeRecordsRoute(request: Request, env: Env) {
  const url = new URL(request.url);
  const itemMatch = url.pathname.match(recordItemPattern);

  if (url.pathname === "/recipe-records/v1") {
    const family = await requireFamily(request, env);

    if (request.method === "GET") {
      const records = await listRecipeRecords(
        env,
        family.id,
        url.searchParams.get("recordType"),
      );
      return jsonOk(request, env, records);
    }

    if (request.method === "POST") {
      const record = await createRecipeRecord(
        env,
        family.id,
        await readJson(request),
      );
      return jsonOk(request, env, record, 201);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  if (itemMatch) {
    const family = await requireFamily(request, env);
    let recordId: string;
    try {
      recordId = decodeURIComponent(itemMatch[1]);
    } catch {
      throw new HttpError(400, "INVALID_INPUT", "记录 ID 格式不正确");
    }

    if (request.method === "DELETE") {
      const result = await deleteRecipeRecord(env, family.id, recordId);
      return jsonOk(request, env, result);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}