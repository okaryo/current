# TODO

## Phase 1 — Project Setup

- [x] Create Tauri + Svelte project
- [x] Setup TypeScript
- [x] Setup linting and formatting
- [ ] Decide project structure
- [ ] Setup state management
- [x] Setup local database or storage layer
- [x] Setup keyboard shortcut handling
- [x] Setup basic window configuration

---

## Phase 2 — Basic Layout

- [x] Create main application layout
- [x] Create Pomodoro section
- [x] Create TODO section
- [x] Create Work Log section
- [x] Split Pomodoro and Work Log into section components
- [x] Split TODO into a section component
- [x] Create reusable keyboard key component
- [ ] Add resizable section layout if needed
- [x] Add focus state UI for active section
- [x] Add keyboard navigation between sections
- [ ] Add basic responsive window behavior

Layout decisions:

- Keep Pomodoro, TODO, and Work Log visible in the main window when possible.
- Keep TODO and Work Log inputs at the bottom of their sections for a stable, familiar layout, as long as all sections remain visible.
- Long TODO and Work Log content should scroll inside the list area, not push other sections out of view.
- TODO and Work Log list areas should have a comfortable max height and should not keep expanding just because the window is taller.

---

## Phase 3 — TODO Features

### Basic TODO

- [x] Create TODO item model
- [x] Create TODO list UI
- [x] Add TODO item
- [x] Edit TODO item
- [x] Delete TODO item
- [x] Toggle TODO completion
- [x] Persist TODO data locally

### TODO UX

- [x] Support keyboard-first TODO operations
- [x] Add shortcut for creating TODO
- [x] Add shortcut for toggling completion
- [x] Add shortcut for deleting TODO
- [x] Add shortcut for moving selection
- [x] Add add-input focus behavior for new TODOs
- [ ] Add shortcut for indenting TODOs
- [ ] Add shortcut for outdenting TODOs

Keyboard decisions:

- TODO shortcuts are scoped to the active TODO section.
- `i`: focus the add input
- `j` / `k` and `ArrowDown` / `ArrowUp`: move selection
- `Tab`: indent the selected TODO
- `Shift+Tab`: outdent the selected TODO
- `Space`: toggle completion for the selected TODO
- `e`: edit the selected TODO
- `Enter`: set/unset the selected TODO as Now
- `D` (`Shift+d`): delete the selected TODO immediately
- `Escape`: cancel edit or clear selection
- Delete intentionally does not use plain `d`.
- Delete does not have undo for now.
- Focusing the add input clears TODO selection.
- Creating a TODO keeps focus on the add input and does not select the created TODO.
- Focused text inputs should avoid native blue outlines and use caret/container border emphasis instead.

### Nested TODO

- [ ] Support nested TODO items
- [ ] Persist TODO parent-child relationships
- [ ] Preserve TODO order within each level
- [ ] Define completion behavior for parent and child TODOs

Nested TODO decisions:

- `Tab`: indent the selected TODO under the previous TODO when possible.
- `Shift+Tab`: outdent the selected TODO when possible.
- Nested TODOs should stay lightweight and should not turn the app into a project management tool.

### Completed TODO Behavior

- [ ] Show completed TODOs for today
- [ ] Hide completed TODOs from previous days
- [ ] Add toggle for hiding completed TODOs
- [ ] Persist completed timestamps

### Now Task

- [x] Add "Set as Now" action
- [x] Highlight current "Now" task
- [x] Dim other TODO items while "Now" is active
- [x] Clear "Now" when task is completed
- [x] Add shortcut for toggling "Now"
- [ ] Start Pomodoro timer when setting a TODO as Now

Now behavior:

- Now is session-local UI state and is not persisted to SQLite.
- Reopening the app should start with no Now task selected.
- When Now is active, the Now TODO title is emphasized and other incomplete TODO titles are dimmed.
- Setting Now may later become the trigger for starting the Pomodoro timer.

---

## Phase 4 — Work Log Features

### Basic Work Log

- [x] Create work log model
- [x] Create work log input UI
- [x] Save logs locally
- [x] Display recent logs
- [x] Add timestamps to logs

### Markdown Support

- [x] Support multiline logs
- [x] Support markdown lists
- [x] Continue list markers on Enter
- [x] Continue checkbox markers on Enter
- [x] Preserve indentation on Enter

### Work Log UX

- [x] Add keyboard shortcut for focusing log input
- [x] Add quick log submission flow
- [ ] Restore draft input state if needed
- [ ] Keep logging flow lightweight

Work Log decisions:

- Work Log shortcuts are scoped to the active Log section.
- `i`: focus the work log input
- `Enter`: insert a newline with Markdown continuation support
- `Cmd+Enter`: submit the current work log
- Work logs are persisted to SQLite with creation timestamps.
- Work logs are displayed newest first.
- `Enter` continues `-`, `*`, `+`, numbered lists, and checkbox list markers.
- Checked checkbox markers continue as unchecked markers.
- Empty list marker lines exit the list and keep only indentation.
- Markdown helper behavior is deferred until the basic logging flow feels right.

---

## Phase 5 — Pomodoro Timer

### Basic Timer

- [ ] Create Pomodoro timer UI
- [ ] Start timer
- [ ] Pause timer
- [ ] Reset timer
- [ ] Display remaining time
- [ ] Add session end notification

### Timer Settings

- [ ] Configure focus duration
- [ ] Configure break duration
- [ ] Persist timer settings locally

### Keyboard Workflow

- [ ] Add keyboard shortcut for start/pause
- [ ] Add keyboard shortcut for reset
- [ ] Add keyboard shortcut for focusing timer section

---

## Phase 6 — Rhythm Reminder

### Reminder System

- [ ] Create rhythm reminder timer
- [ ] Add periodic reminder notifications
- [ ] Add reminder interval setting
- [ ] Persist reminder settings locally

### Reminder UI

- [ ] Display subtle reminder status
- [ ] Display "Next check-in" indicator
- [ ] Add ON/OFF toggle
- [ ] Add explanation text in settings

---

## Phase 7 — Keyboard-first Workflow

### Global Navigation

- [x] Add section switching shortcuts
- [ ] Add global hotkey for showing app
- [ ] Restore previous focus state on reopen

### Keyboard UX

- [ ] Ensure all major actions work without mouse
- [x] Improve focus visibility
- [x] Add shortcut hints to focused section
- [x] Hide detailed shortcut hints for inactive sections

Section shortcut decisions:

- `Cmd+1`: activate Pomodoro section
- `Cmd+2`: activate TODO section
- `Cmd+3`: activate Log section
- TODO is the initial active section for now.
- `Cmd+2` keeps the current TODO selection when possible; otherwise it selects Now, then the first TODO, then focuses the add input.
- `Cmd+3` focuses the Work Log input.
- Global shortcuts should be limited to app-wide actions such as section switching.
- Section-specific shortcuts should only run inside the active section.
- Reusing keys like `i` across sections is acceptable when the active section gives the key a clear local meaning.

---

## Phase 8 — Persistence

- [ ] Persist TODOs locally
- [x] Persist work logs locally
- [ ] Persist timer settings locally
- [ ] Persist reminder settings locally
- [ ] Persist window state locally

---

## Phase 9 — Testing

- [x] Setup Vitest for frontend unit tests
- [x] Extract Work Log markdown continuation logic into a testable module
- [x] Add Vitest coverage for Work Log markdown continuation behavior
- [x] Add Rust unit tests for domain logic
- [x] Add Rust tests for SQLite migration handling
- [ ] Add Rust command-level tests where logic can be tested without Tauri UI

Testing decisions:

- Domain logic should be covered with focused unit tests when practical.
- Frontend helper logic should be moved out of Svelte components when that makes it easier to test.
- Rust-side persistence and migration behavior should be tested close to the database layer.
- Command-level tests should be added when commands contain logic beyond thin Tauri wrappers.
- UI interaction tests can stay minimal until the keyboard workflow stabilizes.

---

## Phase 10 — UI Polish

- [ ] Improve spacing and typography
- [ ] Improve active/inactive section contrast
- [ ] Add subtle animations
- [ ] Improve dark mode appearance
- [ ] Improve keyboard focus visuals
- [ ] Improve empty states
- [ ] Improve scroll behavior

---

## Phase 11 — Initial Release

- [ ] Test keyboard-only workflow
- [ ] Test local persistence
- [ ] Test notifications
- [ ] Build macOS release
- [ ] Create application icon
- [ ] Write installation instructions
- [ ] Prepare initial GitHub release
