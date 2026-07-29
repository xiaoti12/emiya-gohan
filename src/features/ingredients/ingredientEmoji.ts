/**
 * 食材名 → emoji 映射。
 * 单表按优先级从高到低排列：部位/特殊 → 具体蔬果海鲜其他 → 动物/大类兜底。
 * 匹配：normalize(name).includes(keyword)，先命中先用。
 */
const RULES: ReadonlyArray<{ keyword: string; emoji: string }> = [
  // ① 部位 / 特殊（压过动物词）
  { keyword: "鸡腿", emoji: "🍗" },
  { keyword: "鸡翅", emoji: "🍗" },
  { keyword: "鸭腿", emoji: "🍗" },
  { keyword: "排骨", emoji: "🦴" },
  { keyword: "肋骨", emoji: "🦴" },
  { keyword: "五花", emoji: "🥓" },
  { keyword: "腊肉", emoji: "🥓" },
  { keyword: "香肠", emoji: "🌭" },
  { keyword: "里脊", emoji: "🥩" },
  { keyword: "牛腩", emoji: "🥩" },
  { keyword: "牛排", emoji: "🥩" },
  { keyword: "羊排", emoji: "🥩" },
  { keyword: "蹄", emoji: "🍖" },
  { keyword: "虾", emoji: "🦐" },
  { keyword: "鱼", emoji: "🐟" },
  { keyword: "鱿鱼", emoji: "🦑" },
  { keyword: "墨鱼", emoji: "🦑" },
  { keyword: "章鱼", emoji: "🐙" },
  { keyword: "螃蟹", emoji: "🦀" },
  { keyword: "扇贝", emoji: "🦪" },
  { keyword: "生蚝", emoji: "🦪" },
  { keyword: "蛤蜊", emoji: "🦪" },
  { keyword: "花甲", emoji: "🦪" },

  // ② 具体蔬果 / 蛋豆奶 / 菌菇等（含别名；鸡蛋须在「鸡」之前）
  { keyword: "西红柿", emoji: "🍅" },
  { keyword: "番茄", emoji: "🍅" },
  { keyword: "马铃薯", emoji: "🥔" },
  { keyword: "土豆", emoji: "🥔" },
  { keyword: "红薯", emoji: "🍠" },
  { keyword: "地瓜", emoji: "🍠" },
  { keyword: "番薯", emoji: "🍠" },
  { keyword: "胡萝卜", emoji: "🥕" },
  { keyword: "萝卜", emoji: "🥕" },
  { keyword: "柿子椒", emoji: "🫑" },
  { keyword: "甜椒", emoji: "🫑" },
  { keyword: "青椒", emoji: "🫑" },
  { keyword: "小米椒", emoji: "🌶️" },
  { keyword: "朝天椒", emoji: "🌶️" },
  { keyword: "辣椒", emoji: "🌶️" },
  { keyword: "茄子", emoji: "🍆" },
  { keyword: "黄瓜", emoji: "🥒" },
  { keyword: "丝瓜", emoji: "🥒" },
  { keyword: "苦瓜", emoji: "🥒" },
  { keyword: "玉米", emoji: "🌽" },
  { keyword: "白菜", emoji: "🥬" },
  { keyword: "卷心菜", emoji: "🥬" },
  { keyword: "圆白菜", emoji: "🥬" },
  { keyword: "包菜", emoji: "🥬" },
  { keyword: "油麦菜", emoji: "🥬" },
  { keyword: "生菜", emoji: "🥬" },
  { keyword: "菠菜", emoji: "🥬" },
  { keyword: "芹菜", emoji: "🥬" },
  { keyword: "莴笋", emoji: "🥬" },
  { keyword: "芦笋", emoji: "🥬" },
  { keyword: "西兰花", emoji: "🥦" },
  { keyword: "花椰菜", emoji: "🥦" },
  { keyword: "菜花", emoji: "🥦" },
  { keyword: "花菜", emoji: "🥦" },
  { keyword: "冬瓜", emoji: "🍈" },
  { keyword: "南瓜", emoji: "🎃" },
  { keyword: "洋葱", emoji: "🧅" },
  { keyword: "大蒜", emoji: "🧄" },
  { keyword: "蒜蓉", emoji: "🧄" },
  { keyword: "葱", emoji: "🧅" },
  { keyword: "姜", emoji: "🫚" },
  { keyword: "韭菜", emoji: "🌿" },
  { keyword: "香菜", emoji: "🌿" },
  { keyword: "金针菇", emoji: "🍄" },
  { keyword: "杏鲍菇", emoji: "🍄" },
  { keyword: "平菇", emoji: "🍄" },
  { keyword: "香菇", emoji: "🍄" },
  { keyword: "蘑菇", emoji: "🍄" },
  { keyword: "木耳", emoji: "🍄" },
  { keyword: "海带", emoji: "🌿" },
  { keyword: "紫菜", emoji: "🌿" },
  { keyword: "豆芽", emoji: "🌱" },
  { keyword: "四季豆", emoji: "🫛" },
  { keyword: "豆角", emoji: "🫛" },
  { keyword: "毛豆", emoji: "🫛" },
  { keyword: "豌豆", emoji: "🫛" },
  { keyword: "莲藕", emoji: "🪷" },
  { keyword: "山药", emoji: "🥔" },
  { keyword: "芋头", emoji: "🥔" },
  { keyword: "鹌鹑蛋", emoji: "🥚" },
  { keyword: "鸭蛋", emoji: "🥚" },
  { keyword: "鸡蛋", emoji: "🥚" },
  { keyword: "豆腐", emoji: "🧈" },
  { keyword: "豆浆", emoji: "🥛" },
  { keyword: "奶", emoji: "🥛" },
  { keyword: "黄油", emoji: "🧈" },
  { keyword: "奶酪", emoji: "🧀" },
  { keyword: "芝士", emoji: "🧀" },
  { keyword: "花生", emoji: "🥜" },
  { keyword: "核桃", emoji: "🌰" },
  { keyword: "杏仁", emoji: "🌰" },
  { keyword: "米饭", emoji: "🍚" },
  { keyword: "大米", emoji: "🍚" },
  { keyword: "面条", emoji: "🍜" },
  { keyword: "挂面", emoji: "🍜" },
  { keyword: "意面", emoji: "🍝" },
  { keyword: "面粉", emoji: "🌾" },
  { keyword: "面包", emoji: "🍞" },
  { keyword: "蜂蜜", emoji: "🍯" },
  { keyword: "盐", emoji: "🧂" },

  // ③ 动物 / 大类兜底
  { keyword: "鸡", emoji: "🐔" },
  { keyword: "鸭", emoji: "🦆" },
  { keyword: "鹅", emoji: "🦢" },
  { keyword: "猪", emoji: "🐷" },
  { keyword: "牛", emoji: "🐮" },
  { keyword: "羊", emoji: "🐑" },
  { keyword: "鱼", emoji: "🐟" },
  { keyword: "虾", emoji: "🦐" },
  { keyword: "蟹", emoji: "🦀" },
  { keyword: "肉", emoji: "🥩" },
];

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

/** 命中关键词则返回 emoji，否则 null */
export function getIngredientEmoji(name: string): string | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  for (const rule of RULES) {
    if (normalized.includes(rule.keyword.toLowerCase())) {
      return rule.emoji;
    }
  }
  return null;
}

/** 列表圆标文案：emoji 优先，否则首字符 */
export function getIngredientMark(name: string): string {
  const emoji = getIngredientEmoji(name);
  if (emoji) return emoji;

  const trimmed = name.trim();
  return Array.from(trimmed)[0] ?? "?";
}
