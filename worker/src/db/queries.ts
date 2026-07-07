export const familyQueries = {
  create:
    "INSERT INTO families (id, display_name) VALUES (?, ?) RETURNING id, display_name",
  findById: "SELECT id, display_name FROM families WHERE id = ?",
} as const;
