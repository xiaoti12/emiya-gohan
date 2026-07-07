import type { Env } from "./types";
import { handleFamiliesRoute } from "./routes/families";
import { handleIngredientsRoute } from "./routes/ingredients";
import { handleRecipesRoute } from "./routes/recipes";
import { handleRecipeRecordsRoute } from "./routes/recipeRecords";
import { handleRecommendationsRoute } from "./routes/recommendations";
import { handleOptions } from "./utils/cors";
import { HttpError, isHttpError } from "./utils/httpError";
import { jsonError, jsonOk } from "./utils/response";

async function dispatch(request: Request, env: Env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return handleOptions(request, env);
  }

  if (url.pathname === "/healthz" && request.method === "GET") {
    return jsonOk(request, env, { ok: true });
  }

  if (url.pathname.startsWith("/families/")) {
    return handleFamiliesRoute(request, env);
  }

  if (url.pathname.startsWith("/ingredients/")) {
    return handleIngredientsRoute(request, env);
  }

  if (url.pathname.startsWith("/recipes/")) {
    return handleRecipesRoute(request, env);
  }

  if (url.pathname.startsWith("/recipe-records/")) {
    return handleRecipeRecordsRoute(request, env);
  }

  if (url.pathname.startsWith("/recommendations/")) {
    return handleRecommendationsRoute(request, env);
  }

  throw new HttpError(404, "NOT_FOUND", "接口不存在");
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await dispatch(request, env);
    } catch (error) {
      if (isHttpError(error)) {
        return jsonError(request, env, error.status, error.code, error.message);
      }

      console.error(error);
      return jsonError(request, env, 500, "INTERNAL_ERROR", "服务暂时不可用");
    }
  },
} satisfies ExportedHandler<Env>;
