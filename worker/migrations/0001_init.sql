CREATE TABLE families (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  quantity REAL,
  unit TEXT,
  expire_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_ingredients_family ON ingredients(family_id);
CREATE UNIQUE INDEX idx_ingredients_active_family_name
  ON ingredients(family_id, normalized_name)
  WHERE deleted_at IS NULL;

CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  family_id TEXT,
  parent_recipe_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'custom',
  summary TEXT,
  cover_image_url TEXT,
  steps_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_active_updated
  ON recipes(updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_parent_active
  ON recipes(family_id, parent_recipe_id)
  WHERE deleted_at IS NULL AND parent_recipe_id IS NOT NULL;
CREATE UNIQUE INDEX idx_recipes_active_family_name
  ON recipes(family_id, normalized_name)
  WHERE family_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_recipes_active_family_parent
  ON recipes(family_id, parent_recipe_id)
  WHERE family_id IS NOT NULL
    AND parent_recipe_id IS NOT NULL
    AND deleted_at IS NULL;

CREATE TABLE recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  amount TEXT
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

CREATE TABLE recipe_records (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  recipe_id TEXT,
  dish_name TEXT NOT NULL,
  record_type TEXT NOT NULL,
  planned_date TEXT,
  cooked_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_recipe_records_family ON recipe_records(family_id);
