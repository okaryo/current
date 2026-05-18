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
- Work Log is the primary surface for working memory, context retention, task recovery, light metacognition, focus support, and progress visibility.
- Todo is a supporting surface for declaring the current intention and lightly guiding direction.
- Pomodoro is a supporting surface for maintaining rhythm.
- The app window opens at its minimum size, `860px` wide and `630px` tall.
- Work Log spans the right side as the primary surface.
- Pomodoro and TODO stack on the left as supporting surfaces.
- Narrow stacked layout is not supported; keep the workspace row-based.
- Use a shared Todo / Work Log quick input at the bottom center of the main window, so section space stays focused on display and navigation.
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
- [x] Add shortcut for creating TODO through the shared quick input
- [x] Add shortcut for toggling completion
- [x] Add shortcut for deleting TODO
- [x] Add shortcut for moving selection
- [x] Add shared quick input focus behavior for new TODOs
- [x] Add shortcut for adding a root TODO inline from the TODO section
- [x] Add shortcut for indenting TODOs
- [x] Add shortcut for outdenting TODOs
- [x] Add shortcut for adding a subtask to the selected TODO

Keyboard decisions:

- TODO list-operation shortcuts are scoped to the active TODO section.
- Keyboard key labels use uppercase letters; shortcuts that require uppercase letters use `Shift+Letter` notation.
- `i`: focus the shared Todo / Work Log quick input from anywhere in the main app when a text input is not already focused.
- `j` / `k` and `ArrowDown` / `ArrowUp`: move selection
- `Tab`: indent the selected TODO
- `Shift+Tab`: outdent the selected TODO
- `Space`: toggle completion for the selected TODO
- `a`: add a root TODO inline at the top of the TODO list
- `e`: edit the selected TODO
- `Enter`: set/unset the selected TODO as Now
- `t`: add a subtask to the selected TODO when it is a root task
- `Shift+D`: delete the selected TODO immediately
- `Escape`: cancel edit or clear selection
- Delete intentionally does not use plain `d`.
- Delete does not have undo for now.
- Creating a TODO keeps focus on the shared quick input and does not select the created TODO.
- `Tab` switches the shared quick input between Todo and Log modes.
- `Cmd+Enter` submits both Todo and Log entries from the shared quick input.
- Todo mode prevents plain `Enter` from creating a newline; pasted multiline Todo text is normalized into a single-line title.
- Pressing `Esc` from the shared quick input restores focus to the section that was active before input started.
- When a TODO item is selected, the TODO header hint shows section-level movement and focus shortcuts only; Arrow movement remains supported but is not shown because it is conventional.
- Item-specific shortcuts stay in the TODO list shell footer while a TODO item is selected, wrap when narrow, remain visible while the list scrolls, and are removed from layout while the selected TODO is being edited.
- Focused text inputs should avoid native blue outlines and use caret/container border emphasis instead.

### Nested TODO

- [x] Support nested TODO items
- [x] Persist TODO parent-child relationships
- [x] Preserve TODO order within each level
- [x] Define completion behavior for parent and child TODOs

Nested TODO decisions:

- `Tab`: indent the selected TODO under the previous TODO when possible.
- `Shift+Tab`: outdent the selected TODO when possible.
- `t`: opens an inline subtask input at the end of the selected root TODO's children; when a subtask is selected, it adds a sibling under the same parent.
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

- [x] Add keyboard shortcut for focusing the shared Todo / Work Log quick input
- [x] Add quick log submission flow

Work Log decisions:

- Work Log list shortcuts are scoped to the active Log section.
- `i`: focus the shared Todo / Work Log quick input from anywhere in the main app when a text input is not already focused.
- The shared quick input defaults to Log mode, is compact and semi-transparent when unfocused, and expands while focused.
- In Log mode, plain `Enter` inserts a newline with Markdown continuation support.
- In Log mode, `Cmd+Enter` submits the current work log.
- Work logs are persisted to SQLite with creation timestamps.
- Work logs display the latest seven local calendar days, grouped by day.
- Work logs are displayed newest first within each day.
- `Enter` continues `-`, `*`, `+`, numbered lists, and checkbox list markers.
- Checked checkbox markers continue as unchecked markers.
- Empty list marker lines exit the list and keep only indentation.
- Markdown helper behavior is deferred until the basic logging flow feels right.
- Keep logging flow lightweight: avoid extra confirmations, categories, tags, and other metadata-heavy interactions.
- Creating a work log emits a Tauri `work-log:created` event so the main window can refresh when Quick Entry writes to SQLite.
- Creating a TODO emits a Tauri `todo:created` event so the main window can refresh when the shared quick input writes to SQLite.

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

## Phase 6 — Log Rhythm Cues

### Retired Check-in Timer

- [x] Create rhythm reminder timer
- [x] Add periodic reminder notifications
- [x] Remove check-in timer

### Log Header UI

- [x] Remove subtle reminder status
- [x] Remove "Next check-in" indicator
- [x] Remove ON/OFF toggle
- [x] Replace check-in status with last log elapsed time in the Log header

Log rhythm decisions:

- Check-in timer and periodic reminder notifications were removed.
- The Log section header displays the elapsed time since the latest log, such as `Last log: 18m ago`.
- The Last log badge keeps its normal background for 0-15 minutes, shifts to subtle yellow after 15 minutes, stronger yellow after 30 minutes, and subtle red after 60 minutes.
- Pomodoro completion notifications lightly prompt the user to write a log and tidy Todo.

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
- `Cmd+Shift+[`: activate the previous section, wrapping from Pomodoro to Log.
- `Cmd+Shift+]`: activate the next section, wrapping from Log to Pomodoro.
- Log is the initial active section for now.
- `Cmd+2` keeps the current TODO selection when possible; otherwise it selects Now, then the first TODO, then focuses the TODO list.
- `Cmd+3` focuses the Work Log list.
- Adjacent section shortcuts are implicit power-user shortcuts and are not shown in section hints for now.
- `i` is an app-wide shortcut for the shared Todo / Work Log quick input.
- Global shortcuts should be limited to app-wide actions such as section switching and shared quick input.
- Section-specific shortcuts should only run inside the active section.

---

## Phase 8 — Persistence

- [x] Persist TODOs locally
- [x] Persist work logs locally

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
- Thin Tauri command wrappers do not need command-level tests when the service or repository layer already covers the behavior.
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
- [x] Extract keyboard shortcut mapping into a testable TypeScript module
- [x] Add Vitest coverage for keyboard shortcut mapping
- [x] Extract TODO UI-domain logic into testable TypeScript modules
- [x] Add Vitest coverage for TODO selection, ordering, and Now task behavior
- [x] Extract Pomodoro state logic into a testable TypeScript module
- [x] Add Vitest coverage for Pomodoro state transitions
- [x] Add Vitest coverage for quick input normalization and notification permission branching where practical
- [x] Verify keyboard-only workflow manually in the development environment
- [ ] Set completion sound when a task is completed
- [ ] Build macOS release
- [x] Create application icon
- [ ] Add updater support to detect available updates
- [ ] Write installation instructions
- [ ] Prepare initial GitHub release

Initial release workflow decisions:

- CI should run frontend formatting, linting, type checking, Vitest, Rust tests, and a production build.
- CI runs on Ubuntu for fast cross-platform checks; the release workflow should use macOS for packaging the desktop app.
- Release workflow should be triggered by pushing `v*` tags.
- Initial release workflow builds macOS app artifacts and creates a draft GitHub Release.
- Initial release is macOS-only.
- Linux and Windows release builds are deferred until after the initial release.
- Distribution should support installing/downloading the app outside the repository.
- Homebrew distribution is deferred until after the initial release.

Initial release testing decisions:

- Phase 11 testing should prioritize Vitest and Rust unit tests; Playwright should be added only for a small keyboard workflow smoke test if it stays low-cost.
- OS-dependent behavior such as notification display, global shortcuts, Quick Entry focus restoration, packaged app behavior, and release artifact installation can be verified manually.

---

## Post Initial Release

### Bug Fixes

- [ ] Fix the known multi-display Quick Entry issue where opening from the global hotkey can show the window on the wrong display or leave focus on another window, especially when the cursor is on a different display than the main Current window.

### Distribution

- [ ] Add Linux and Windows release builds
- [ ] Add Homebrew installation support

### Pomodoro Settings

- [ ] Display Pomodoro remaining time in the system menu bar
- [ ] Configure focus duration between 10 and 60 minutes
- [ ] Configure break duration
- [ ] Add optional automatic transition from break back to focus
- [ ] Persist timer settings locally

### Pomodoro Sound

- [ ] Add optional white noise while the timer is running

### Keyboard Workflow

- [ ] Add keyboard shortcut for focusing timer section
- [x] Add global hotkey for showing a Quick Entry window

### Work Log

- [ ] Amend the most recent work log
- [ ] Add timeline view for browsing past logs
- [ ] Support keyboard navigation in the log timeline
- [ ] Support browsing logs across days

Work Log post-release decisions:

- Editing work logs should stay lightweight.
- A likely amend flow is: bring the latest log back into the input, edit it, then submit to update it.
- The shortcut for amending the latest log is undecided.
- The global hotkey is a post-initial-release feature and should show a dedicated Quick Entry window, not just bring the main application window to the front.
- First, prototype the Quick Entry window with Tauri's standard multi-window APIs and verify whether the interaction feels right.
- The current Tauri-only Quick Entry window appears to satisfy the intended quick entry workflow, so keep this approach.
- Quick Entry supports adding either Todo or Log entries.
- `Cmd+Shift+L` toggles the Quick Entry window through Tauri's global shortcut plugin.
- Quick Entry closes when it loses focus, including when the user clicks the main Current window or another app.
- When Quick Entry closes through save, `Esc`, or hotkey toggle, macOS restores focus to the app that was frontmost before Quick Entry opened.
- When Quick Entry closes because the user clicked outside it, focus restoration is skipped so the clicked app keeps focus.
- Rounded native-looking Quick Entry window corners are deferred; Tauri transparent window styling did not produce the desired result.
- A macOS-native Quick Entry implementation is not planned for now. Reconsider it only if the Tauri-based window reveals a concrete limitation in normal use.
