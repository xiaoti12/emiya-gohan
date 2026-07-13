import type { Env } from "../types";
import { createFamily, verifyFamily } from "../services/familyService";
import { HttpError } from "../utils/httpError";
import { readJson } from "../utils/request";
import { jsonOk } from "../utils/response";

export async function handleFamiliesRoute(request: Request, env: Env) {
  const url = new URL(request.url);

  if (request.method !== "POST") {
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口只支持 POST");
  }

  if (url.pathname === "/families/v1") {
    const family = await createFamily(env, await readJson(request));
    return jsonOk(request, env, family, 201);
  }

  if (url.pathname === "/families/verify/v1") {
    const family = await verifyFamily(env, await readJson(request));
    return jsonOk(request, env, family);
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}
