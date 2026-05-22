import { describe, expect, it } from "vitest";
import {
  formatFooterDateLabel,
  formatWorkLogDateLabel,
  formatWorkLogTime,
  startOfLocalDay,
} from "$lib/dateFormat";

describe("formatFooterDateLabel", () => {
  it("formats the footer date in English", () => {
    expect(formatFooterDateLabel(new Date(2026, 4, 22))).toBe("Fri, May 22");
  });
});

describe("formatWorkLogDateLabel", () => {
  it("formats today and yesterday labels in English", () => {
    const todayStartMs = startOfLocalDay(new Date(2026, 4, 22).getTime());

    expect(formatWorkLogDateLabel(new Date(2026, 4, 22), todayStartMs)).toBe(
      "Today",
    );
    expect(formatWorkLogDateLabel(new Date(2026, 4, 21), todayStartMs)).toBe(
      "Yesterday",
    );
  });

  it("formats older dates in English without using the system locale", () => {
    const todayStartMs = startOfLocalDay(new Date(2026, 4, 22).getTime());

    expect(formatWorkLogDateLabel(new Date(2026, 4, 20), todayStartMs)).toBe(
      "May 20",
    );
  });

  it("includes the year for dates outside the current local year", () => {
    const todayStartMs = startOfLocalDay(new Date(2026, 0, 2).getTime());

    expect(formatWorkLogDateLabel(new Date(2025, 11, 31), todayStartMs)).toBe(
      "Dec 31, 2025",
    );
  });
});

describe("formatWorkLogTime", () => {
  it("formats log times with app date locale and 24-hour time", () => {
    expect(formatWorkLogTime(new Date(2026, 4, 22, 9, 5).getTime())).toBe(
      "09:05",
    );
  });
});
