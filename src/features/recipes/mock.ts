import type { Recipe } from "./types";

/** 仅供首页推荐 mock 使用，不代表真实菜谱库 */
export const mockRecipes: Recipe[] = [
  {
    id: "mock-green-pepper-pork",
    name: "青椒肉丝",
    category: "荤菜",
    tags: ["下饭", "快手"],
    source: "howtocook",
    summary: "家常下饭荤菜，青椒脆嫩，肉丝滑嫩。",
    ingredients: [
      { name: "猪里脊", amount: "200g" },
      { name: "青椒", amount: "2 个" },
    ],
    steps: ["肉丝腌制", "滑炒肉丝", "青椒合炒调味"],
  },
  {
    id: "mock-tomato-egg",
    name: "番茄炒蛋",
    category: "素菜",
    tags: ["素菜", "快手"],
    source: "howtocook",
    summary: "经典家常菜，酸甜开胃。",
    ingredients: [
      { name: "番茄", amount: "2 个" },
      { name: "鸡蛋", amount: "3 个" },
    ],
    steps: ["鸡蛋打散", "番茄炒出汁", "合炒调味"],
  },
  {
    id: "mock-winter-melon-ribs",
    name: "冬瓜排骨汤",
    category: "汤",
    tags: ["暖胃", "清淡"],
    source: "howtocook",
    summary: "清甜暖胃的家常汤。",
    ingredients: [
      { name: "排骨", amount: "300g" },
      { name: "冬瓜", amount: "400g" },
    ],
    steps: ["排骨焯水", "慢炖", "放冬瓜调味"],
  },
  {
    id: "mock-garlic-cucumber",
    name: "拍黄瓜",
    category: "其他",
    tags: ["凉菜", "快手"],
    source: "howtocook",
    summary: "清爽开胃的凉菜。",
    ingredients: [
      { name: "黄瓜", amount: "2 根" },
      { name: "蒜", amount: "3 瓣" },
    ],
    steps: ["黄瓜拍裂", "加调料拌匀"],
  },
  {
    id: "mock-garlic-lettuce",
    name: "蒜蓉油麦菜",
    category: "素菜",
    tags: ["素菜", "快手"],
    source: "custom",
    summary: "八分钟上桌的绿色蔬菜，清爽不腻。",
    ingredients: [
      { name: "油麦菜", amount: "1 把" },
      { name: "蒜", amount: "4 瓣" },
    ],
    steps: ["油麦菜切段", "蒜末爆香", "大火快炒"],
  },
  {
    id: "mock-cabbage",
    name: "手撕包菜",
    category: "素菜",
    tags: ["素菜", "家常"],
    source: "custom",
    summary: "爽脆简单，适合作为晚饭配菜。",
    ingredients: [
      { name: "包菜", amount: "半颗" },
      { name: "干辣椒", amount: "2 根" },
    ],
    steps: ["包菜手撕", "爆香干辣椒", "大火快炒"],
  },
];
