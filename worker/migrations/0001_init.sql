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
  steps_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_recipes_family ON recipes(family_id);

CREATE TABLE recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
