# TODO

## Phase 1 — Project Setup

- [x] Create Tauri + Svelte project
- [x] Setup TypeScript
- [x] Setup linting and formatting
- [x] Decide project structure
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
- [x] Add focus state UI for active section
- [x] Add keyboard navigation between sections
- [x] Add basic responsive window behavior

Layout decisions:

- Keep Pomodoro, TODO, and Work Log visible in the main window when possible.
- The app window opens at its minimum size, `860px` wide and `630px` tall.
- Pomodoro spans the top row and TODO / Work Log share the lower row.
- Narrow stacked layout is not supported; keep the workspace row-based.
- Keep TODO and Work Log inputs near the top of their sections when sections are tall, so input actions stay visually close to the current content.
- Long TODO and Work Log content should scroll inside the list area, not push other sections out of view.
- TODO and Work Log list areas should fit their content when short, and use internal scrolling when content exceeds the available window height.

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
- [x] Add shortcut for indenting TODOs
- [x] Add shortcut for outdenting TODOs

Keyboard decisions:

- TODO shortcuts are scoped to the active TODO section.
- Keyboard key labels use uppercase letters; shortcuts that require uppercase letters use `Shift+Letter` notation.
- `i`: focus the add input
- `j` / `k` and `ArrowDown` / `ArrowUp`: move selection
- `Tab`: indent the selected TODO
- `Shift+Tab`: outdent the selected TODO
- `Space`: toggle completion for the selected TODO
- `e`: edit the selected TODO
- `Enter`: set/unset the selected TODO as Now
- `Shift+D`: delete the selected TODO immediately
- `Escape`: cancel edit or clear selection
- Delete intentionally does not use plain `d`.
- Delete does not have undo for now.
- Focusing the add input clears TODO selection.
- Creating a TODO keeps focus on the add input and does not select the created TODO.
- When the add input is focused, the TODO header hint shows only `Esc`: focus the TODO list; add confirmation stays in the input placeholder.
- Pressing `Esc` from the add input focuses the TODO list and selects the first TODO item when one exists.
- When a TODO item is selected, the TODO header hint shows section-level movement and focus shortcuts only; Arrow movement remains supported but is not shown because it is conventional.
- Item-specific shortcuts stay in the TODO list shell footer while a TODO item is selected, wrap when narrow, remain visible while the list scrolls, and are removed from layout while the add input is focused.
- Focused text inputs should avoid native blue outlines and use caret/container border emphasis instead.

### Nested TODO

- [x] Support nested TODO items
- [x] Persist TODO parent-child relationships
- [x] Preserve TODO order within each level
- [x] Define completion behavior for parent and child TODOs

Nested TODO decisions:

- `Tab`: indent the selected TODO under the previous TODO when possible.
- `Shift+Tab`: outdent the selected TODO when possible.
- Initial release supports one nested level only.
- Parent completion does not change child completion.
- Child completion does not automatically complete the parent.
- A completed parent with incomplete children stays in the incomplete sort group.
- Nested TODOs are always expanded for now.
- Nested TODOs should stay lightweight and should not turn the app into a project management tool.

### Completed TODO Behavior

- [x] Show completed TODOs for today
- [x] Hide completed TODOs from previous days
- [x] Persist completed timestamps

Completed TODO decisions:

- TODO list shows incomplete tasks and tasks completed during the current local day.
- Tasks completed before today are hidden from the normal TODO list.
- When the app stays open across midnight, the TODO list refreshes after the local day changes.
- Completed tasks are not deleted; they remain in SQLite.
- A toggle for showing hidden completed tasks is intentionally not planned.

### Now Task

- [x] Add "Set as Now" action
- [x] Highlight current "Now" task
- [x] Dim other TODO items while "Now" is active
- [x] Clear "Now" when task is completed
- [x] Add shortcut for toggling "Now"
- [x] Start Pomodoro timer when setting a TODO as Now

Now behavior:

- Now is session-local UI state and is not persisted to SQLite.
- Reopening the app should start with no Now task selected.
- When Now is active, the Now TODO title is emphasized and other incomplete TODO titles are dimmed.
- Setting Now resets the Pomodoro timer to `25:00` and starts focus.
- Unsetting Now does not stop the Pomodoro timer.
- Completing the Now task clears Now but does not stop the Pomodoro timer.

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

Work Log decisions:

- Work Log shortcuts are scoped to the active Log section.
- `i`: focus the work log input
- Log input focus shortcut stays in the Work Log list shell footer while the input is not focused, and is removed from layout while the input is focused.
- `Enter`: insert a newline with Markdown continuation support
- `Cmd+Enter`: submit the current work log
- Work logs are persisted to SQLite with creation timestamps.
- Work logs display the latest seven local calendar days, grouped by day.
- Work logs are displayed newest first within each day.
- `Enter` continues `-`, `*`, `+`, numbered lists, and checkbox list markers.
- Checked checkbox markers continue as unchecked markers.
- Empty list marker lines exit the list and keep only indentation.
- Markdown helper behavior is deferred until the basic logging flow feels right.
- Keep logging flow lightweight: avoid extra confirmations, categories, tags, and other metadata-heavy interactions.

---

## Phase 5 — Pomodoro Timer

### Basic Timer

- [x] Create Pomodoro timer UI
- [x] Start timer
- [x] Pause timer
- [x] Reset timer
- [x] Display remaining time
- [x] Add session end notification

Pomodoro decisions:

- Initial timer supports Focus only.
- Focus duration is fixed at 25 minutes for now.
- Timer stops and returns to `25:00` when focus completes.
- Timer sends a system notification when focus completes.
- Reset always stops the timer and returns to `25:00`.
- Session count is not displayed or persisted for now.

### Keyboard Workflow

- [x] Add keyboard shortcut for start/pause
- [x] Add keyboard shortcut for reset

Pomodoro keyboard decisions:

- Pomodoro shortcuts are scoped to the active Pomodoro section.
- `Space`: start/pause
- `r`: reset

---

## Phase 6 — Rhythm Reminder

### Reminder System

- [x] Create rhythm reminder timer
- [x] Add periodic reminder notifications

### Reminder UI

- [x] Display subtle reminder status
- [x] Display "Next check-in" indicator
- [x] Add ON/OFF toggle

Rhythm Reminder decisions:

- Initial reminder interval is fixed at 15 minutes.
- Rhythm Reminder runs only while the Pomodoro timer is running.
- Starting or restarting Pomodoro resets the reminder countdown.
- Pausing, resetting, or completing Pomodoro stops the reminder countdown.
- Reminder ON/OFF is local UI state and is not persisted for now.
- The Log section displays the next check-in status and a subtle progress gauge.
- The ON/OFF toggle is keyboard accessible through normal button focus, but does not have a dedicated shortcut for now.

---

## Phase 7 — Keyboard-first Workflow

### Global Navigation

- [x] Add section switching shortcuts

### Keyboard UX

- [x] Ensure all major actions work without mouse
- [x] Improve focus visibility
- [x] Add shortcut hints to focused section
- [x] Hide detailed shortcut hints for inactive sections

Section shortcut decisions:

- `Cmd+1`: activate Pomodoro section
- `Cmd+2`: activate TODO section
- `Cmd+3`: activate Log section
- Log is the initial active section for now.
- `Cmd+2` keeps the current TODO selection when possible; otherwise it selects Now, then the first TODO, then focuses the add input.
- `Cmd+3` focuses the Work Log input.
- Global shortcuts should be limited to app-wide actions such as section switching.
- Section-specific shortcuts should only run inside the active section.
- Reusing keys like `i` across sections is acceptable when the active section gives the key a clear local meaning.

---

## Phase 8 — Persistence

- [x] Persist TODOs locally
- [x] Persist work logs locally
- [ ] Persist reminder settings locally

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

- [x] Improve spacing and typography
- [x] Improve active/inactive section contrast
- [x] Add subtle animations
- [x] Improve dark mode appearance
- [x] Improve keyboard focus visuals
- [x] Improve empty states
- [x] Improve scroll behavior

---

## Phase 11 — Initial Release

- [x] Add CI workflow
- [x] Add release workflow
- [ ] Test keyboard-only workflow
- [ ] Test local persistence
- [ ] Test notifications
- [ ] Set completion sound when a task is completed
- [ ] Build macOS release
- [ ] Add Linux and Windows release builds
- [x] Create application icon
- [ ] Add updater support to detect available updates
- [ ] Add Homebrew installation support
- [ ] Write installation instructions
- [ ] Prepare initial GitHub release

Initial release workflow decisions:

- CI should run frontend formatting, linting, type checking, Vitest, Rust tests, and a production build.
- CI runs on Ubuntu for fast cross-platform checks; the release workflow should use macOS for packaging the desktop app.
- Release workflow should be triggered by pushing `v*` tags.
- Initial release workflow builds macOS app artifacts and creates a draft GitHub Release.
- Release workflow should eventually build Linux and Windows artifacts too.
- Distribution should support installing/downloading the app outside the repository.
- Homebrew distribution should be supported after the basic GitHub Release flow is working.

---

## Post Initial Release

### Pomodoro Settings

- [ ] Display Pomodoro remaining time in the system menu bar
- [ ] Configure focus duration between 10 and 60 minutes
- [ ] Configure break duration
- [ ] Add optional automatic transition from break back to focus
- [ ] Persist timer settings locally

### Pomodoro Sound

- [ ] Add optional white noise while the timer is running

### Rhythm Reminder Settings

- [ ] Add reminder interval setting
- [ ] Persist reminder settings locally

### Keyboard Workflow

- [ ] Add keyboard shortcut for focusing timer section
- [x] Add global hotkey for showing a Quick Log window

### Work Log

- [ ] Amend the most recent work log
- [ ] Add timeline view for browsing past logs
- [ ] Support keyboard navigation in the log timeline
- [ ] Support browsing logs across days

Work Log post-release decisions:

- Editing work logs should stay lightweight.
- A likely amend flow is: bring the latest log back into the input, edit it, then submit to update it.
- The shortcut for amending the latest log is undecided.
- The global hotkey is a post-initial-release feature and should show a dedicated Quick Log window, not just bring the main application window to the front.
- First, prototype the Quick Log window with Tauri's standard multi-window APIs and verify whether the interaction feels right.
- The current Tauri-only Quick Log window appears to satisfy the intended quick logging workflow, so keep this approach.
- `Cmd+Shift+L` toggles the Quick Log window through Tauri's global shortcut plugin.
- Quick Log closes when it loses focus, including when the user clicks the main Current window or another app.
- Rounded native-looking Quick Log window corners are deferred; Tauri transparent window styling did not produce the desired result.
- A macOS-native Quick Log implementation is not planned for now. Reconsider it only if the Tauri-based window reveals a concrete limitation in normal use.
