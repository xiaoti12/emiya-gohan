import { HttpError } from "../utils/httpError";

export function recommendationServiceNotImplemented(): never {
  throw new HttpError(501, "NOT_IMPLEMENTED", "推荐 API 将在 Phase 4 接入");
}
