import { describe, expect, it } from "vitest";
import type { WorkLog } from "$lib/api/workLogs";
import { moveWorkLogSelection } from "$lib/work-log/ui";

function workLog(overrides: Partial<WorkLog> & Pick<WorkLog, "id">): WorkLog {
  return {
    body: "",
    createdAtMs: 0,
    ...overrides,
  };
}

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
