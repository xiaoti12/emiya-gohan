import type { Env } from "../types";
import { recipeRecordServiceNotImplemented } from "../services/recipeRecordService";

export async function handleRecipeRecordsRoute(
  _request: Request,
  _env: Env,
): Promise<Response> {
  return recipeRecordServiceNotImplemented();
}
