export const storageKeys = {
  familyId: "kitchen.familyId",
  familyName: "kitchen.familyName",
  aiProvider: "kitchen.ai.provider",
  aiApiKey: "kitchen.ai.apiKey",
  aiModel: "kitchen.ai.model",
  aiBaseUrl: "kitchen.ai.baseUrl",
  aiProfiles: "kitchen.ai.profiles",
  recommendCount: "kitchen.recommendCount",
} as const;

/** 推荐菜品数量范围，与 Worker 服务层校验一致 */
export const RECOMMEND_COUNT_MIN = 1;
export const RECOMMEND_COUNT_MAX = 10;
export const RECOMMEND_COUNT_DEFAULT = 5;

/** 读取持久化的推荐数量；非法或缺失时回退到默认值 */
export function loadRecommendCount(): number {
  const raw = localStorage.getItem(storageKeys.recommendCount);
  if (raw == null) return RECOMMEND_COUNT_DEFAULT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < RECOMMEND_COUNT_MIN || value > RECOMMEND_COUNT_MAX) {
    return RECOMMEND_COUNT_DEFAULT;
  }
  return value;
}

export function saveRecommendCount(value: number): void {
  if (!Number.isInteger(value) || value < RECOMMEND_COUNT_MIN || value > RECOMMEND_COUNT_MAX) {
    return;
  }
  localStorage.setItem(storageKeys.recommendCount, String(value));
}
