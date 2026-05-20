import { describe, expect, it } from "vitest";
import { linkifyWorkLogBody } from "$lib/work-log/linkify";

describe("linkifyWorkLogBody", () => {
  it("returns plain text when there is no URL", () => {
    expect(linkifyWorkLogBody("wrote a note")).toEqual([
      {
        kind: "text",
        value: "wrote a note",
      },
    ]);
  });

  it("turns http and https URLs into URL parts", () => {
    expect(
      linkifyWorkLogBody("Read https://example.com and http://localhost:5173."),
    ).toEqual([
      {
        kind: "text",
        value: "Read ",
      },
      {
        kind: "url",
        value: "https://example.com",
      },
      {
        kind: "text",
        value: " and ",
      },
      {
        kind: "url",
        value: "http://localhost:5173",
      },
      {
        kind: "text",
        value: ".",
      },
    ]);
  });

  it("keeps trailing punctuation outside of the URL", () => {
    expect(linkifyWorkLogBody("(https://example.com/path), done")).toEqual([
      {
        kind: "text",
        value: "(",
      },
      {
        kind: "url",
        value: "https://example.com/path",
      },
      {
        kind: "text",
        value: "), done",
      },
    ]);
  });

  it("does not linkify non-http schemes", () => {
    expect(
      linkifyWorkLogBody("Open file:///tmp/a or mailto:test@example.com"),
    ).toEqual([
      {
        kind: "text",
        value: "Open file:///tmp/a or mailto:test@example.com",
      },
    ]);
  });
});
