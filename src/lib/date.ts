export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function tomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toISODate(date);
}

export function nearestWeekendISO() {
  const date = new Date();
  const day = date.getDay();
  const offset = day === 0 ? 0 : 6 - day;
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export function formatDisplayDate(value?: string) {
  if (!value) return "未设置日期";
  return value.replaceAll("-", "/");
}
