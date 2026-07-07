import type { Env } from "../types";
import { recommendationServiceNotImplemented } from "../services/recommendationService";

export async function handleRecommendationsRoute(_request: Request, _env: Env) {
  recommendationServiceNotImplemented();
}
