import type { Env } from "../types";
import { requireFamily } from "../services/familyService";
import { getRecommendations } from "../services/recommendationService";
import { HttpError } from "../utils/httpError";
import { jsonOk } from "../utils/response";

export async function handleRecommendationsRoute(request: Request, env: Env) {
  const url = new URL(request.url);

  if (url.pathname === "/recommendations/v1") {
    if (request.method !== "GET") {
      throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
    }

    const family = await requireFamily(request, env);
    const result = await getRecommendations(env, family.id, url);
    return jsonOk(request, env, result);
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}
