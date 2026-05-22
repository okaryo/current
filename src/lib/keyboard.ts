export type SectionId = "pomodoro" | "todo" | "log";

export type TodoCommand =
  | "focusPreferred"
  | "moveDown"
  | "moveUp"
  | "toggleComplete"
  | "edit"
  | "toggleNow"
  | "addTodo"
  | "addSubtask"
  | "expandSubtasks"
  | "collapseSubtasks"
  | "delete"
  | "clearSelection";

export type PomodoroCommand = "toggle" | "reset" | "startFocus";
export type WorkLogCommand = "focusPreferred" | "editLatest";

export type KeyboardShortcutEvent = {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

const sectionIds: SectionId[] = ["pomodoro", "todo", "log"];

export function sectionFromShortcut(
  event: KeyboardShortcutEvent,
  activeSection: SectionId,
): SectionId | null {
  if (!event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }

  if (event.shiftKey) {
    return adjacentSectionFromShortcut(event, activeSection);
  }

  switch (event.key) {
    case "1":
      return "pomodoro";
    case "2":
      return "todo";
    case "3":
      return "log";
    default:
      return null;
  }
}

export function adjacentSectionFromShortcut(
  event: Pick<KeyboardShortcutEvent, "code">,
  activeSection: SectionId,
): SectionId | null {
  switch (event.code) {
    case "BracketLeft":
      return adjacentSection(activeSection, -1);
    case "BracketRight":
      return adjacentSection(activeSection, 1);
    default:
      return null;
  }
}

export function adjacentSection(
  activeSection: SectionId,
  offset: number,
): SectionId {
  const activeIndex = sectionIds.indexOf(activeSection);
  const nextIndex =
    (activeIndex + offset + sectionIds.length) % sectionIds.length;

  return sectionIds[nextIndex];
}

export function globalEntryShortcutRequested(event: KeyboardShortcutEvent) {
  return event.key === "i" && isPlainKey(event);
}

export function settingsShortcutRequested(event: KeyboardShortcutEvent) {
  return event.key === "," && event.metaKey && !event.ctrlKey && !event.altKey;
}

export function updateShortcutRequested(event: KeyboardShortcutEvent) {
  return event.key === "u" && isPlainKey(event);
}

export function keyboardShortcutsRequested(event: KeyboardShortcutEvent) {
  return (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.shiftKey &&
    (event.key === "?" || (event.key === "/" && event.code === "Slash"))
  );
}

export function pomodoroGlobalCommandFromKeydown(
  event: KeyboardShortcutEvent,
): PomodoroCommand | null {
  if (!event.metaKey || !event.shiftKey || event.ctrlKey || event.altKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "p":
      return "toggle";
    case "r":
      return "reset";
    default:
      return null;
  }
}

export function workLogCommandFromKeydown(
  event: KeyboardShortcutEvent,
): WorkLogCommand | null {
  switch (event.key) {
    case "e":
      return isPlainKey(event) ? "editLatest" : null;
    default:
      return null;
  }
}

export function todoCommandFromKeydown(
  event: KeyboardShortcutEvent,
): TodoCommand | null {
  switch (event.key) {
    case "D":
      return event.shiftKey ? "delete" : null;
    case "j":
    case "ArrowDown":
      return "moveDown";
    case "k":
    case "ArrowUp":
      return "moveUp";
    case "ArrowRight":
      return isPlainKey(event) ? "expandSubtasks" : null;
    case "ArrowLeft":
      return isPlainKey(event) ? "collapseSubtasks" : null;
    case " ":
      return "toggleComplete";
    case "e":
      return "edit";
    case "a":
      return isPlainKey(event) ? "addTodo" : null;
    case "t":
      return isPlainKey(event) ? "addSubtask" : null;
    case "Enter":
      return isPlainKey(event) ? "toggleNow" : null;
    case "Escape":
      return "clearSelection";
    default:
      return null;
  }
}

function isPlainKey(event: KeyboardShortcutEvent) {
  return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}
