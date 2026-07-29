export type FamilyTitleParts = {
  prefix: string;
  suffix: string;
};

export function formatFamilyTitleParts(displayName: string): FamilyTitleParts {
  const name = displayName.trim();
  if (!name) {
    return { prefix: "", suffix: "今天的饭" };
  }
  return {
    prefix: `${name}${name.endsWith("家") ? "" : "家"}`,
    suffix: "今天的饭",
  };
}

export function formatFamilyTitle(displayName: string) {
  const { prefix, suffix } = formatFamilyTitleParts(displayName);
  return `${prefix}${suffix}`;
}
