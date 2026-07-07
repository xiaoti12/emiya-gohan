import type { Ingredient } from "./types";

export const ingredientCategoryLabels = {
  vegetable: "蔬菜",
  meat: "肉类",
  other: "其他",
} as const;

export const ingredientCategories = ["全部", "蔬菜", "肉类", "其他"];

export const mockIngredients: Ingredient[] = [
  { id: "ing-tomato", name: "番茄", category: "vegetable", quantity: 3, unit: "个" },
  { id: "ing-green-pepper", name: "青椒", category: "vegetable", quantity: 4, unit: "根" },
  { id: "ing-lettuce", name: "油麦菜", category: "vegetable", quantity: 1, unit: "把" },
  { id: "ing-winter-melon", name: "冬瓜", category: "vegetable", quantity: 1, unit: "块" },
  { id: "ing-potato", name: "土豆", category: "vegetable", quantity: 2, unit: "个" },
  { id: "ing-cabbage", name: "包菜", category: "vegetable", quantity: 1, unit: "颗" },
  { id: "ing-pork", name: "里脊肉", category: "meat", quantity: 200, unit: "g" },
  { id: "ing-ribs", name: "排骨", category: "meat", quantity: 1, unit: "斤" },
  { id: "ing-wing", name: "鸡翅", category: "meat", quantity: 6, unit: "只" },
  { id: "ing-pork-belly", name: "五花肉", category: "meat", quantity: 300, unit: "g" },
  { id: "ing-egg", name: "鸡蛋", category: "other", quantity: 8, unit: "个" },
  { id: "ing-tofu", name: "豆腐", category: "other", quantity: 1, unit: "盒" },
];
