import type { Env } from "../types";
import { recipeServiceNotImplemented } from "../services/recipeService";

export async function handleRecipesRoute(_request: Request, _env: Env) {
  recipeServiceNotImplemented();
}
