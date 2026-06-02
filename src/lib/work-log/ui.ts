import type { WorkLog } from "$lib/api/workLogs";
import {
  addLocalDays,
  formatWorkLogDateLabel,
  startOfLocalDay,
} from "$lib/dateFormat";

export type WorkLogGroup = {
  dateKey: string;
  label: string;
  logs: WorkLog[];
};

export function buildRecentWorkLogGroups(
  logs: WorkLog[],
  todayTimestampMs: number,
  dayCount: number,
): WorkLogGroup[] {
  const todayStartMs = startOfLocalDay(todayTimestampMs);
  const groups: WorkLogGroup[] = [];
  const groupByDateKey = new Map<string, WorkLogGroup>();

  for (let dayOffset = 0; dayOffset > -dayCount; dayOffset -= 1) {
    const dayStartMs = addLocalDays(todayStartMs, dayOffset);
    const date = new Date(dayStartMs);
    const group = {
      dateKey: localDateKey(date),
      label: formatWorkLogDateLabel(date, todayStartMs),
      logs: [],
    };

    groups.push(group);
    groupByDateKey.set(group.dateKey, group);
  }

  for (const log of logs) {
    groupByDateKey.get(localDateKey(new Date(log.createdAtMs)))?.logs.push(log);
  }

  return groups;
}

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

export function selectWorkLogBoundary(
  logs: WorkLog[],
  boundary: "first" | "last",
): number | null {
  if (logs.length === 0) {
    return null;
  }

  return boundary === "first"
    ? (logs[0]?.id ?? null)
    : (logs.at(-1)?.id ?? null);
}

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}
