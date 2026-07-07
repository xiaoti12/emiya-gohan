import type { Env } from "../types";
import { ingredientServiceNotImplemented } from "../services/ingredientService";

export async function handleIngredientsRoute(_request: Request, _env: Env) {
  ingredientServiceNotImplemented();
}
