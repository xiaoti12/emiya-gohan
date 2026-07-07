import { HttpError } from "../utils/httpError";

export function recipeServiceNotImplemented() {
  throw new HttpError(501, "NOT_IMPLEMENTED", "菜谱 API 将在 Phase 3 接入");
}
