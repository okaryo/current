# Current

Current is a simple desktop app designed to help you stay focused on the task at hand.

It combines:

- Work Log as a lightweight working memory
- Todo as a current intention and direction cue
- Pomodoro timer for rhythm support
- Keyboard-first workflow

Current is designed to reduce friction between thinking and doing.

## Philosophy

Current is designed to help you:

- focus on the current task
- keep track of working context
- return to interrupted work
- maintain a working rhythm

Current focuses on the present, not optimization.

## Main Features

- Work Log for context, notes, and progress
- Lightweight Todo for current intention
- Pomodoro timer
- Keyboard-first workflow
- Local data storage

## Installation

Current is currently distributed for macOS only.

1. Open the [latest release on GitHub](https://github.com/okaryo/current/releases/latest).
2. Download the DMG for your Mac:
   - Apple Silicon: the file ending in `_aarch64.dmg`
   - Intel: the file ending in `_x64.dmg`
3. Open the downloaded DMG and move Current to your Applications folder.
4. Start Current from Applications.

Current is not notarized with Apple Developer ID. If macOS says Current is damaged and
can't be opened, run the following command after moving Current to Applications:

```sh
xattr -cr /Applications/Current.app
```

Then open Current again. This removes the quarantine attributes that macOS applies to
downloaded apps.

The `app.tar.gz`, `.sig`, and `latest.json` assets are used by the in-app updater and
are not needed for manual installation.

## What Current Is NOT

Current is not:

- a team collaboration tool
- a cloud-sync platform
- a project management system
- a knowledge management tool
- a detailed analytics dashboard
- a social productivity app

Current focuses on the present, not optimization.
