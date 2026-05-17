import { describe, expect, it } from "vitest";
import { normalizeTodoTitle } from "$lib/entry/todo";

describe("normalizeTodoTitle", () => {
  it("trims surrounding whitespace and collapses internal whitespace", () => {
    expect(normalizeTodoTitle("  write   tests\nfor\tCurrent  ")).toBe(
      "write tests for Current",
    );
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeTodoTitle(" \n\t ")).toBe("");
  });
});
