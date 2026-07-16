import type { Env } from "../types";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe,
} from "../services/recipeService";
import { requireFamily } from "../services/familyService";
import { HttpError } from "../utils/httpError";
import { readJson } from "../utils/request";
import { jsonOk } from "../utils/response";

const recipeItemPattern = /^\/recipes\/v1\/([^/]+)$/;

export async function handleRecipesRoute(request: Request, env: Env) {
  const url = new URL(request.url);
  const itemMatch = url.pathname.match(recipeItemPattern);

  if (url.pathname === "/recipes/v1") {
    const family = await requireFamily(request, env);

    if (request.method === "GET") {
      const page = await listRecipes(env, family.id, url);
      return jsonOk(request, env, page);
    }

    if (request.method === "POST") {
      const recipe = await createRecipe(env, family.id, await readJson(request));
      return jsonOk(request, env, recipe, 201);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  if (itemMatch) {
    const family = await requireFamily(request, env);
    let recipeId: string;
    try {
      recipeId = decodeURIComponent(itemMatch[1]);
    } catch {
      throw new HttpError(400, "INVALID_INPUT", "菜谱 ID 格式不正确");
    }

    if (request.method === "GET") {
      const recipe = await getRecipe(env, family.id, recipeId);
      return jsonOk(request, env, recipe);
    }

    if (request.method === "PATCH") {
      const recipe = await updateRecipe(
        env,
        family.id,
        recipeId,
        await readJson(request),
      );
      return jsonOk(request, env, recipe);
    }

    if (request.method === "DELETE") {
      const result = await deleteRecipe(env, family.id, recipeId);
      return jsonOk(request, env, result);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}
