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
