import { todayISO } from "../../lib/date";
import type { RecipeRecord } from "./types";

export const mockRecipeRecords: RecipeRecord[] = [
  {
    id: "record-tomato-egg-plan",
    recipeId: "recipe-tomato-egg",
    dishName: "番茄炒蛋",
    recordType: "planned",
    planDate: todayISO(),
  },
];
