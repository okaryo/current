import { describe, expect, it } from "vitest";
import {
  insertMarkdownNewLine,
  markdownContinuationPrefix,
} from "$lib/work-log/markdown";

describe("markdownContinuationPrefix", () => {
  it.each([
    ["- first", "- "],
    ["* first", "* "],
    ["+ first", "+ "],
    ["  - nested", "  - "],
  ])("continues bullet list markers for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it.each([
    ["- ", ""],
    ["  *   ", "  "],
    ["\t+ ", "\t"],
  ])("exits empty bullet list lines for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it.each([
    ["- [ ] task", "- [ ] "],
    ["* [x] done", "* [ ] "],
    ["+ [X] done", "+ [ ] "],
    ["  - [x] nested", "  - [ ] "],
  ])("continues checkbox list markers for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it.each([
    ["- [ ] ", ""],
    ["  * [x]   ", "  "],
  ])("exits empty checkbox list lines for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it.each([
    ["1. first", "2. "],
    ["9) first", "10) "],
    ["  2. nested", "  3. "],
  ])("increments ordered list markers for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it.each([
    ["1. ", ""],
    ["  2)   ", "  "],
  ])("exits empty ordered list lines for %s", (line, expected) => {
    expect(markdownContinuationPrefix(line)).toBe(expected);
  });

  it("preserves indentation for non-list lines", () => {
    expect(markdownContinuationPrefix("  plain text")).toBe("  ");
  });
});

describe("insertMarkdownNewLine", () => {
  it("inserts the continuation at the cursor position", () => {
    const result = insertMarkdownNewLine("- first", 7);

    expect(result).toEqual({
      value: "- first\n- ",
      cursorPosition: 10,
    });
  });

  it("replaces the selected range with the continuation", () => {
    const result = insertMarkdownNewLine("- first selected", 7, 16);

    expect(result).toEqual({
      value: "- first\n- ",
      cursorPosition: 10,
    });
  });

  it("uses the current line when editing multiline text", () => {
    const value = "- first\n  1. nested\nplain";
    const cursorPosition = value.indexOf("nested") + "nested".length;
    const result = insertMarkdownNewLine(value, cursorPosition);

    expect(result).toEqual({
      value: "- first\n  1. nested\n  2. \nplain",
      cursorPosition: 25,
    });
  });
});
