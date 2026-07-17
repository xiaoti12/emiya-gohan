-- DEPRECATED: 本地 4 道手写验收菜，正式环境请改用 recipes_howtocook.sql。
-- 生成方式见 scripts/import-howtocook.ts。
-- Phase 3 本地验收用公共基础菜。固定 ID + INSERT OR IGNORE，可重复执行。
-- 执行示例：
-- wrangler d1 execute emiya-gohan --local --config worker/wrangler.toml --file=worker/seeds/recipes_local.sql

INSERT OR IGNORE INTO recipes (
  id, family_id, parent_recipe_id,
  name, normalized_name, category, tags, source, summary, cover_image_url, steps_json
) VALUES
(
  'base_recipe_green_pepper_pork',
  NULL,
  NULL,
  '青椒肉丝',
  '青椒肉丝',
  '荤菜',
  '["下饭","快手"]',
  'howtocook',
  '家常下饭荤菜，青椒脆嫩，肉丝滑嫩。',
  NULL,
  '["肉丝加料酒、生抽、淀粉抓匀腌制。","热锅下油，滑炒肉丝至变色盛出。","青椒切丝下锅快炒，倒回肉丝调味出锅。"]'
),
(
  'base_recipe_tomato_egg',
  NULL,
  NULL,
  '番茄炒蛋',
  '番茄炒蛋',
  '素菜',
  '["素菜","快手"]',
  'howtocook',
  '经典家常菜，酸甜开胃。',
  NULL,
  '["鸡蛋打散加少许盐。","番茄切块，热锅炒出汁水。","倒入鸡蛋翻炒，调味出锅。"]'
),
(
  'base_recipe_winter_melon_ribs',
  NULL,
  NULL,
  '冬瓜排骨汤',
  '冬瓜排骨汤',
  '汤',
  '["暖胃","清淡"]',
  'howtocook',
  '清甜暖胃的家常汤。',
  NULL,
  '["排骨焯水去血沫。","加水与姜片炖 30 分钟。","加入冬瓜块再炖至软烂，调味即可。"]'
),
(
  'base_recipe_garlic_cucumber',
  NULL,
  NULL,
  '拍黄瓜',
  '拍黄瓜',
  '其他',
  '["凉菜","快手"]',
  'howtocook',
  '清爽开胃的凉菜。',
  NULL,
  '["黄瓜拍裂切段。","加入蒜末、生抽、醋、香油拌匀。"]'
);

INSERT OR IGNORE INTO recipe_ingredients (id, recipe_id, name, normalized_name, amount) VALUES
('base_ing_gpp_1', 'base_recipe_green_pepper_pork', '猪里脊', '猪里脊', '200g'),
('base_ing_gpp_2', 'base_recipe_green_pepper_pork', '青椒', '青椒', '2 个'),
('base_ing_gpp_3', 'base_recipe_green_pepper_pork', '生抽', '生抽', '1 勺'),
('base_ing_te_1', 'base_recipe_tomato_egg', '番茄', '番茄', '2 个'),
('base_ing_te_2', 'base_recipe_tomato_egg', '鸡蛋', '鸡蛋', '3 个'),
('base_ing_te_3', 'base_recipe_tomato_egg', '盐', '盐', '适量'),
('base_ing_wmr_1', 'base_recipe_winter_melon_ribs', '排骨', '排骨', '300g'),
('base_ing_wmr_2', 'base_recipe_winter_melon_ribs', '冬瓜', '冬瓜', '400g'),
('base_ing_wmr_3', 'base_recipe_winter_melon_ribs', '姜', '姜', '3 片'),
('base_ing_gc_1', 'base_recipe_garlic_cucumber', '黄瓜', '黄瓜', '2 根'),
('base_ing_gc_2', 'base_recipe_garlic_cucumber', '蒜', '蒜', '3 瓣'),
('base_ing_gc_3', 'base_recipe_garlic_cucumber', '香油', '香油', '少许');
