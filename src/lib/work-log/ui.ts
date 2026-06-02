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

export type WorkLogSelection =
  | { kind: "log"; id: number }
  | { kind: "emptyDay"; dateKey: string };

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

export function buildWorkLogSelectableItems(
  groups: WorkLogGroup[],
): WorkLogSelection[] {
  return groups.flatMap((group): WorkLogSelection[] => {
    if (group.logs.length === 0) {
      return [{ kind: "emptyDay", dateKey: group.dateKey }];
    }

    return group.logs.map((log) => ({ kind: "log", id: log.id }));
  });
}

export function moveWorkLogSelection(
  items: WorkLogSelection[],
  selectedItem: WorkLogSelection | null,
  direction: 1 | -1,
): WorkLogSelection | null {
  if (items.length === 0) {
    return null;
  }

  const currentIndex = items.findIndex((item) =>
    workLogSelectionsEqual(item, selectedItem),
  );
  const nextIndex =
    currentIndex === -1
      ? direction === 1
        ? 0
        : items.length - 1
      : Math.min(Math.max(currentIndex + direction, 0), items.length - 1);

  return items[nextIndex] ?? null;
}

export function selectWorkLogBoundary(
  items: WorkLogSelection[],
  boundary: "first" | "last",
): WorkLogSelection | null {
  if (items.length === 0) {
    return null;
  }

  return boundary === "first" ? (items[0] ?? null) : (items.at(-1) ?? null);
}

export function workLogSelectionsEqual(
  a: WorkLogSelection | null,
  b: WorkLogSelection | null,
) {
  if (!a || !b || a.kind !== b.kind) {
    return false;
  }

  if (a.kind === "log" && b.kind === "log") {
    return a.id === b.id;
  }

  if (a.kind === "emptyDay" && b.kind === "emptyDay") {
    return a.dateKey === b.dateKey;
  }

  return false;
}

export function workLogSelectionKey(selection: WorkLogSelection) {
  return selection.kind === "log"
    ? `log:${selection.id}`
    : `empty-day:${selection.dateKey}`;
}

export function workLogSelectionForDate(timestampMs: number): WorkLogSelection {
  return {
    kind: "emptyDay",
    dateKey: localDateKey(new Date(timestampMs)),
  };
}

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}
