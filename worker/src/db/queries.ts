export const familyQueries = {
  create: `
    INSERT INTO families (id, display_name, normalized_name)
    VALUES (?, ?, ?)
    ON CONFLICT(normalized_name) DO NOTHING
    RETURNING id, display_name
  `,
  findById: "SELECT id, display_name FROM families WHERE id = ?",
  findByNormalizedName:
    "SELECT id, display_name FROM families WHERE normalized_name = ?",
} as const;

const ingredientColumns = `
  id,
  name,
  category,
  quantity,
  unit,
  expire_date,
  note
`;

export const ingredientQueries = {
  list: `
    SELECT ${ingredientColumns}
    FROM ingredients
    WHERE family_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, rowid DESC
  `,
  listByCategory: `
    SELECT ${ingredientColumns}
    FROM ingredients
    WHERE family_id = ? AND category = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, rowid DESC
  `,
  findById: `
    SELECT ${ingredientColumns}
    FROM ingredients
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
  `,
  create: `
    INSERT INTO ingredients (
      id,
      family_id,
      name,
      normalized_name,
      category,
      quantity,
      unit,
      expire_date,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(family_id, normalized_name)
    WHERE deleted_at IS NULL
    DO NOTHING
    RETURNING ${ingredientColumns}
  `,
  update: `
    UPDATE OR IGNORE ingredients
    SET
      name = ?,
      normalized_name = ?,
      category = ?,
      quantity = ?,
      unit = ?,
      expire_date = ?,
      note = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
    RETURNING ${ingredientColumns}
  `,
  remove: `
    UPDATE ingredients
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
    RETURNING id
  `,
} as const;

const recipeColumns = `
  id,
  family_id,
  parent_recipe_id,
  name,
  normalized_name,
  category,
  tags,
  source,
  summary,
  cover_image_url,
  steps_json,
  updated_at
`;

const effectiveRecipesCte = `
  WITH effective_recipes AS (
    SELECT ${recipeColumns}
    FROM recipes
    WHERE family_id = ?
      AND deleted_at IS NULL

    UNION ALL

    SELECT ${recipeColumns}
    FROM recipes base
    WHERE base.family_id IS NULL
      AND base.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM recipes version
        WHERE version.family_id = ?
          AND version.parent_recipe_id = base.id
          AND version.deleted_at IS NULL
      )
  )
`;

const recipeFilterClause = `
  (
    ? IS NULL
    OR instr(r.normalized_name, ?) > 0
    OR EXISTS (
      SELECT 1
      FROM json_each(r.tags) tag
      WHERE instr(lower(replace(CAST(tag.value AS TEXT), ' ', '')), ?) > 0
    )
    OR EXISTS (
      SELECT 1
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = r.id
        AND instr(ri.normalized_name, ?) > 0
    )
  )
  AND (? IS NULL OR lower(replace(r.category, ' ', '')) = ?)
  AND (
    ? IS NULL
    OR EXISTS (
      SELECT 1
      FROM json_each(r.tags) tag
      WHERE lower(replace(CAST(tag.value AS TEXT), ' ', '')) = ?
    )
  )
`;

export const recipeQueries = {
  list: `
    ${effectiveRecipesCte}
    SELECT ${recipeColumns}
    FROM effective_recipes r
    WHERE ${recipeFilterClause}
      AND (
        ? IS NULL
        OR r.updated_at < ?
        OR (r.updated_at = ? AND r.id < ?)
      )
    ORDER BY r.updated_at DESC, r.id DESC
    LIMIT ?
  `,
  findAnchor: `
    ${effectiveRecipesCte}
    SELECT r.updated_at, r.id
    FROM effective_recipes r
    WHERE r.id = ?
      AND ${recipeFilterClause}
  `,
  findFamilyById: `
    SELECT ${recipeColumns}
    FROM recipes
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
  `,
  findBaseById: `
    SELECT ${recipeColumns}
    FROM recipes
    WHERE id = ? AND family_id IS NULL AND deleted_at IS NULL
  `,
  findAnyActiveById: `
    SELECT ${recipeColumns}
    FROM recipes
    WHERE id = ? AND deleted_at IS NULL
  `,
  findFamilyVersionByParent: `
    SELECT ${recipeColumns}
    FROM recipes
    WHERE family_id = ?
      AND parent_recipe_id = ?
      AND deleted_at IS NULL
  `,
  findFamilyNameConflict: `
    SELECT id
    FROM recipes
    WHERE family_id = ?
      AND normalized_name = ?
      AND deleted_at IS NULL
      AND (? IS NULL OR id != ?)
  `,
  create: `
    INSERT INTO recipes (
      id,
      family_id,
      parent_recipe_id,
      name,
      normalized_name,
      category,
      tags,
      source,
      summary,
      cover_image_url,
      steps_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING ${recipeColumns}
  `,
  update: `
    UPDATE recipes
    SET
      name = ?,
      normalized_name = ?,
      category = ?,
      tags = ?,
      summary = ?,
      steps_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
    RETURNING ${recipeColumns}
  `,
  remove: `
    UPDATE recipes
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
    RETURNING id
  `,
  listIngredientsByRecipeIdsPrefix: `
    SELECT id, recipe_id, name, normalized_name, amount
    FROM recipe_ingredients
    WHERE recipe_id IN
  `,
  listIngredientsByRecipeId: `
    SELECT id, recipe_id, name, normalized_name, amount
    FROM recipe_ingredients
    WHERE recipe_id = ?
  `,
  deleteIngredientsByRecipeId: `
    DELETE FROM recipe_ingredients
    WHERE recipe_id = ?
  `,
  createIngredient: `
    INSERT INTO recipe_ingredients (
      id,
      recipe_id,
      name,
      normalized_name,
      amount
    )
    VALUES (?, ?, ?, ?, ?)
  `,
} as const;

const recipeRecordColumns = `
  id,
  family_id,
  recipe_id,
  dish_name,
  record_type,
  planned_date,
  cooked_at,
  note,
  created_at,
  updated_at
`;

export const recipeRecordQueries = {
  listByFamilyAndType: `
    SELECT ${recipeRecordColumns}
    FROM recipe_records
    WHERE family_id = ? AND record_type = ? AND deleted_at IS NULL
    ORDER BY COALESCE(planned_date, '9999-12-31') ASC, created_at ASC, rowid ASC
  `,
  findById: `
    SELECT ${recipeRecordColumns}
    FROM recipe_records
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
  `,
  recipeVisibleToFamily: `
    WITH effective_recipes AS (
      SELECT id FROM recipes WHERE family_id = ? AND deleted_at IS NULL
      UNION ALL
      SELECT base.id
      FROM recipes base
      WHERE base.family_id IS NULL
        AND base.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM recipes version
          WHERE version.family_id = ?
            AND version.parent_recipe_id = base.id
            AND version.deleted_at IS NULL
        )
    )
    SELECT 1 FROM effective_recipes WHERE id = ? LIMIT 1
  `,
  create: `
    INSERT INTO recipe_records (
      id,
      family_id,
      recipe_id,
      dish_name,
      record_type,
      planned_date,
      cooked_at,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING ${recipeRecordColumns}
  `,
  remove: `
    UPDATE recipe_records
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ? AND deleted_at IS NULL
    RETURNING id
  `,
} as const;
