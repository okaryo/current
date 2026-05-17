export function normalizeTodoTitle(title: string) {
  return title.replace(/\s+/g, " ").trim();
}
