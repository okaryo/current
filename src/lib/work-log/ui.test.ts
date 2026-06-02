import { describe, expect, it } from "vitest";
import type { WorkLog } from "$lib/api/workLogs";
import {
  buildRecentWorkLogGroups,
  moveWorkLogSelection,
  selectWorkLogBoundary,
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

describe("moveWorkLogSelection", () => {
  const logs = [workLog({ id: 1 }), workLog({ id: 2 }), workLog({ id: 3 })];

  it("selects the first or last log when nothing is selected", () => {
    expect(moveWorkLogSelection(logs, null, 1)).toBe(1);
    expect(moveWorkLogSelection(logs, null, -1)).toBe(3);
  });

  it("moves within bounds", () => {
    expect(moveWorkLogSelection(logs, 1, 1)).toBe(2);
    expect(moveWorkLogSelection(logs, 3, 1)).toBe(3);
    expect(moveWorkLogSelection(logs, 1, -1)).toBe(1);
  });

  it("clears selection for an empty list", () => {
    expect(moveWorkLogSelection([], 1, 1)).toBeNull();
  });
});

describe("selectWorkLogBoundary", () => {
  const logs = [workLog({ id: 1 }), workLog({ id: 2 }), workLog({ id: 3 })];

  it("selects the first or last log", () => {
    expect(selectWorkLogBoundary(logs, "first")).toBe(1);
    expect(selectWorkLogBoundary(logs, "last")).toBe(3);
  });

  it("clears selection for an empty list", () => {
    expect(selectWorkLogBoundary([], "first")).toBeNull();
    expect(selectWorkLogBoundary([], "last")).toBeNull();
  });
});
