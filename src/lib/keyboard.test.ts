import { describe, expect, it } from "vitest";
import {
  adjacentSection,
  globalEntryShortcutRequested,
  pomodoroCommandFromKeydown,
  pomodoroGlobalCommandFromKeydown,
  sectionFromShortcut,
  settingsShortcutRequested,
  todoCommandFromKeydown,
  updateShortcutRequested,
  type KeyboardShortcutEvent,
} from "$lib/keyboard";

function key(overrides: Partial<KeyboardShortcutEvent>): KeyboardShortcutEvent {
  return {
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("sectionFromShortcut", () => {
  it.each([
    ["1", "pomodoro"],
    ["2", "todo"],
    ["3", "log"],
  ] as const)(
    "maps Command+%s to the matching section",
    (shortcut, section) => {
      expect(
        sectionFromShortcut(key({ key: shortcut, metaKey: true }), "log"),
      ).toBe(section);
    },
  );

  it("ignores section shortcuts with ctrl or alt modifiers", () => {
    expect(
      sectionFromShortcut(
        key({ key: "1", metaKey: true, ctrlKey: true }),
        "log",
      ),
    ).toBeNull();
    expect(
      sectionFromShortcut(
        key({ key: "1", metaKey: true, altKey: true }),
        "log",
      ),
    ).toBeNull();
  });

  it.each([
    ["pomodoro", "BracketLeft", "log"],
    ["pomodoro", "BracketRight", "todo"],
    ["todo", "BracketLeft", "pomodoro"],
    ["todo", "BracketRight", "log"],
    ["log", "BracketLeft", "todo"],
    ["log", "BracketRight", "pomodoro"],
  ] as const)(
    "maps adjacent shortcut from %s with %s",
    (activeSection, code, expectedSection) => {
      expect(
        sectionFromShortcut(
          key({
            key: code === "BracketLeft" ? "[" : "]",
            code,
            metaKey: true,
            shiftKey: true,
          }),
          activeSection,
        ),
      ).toBe(expectedSection);
    },
  );
});

describe("adjacentSection", () => {
  it("wraps around section order", () => {
    expect(adjacentSection("pomodoro", -1)).toBe("log");
    expect(adjacentSection("log", 1)).toBe("pomodoro");
  });
});

describe("globalEntryShortcutRequested", () => {
  it("accepts plain i only", () => {
    expect(globalEntryShortcutRequested(key({ key: "i" }))).toBe(true);
    expect(globalEntryShortcutRequested(key({ key: "i", metaKey: true }))).toBe(
      false,
    );
  });
});

describe("settingsShortcutRequested", () => {
  it("accepts Command+Comma", () => {
    expect(settingsShortcutRequested(key({ key: ",", metaKey: true }))).toBe(
      true,
    );
  });

  it("ignores Command+Comma with ctrl or alt modifiers", () => {
    expect(
      settingsShortcutRequested(
        key({ key: ",", metaKey: true, ctrlKey: true }),
      ),
    ).toBe(false);
    expect(
      settingsShortcutRequested(key({ key: ",", metaKey: true, altKey: true })),
    ).toBe(false);
  });
});

describe("updateShortcutRequested", () => {
  it("accepts plain u only", () => {
    expect(updateShortcutRequested(key({ key: "u" }))).toBe(true);
    expect(updateShortcutRequested(key({ key: "u", metaKey: true }))).toBe(
      false,
    );
    expect(updateShortcutRequested(key({ key: "U", shiftKey: true }))).toBe(
      false,
    );
  });
});

describe("pomodoroCommandFromKeydown", () => {
  it.each([
    [" ", "toggle"],
    ["r", "reset"],
  ] as const)("maps %s to %s", (shortcut, command) => {
    expect(pomodoroCommandFromKeydown({ key: shortcut })).toBe(command);
  });
});

describe("pomodoroGlobalCommandFromKeydown", () => {
  it.each([
    ["P", "toggle"],
    ["R", "reset"],
  ] as const)("maps Command+Shift+%s to %s", (shortcut, command) => {
    expect(
      pomodoroGlobalCommandFromKeydown(
        key({ key: shortcut, metaKey: true, shiftKey: true }),
      ),
    ).toBe(command);
  });

  it("ignores Pomodoro global shortcuts without Command+Shift", () => {
    expect(pomodoroGlobalCommandFromKeydown(key({ key: "P" }))).toBeNull();
    expect(
      pomodoroGlobalCommandFromKeydown(key({ key: "P", metaKey: true })),
    ).toBeNull();
    expect(
      pomodoroGlobalCommandFromKeydown(
        key({ key: "P", metaKey: true, shiftKey: true, altKey: true }),
      ),
    ).toBeNull();
  });
});

describe("todoCommandFromKeydown", () => {
  it.each([
    [key({ key: "j" }), "moveDown"],
    [key({ key: "ArrowDown" }), "moveDown"],
    [key({ key: "k" }), "moveUp"],
    [key({ key: "ArrowUp" }), "moveUp"],
    [key({ key: "ArrowRight" }), "expandSubtasks"],
    [key({ key: "ArrowLeft" }), "collapseSubtasks"],
    [key({ key: " " }), "toggleComplete"],
    [key({ key: "e" }), "edit"],
    [key({ key: "a" }), "addTodo"],
    [key({ key: "t" }), "addSubtask"],
    [key({ key: "Enter" }), "toggleNow"],
    [key({ key: "?", code: "Slash", shiftKey: true }), "toggleShortcutHelp"],
    [key({ key: "/", code: "Slash", shiftKey: true }), "toggleShortcutHelp"],
    [key({ key: "D", shiftKey: true }), "delete"],
    [key({ key: "Escape" }), "clearSelection"],
  ] as const)("maps TODO shortcuts", (event, command) => {
    expect(todoCommandFromKeydown(event)).toBe(command);
  });

  it("requires plain keys for TODO creation shortcuts", () => {
    expect(todoCommandFromKeydown(key({ key: "a", metaKey: true }))).toBeNull();
    expect(
      todoCommandFromKeydown(key({ key: "t", shiftKey: true })),
    ).toBeNull();
    expect(
      todoCommandFromKeydown(key({ key: "Enter", ctrlKey: true })),
    ).toBeNull();
    expect(todoCommandFromKeydown(key({ key: "D" }))).toBeNull();
    expect(
      todoCommandFromKeydown(key({ key: "ArrowRight", metaKey: true })),
    ).toBeNull();
    expect(
      todoCommandFromKeydown(key({ key: "ArrowLeft", shiftKey: true })),
    ).toBeNull();
    expect(todoCommandFromKeydown(key({ key: "Tab" }))).toBeNull();
    expect(
      todoCommandFromKeydown(key({ key: "Tab", shiftKey: true })),
    ).toBeNull();
    expect(todoCommandFromKeydown(key({ key: "?" }))).toBeNull();
    expect(
      todoCommandFromKeydown(
        key({ key: "?", code: "Slash", shiftKey: true, metaKey: true }),
      ),
    ).toBeNull();
  });
});
