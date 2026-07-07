import { HttpError } from "../utils/httpError";

export function ingredientServiceNotImplemented() {
  throw new HttpError(501, "NOT_IMPLEMENTED", "食材 API 将在 Phase 2 接入");
}
