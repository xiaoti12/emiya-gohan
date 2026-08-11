import useSWR from "swr";
import { listRecipeRecords } from "../features/recipeRecords/api";
import type { RecipeRecord } from "../features/recipeRecords/types";
import { loadStoredFamilyId } from "../features/family/familyStore";

// 只缓存 planned 列表（首页“要做什么”弹层）。
// SWR key 内含 familyId，保证家庭隔离天然生效；缺 familyId 或 enabled=false 时 key=null 不发请求。
// 使用内存级 stale-while-revalidate：有缓存时立即返回旧数据，后台静默重拉。
export function usePlannedRecords(enabled = true) {
  const familyId = loadStoredFamilyId();
  const { data, error, mutate, isValidating } = useSWR<RecipeRecord[]>(
    familyId && enabled
      ? ["recipe-records", "planned", familyId]
      : null,
    () => listRecipeRecords("planned"),
  );

  return {
    records: data,
    error,
    mutate,
    isValidating,
    // 首次无缓存且正在拉取时显 loading；有缓存静默渲染，不显 spinner。
    loading: !data && isValidating,
  };
}