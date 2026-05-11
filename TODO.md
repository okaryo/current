# TODO

## Phase 1 — Project Setup

- [x] Create Tauri + Svelte project
- [x] Setup TypeScript
- [x] Setup linting and formatting
- [ ] Decide project structure
- [ ] Setup state management
- [x] Setup local database or storage layer
- [ ] Setup keyboard shortcut handling
- [x] Setup basic window configuration

---

## Phase 2 — Basic Layout

- [x] Create main application layout
- [x] Create Pomodoro section
- [x] Create TODO section
- [x] Create Work Log section
- [ ] Add resizable section layout if needed
- [ ] Add focus state UI for active section
- [ ] Add keyboard navigation between sections
- [ ] Add basic responsive window behavior

---

## Phase 3 — TODO Features

### Basic TODO

- [x] Create TODO item model
- [x] Create TODO list UI
- [x] Add TODO item
- [x] Edit TODO item
- [ ] Delete TODO item
- [x] Toggle TODO completion
- [x] Persist TODO data locally

### TODO UX

- [x] Support keyboard-first TODO operations
- [x] Add shortcut for creating TODO
- [x] Add shortcut for toggling completion
- [ ] Add shortcut for deleting TODO
- [x] Add shortcut for moving selection
- [ ] Add auto-focus behavior for new TODOs

### Completed TODO Behavior

- [ ] Show completed TODOs for today
- [ ] Hide completed TODOs from previous days
- [ ] Add toggle for hiding completed TODOs
- [ ] Persist completed timestamps

### Now Task

- [x] Add "Set as Now" action
- [x] Highlight current "Now" task
- [ ] Dim other TODO items while "Now" is active
- [x] Clear "Now" when task is completed
- [x] Add shortcut for toggling "Now"

---

## Phase 4 — Work Log Features

### Basic Work Log

- [ ] Create work log model
- [ ] Create work log input UI
- [ ] Save logs locally
- [ ] Display recent logs
- [ ] Add timestamps to logs

### Markdown Support

- [ ] Support multiline logs
- [ ] Support markdown lists
- [ ] Continue list markers on Enter
- [ ] Continue checkbox markers on Enter
- [ ] Preserve indentation on Enter

### Work Log UX

- [ ] Add keyboard shortcut for focusing log input
- [ ] Add quick log submission flow
- [ ] Restore draft input state if needed
- [ ] Keep logging flow lightweight

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

- [ ] Add section switching shortcuts
- [ ] Add global hotkey for showing app
- [ ] Restore previous focus state on reopen

### Keyboard UX

- [ ] Ensure all major actions work without mouse
- [ ] Improve focus visibility
- [ ] Add shortcut hints to focused section
- [ ] Hide detailed shortcut hints for inactive sections

---

## Phase 8 — Persistence

- [ ] Persist TODOs locally
- [ ] Persist work logs locally
- [ ] Persist timer settings locally
- [ ] Persist reminder settings locally
- [ ] Persist window state locally

---

## Phase 9 — UI Polish

- [ ] Improve spacing and typography
- [ ] Improve active/inactive section contrast
- [ ] Add subtle animations
- [ ] Improve dark mode appearance
- [ ] Improve keyboard focus visuals
- [ ] Improve empty states
- [ ] Improve scroll behavior

---

## Phase 10 — Initial Release

- [ ] Test keyboard-only workflow
- [ ] Test local persistence
- [ ] Test notifications
- [ ] Build macOS release
- [ ] Create application icon
- [ ] Write installation instructions
- [ ] Prepare initial GitHub release
