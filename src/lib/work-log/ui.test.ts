import { describe, expect, it } from "vitest";
import type { WorkLog } from "$lib/api/workLogs";
import {
  buildRecentWorkLogGroups,
  buildWorkLogSelectableItems,
  moveWorkLogSelection,
  selectWorkLogBoundary,
  workLogSelectionForDate,
} from "$lib/work-log/ui";

function workLog(overrides: Partial<WorkLog> & Pick<WorkLog, "id">): WorkLog {
  return {
    body: "",
    createdAtMs: 0,
    ...overrides,
  };
}

describe("buildRecentWorkLogGroups", () => {
  it("builds one group for each of the latest seven local calendar days", () => {
    const today = new Date(2026, 4, 22, 12).getTime();
    const logs = [
      workLog({
        id: 1,
        body: "today",
        createdAtMs: new Date(2026, 4, 22, 9).getTime(),
      }),
      workLog({
        id: 2,
        body: "four days ago",
        createdAtMs: new Date(2026, 4, 18, 18).getTime(),
      }),
    ];

    const groups = buildRecentWorkLogGroups(logs, today, 7);

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "May 20",
      "May 19",
      "May 18",
      "May 17",
      "May 16",
    ]);
    expect(groups.map((group) => group.logs.map((log) => log.id))).toEqual([
      [1],
      [],
      [],
      [],
      [2],
      [],
      [],
    ]);
  });

  it("does not include logs outside the recent calendar window", () => {
    const today = new Date(2026, 4, 22, 12).getTime();
    const logs = [
      workLog({
        id: 1,
        createdAtMs: new Date(2026, 4, 16, 9).getTime(),
      }),
      workLog({
        id: 2,
        createdAtMs: new Date(2026, 3, 22, 9).getTime(),
      }),
    ];

    const groups = buildRecentWorkLogGroups(logs, today, 7);

    expect(groups.flatMap((group) => group.logs.map((log) => log.id))).toEqual([
      1,
    ]);
  });
});

describe("buildWorkLogSelectableItems", () => {
  it("includes both log rows and empty-day rows in display order", () => {
    const groups = [
      { dateKey: "2026-05-22", label: "Today", logs: [workLog({ id: 1 })] },
      { dateKey: "2026-05-21", label: "Yesterday", logs: [] },
      { dateKey: "2026-05-20", label: "May 20", logs: [workLog({ id: 2 })] },
    ];

    expect(buildWorkLogSelectableItems(groups)).toEqual([
      { kind: "log", id: 1 },
      { kind: "emptyDay", dateKey: "2026-05-21" },
      { kind: "log", id: 2 },
    ]);
  });
});

describe("moveWorkLogSelection", () => {
  const items = [
    { kind: "log", id: 1 },
    { kind: "emptyDay", dateKey: "2026-05-21" },
    { kind: "log", id: 2 },
  ] as const;

  it("selects the first or last item when nothing is selected", () => {
    expect(moveWorkLogSelection([...items], null, 1)).toEqual(items[0]);
    expect(moveWorkLogSelection([...items], null, -1)).toEqual(items[2]);
  });

  it("moves through log and empty-day items within bounds", () => {
    expect(moveWorkLogSelection([...items], items[0], 1)).toEqual(items[1]);
    expect(moveWorkLogSelection([...items], items[1], 1)).toEqual(items[2]);
    expect(moveWorkLogSelection([...items], items[2], 1)).toEqual(items[2]);
    expect(moveWorkLogSelection([...items], items[0], -1)).toEqual(items[0]);
  });

  it("clears selection for an empty list", () => {
    expect(moveWorkLogSelection([], items[0], 1)).toBeNull();
  });
});

describe("selectWorkLogBoundary", () => {
  const items = [
    { kind: "log", id: 1 },
    { kind: "emptyDay", dateKey: "2026-05-21" },
    { kind: "log", id: 2 },
  ] as const;

  it("selects the first or last item", () => {
    expect(selectWorkLogBoundary([...items], "first")).toEqual(items[0]);
    expect(selectWorkLogBoundary([...items], "last")).toEqual(items[2]);
  });

  it("clears selection for an empty list", () => {
    expect(selectWorkLogBoundary([], "first")).toBeNull();
    expect(selectWorkLogBoundary([], "last")).toBeNull();
  });
});

describe("workLogSelectionForDate", () => {
  it("builds an empty-day selection key from a local timestamp", () => {
    expect(workLogSelectionForDate(new Date(2026, 4, 22, 9).getTime())).toEqual(
      {
        kind: "emptyDay",
        dateKey: "2026-05-22",
      },
    );
  });
});
