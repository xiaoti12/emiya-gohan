export function formatFamilyTitle(displayName: string) {
  const name = displayName.trim();
  if (!name) return "今天的饭";
  return `${name}${name.endsWith("家") ? "" : "家"}今天的饭`;
}
