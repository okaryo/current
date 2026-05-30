import type { WorkLog } from "$lib/api/workLogs";

export function moveWorkLogSelection(
  logs: WorkLog[],
  selectedWorkLogId: number | null,
  direction: 1 | -1,
) {
  if (logs.length === 0) {
    return null;
  }

  const currentIndex = logs.findIndex((log) => log.id === selectedWorkLogId);
  const nextIndex =
    currentIndex === -1
      ? direction === 1
        ? 0
        : logs.length - 1
      : Math.min(Math.max(currentIndex + direction, 0), logs.length - 1);

  return logs[nextIndex]?.id ?? null;
}
