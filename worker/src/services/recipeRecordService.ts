import { HttpError } from "../utils/httpError";

export function recipeRecordServiceNotImplemented(): never {
  throw new HttpError(501, "NOT_IMPLEMENTED", "记录 API 将在 Phase 4 接入");
}
