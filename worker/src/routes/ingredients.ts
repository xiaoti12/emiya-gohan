import type { Env } from "../types";
import {
  createIngredients,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from "../services/ingredientService";
import { requireFamily } from "../services/familyService";
import { HttpError } from "../utils/httpError";
import { readJson } from "../utils/request";
import { jsonOk } from "../utils/response";

const ingredientItemPattern = /^\/ingredients\/v1\/([^/]+)$/;

export async function handleIngredientsRoute(request: Request, env: Env) {
  const url = new URL(request.url);
  const itemMatch = url.pathname.match(ingredientItemPattern);

  if (url.pathname === "/ingredients/v1") {
    const family = await requireFamily(request, env);

    if (request.method === "GET") {
      const ingredients = await listIngredients(
        env,
        family.id,
        url.searchParams.get("category"),
      );
      return jsonOk(request, env, ingredients);
    }

    if (request.method === "POST") {
      const result = await createIngredients(env, family.id, await readJson(request));
      return jsonOk(request, env, result, 201);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  if (itemMatch) {
    const family = await requireFamily(request, env);
    let ingredientId: string;
    try {
      ingredientId = decodeURIComponent(itemMatch[1]);
    } catch {
      throw new HttpError(400, "INVALID_INPUT", "食材 ID 格式不正确");
    }

    if (request.method === "PATCH") {
      const ingredient = await updateIngredient(
        env,
        family.id,
        ingredientId,
        await readJson(request),
      );
      return jsonOk(request, env, ingredient);
    }

    if (request.method === "DELETE") {
      const result = await deleteIngredient(env, family.id, ingredientId);
      return jsonOk(request, env, result);
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "当前接口不支持这个请求方法");
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}
