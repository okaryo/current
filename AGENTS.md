# AGENTS.md

## Overview

Current is a desktop app designed to help users focus on the current task and maintain a working rhythm.

This project values:

- simplicity
- low friction
- keyboard-first workflow
- lightweight interactions
- local-first design

Current is not designed to maximize productivity or provide detailed analytics.

Before implementing new features, always consider whether the feature supports the core philosophy of the app.

## Development Workflow

Please follow the tasks defined in `TODO.md`.

Before starting a new task:

1. Explain what will be implemented
2. Explain the technical approach
3. Explain possible alternatives if needed
4. Confirm the direction before making large changes

Do not implement multiple large features at once without confirmation.

Keep tasks small and incremental.

## Important Design Principles

### 1. Keep interactions lightweight

Current should feel fast and frictionless.

Avoid requiring users to:

- organize too much information
- configure complex settings
- manage detailed metadata
- maintain complicated workflows

### 2. Keyboard-first workflow

Most interactions should be possible without using a mouse.

Keyboard shortcuts and focus management are important parts of the experience.

### 3. Avoid optimization-focused features

Do not add features focused on:

- productivity scores
- efficiency rankings
- detailed analytics
- competitive gamification
- excessive statistics

Current focuses on the present, not optimization.

### 4. Avoid turning Current into a management tool

Current is not:

- a project management system
- a knowledge management tool
- a team collaboration platform

Avoid adding features such as:

- kanban boards
- complex tagging systems
- deep project hierarchies
- wiki-style organization
- cloud collaboration features

### 5. Favor simple UI and behavior

Prefer:

- subtle UI
- lightweight feedback
- simple interactions
- automatic behavior

Avoid adding unnecessary confirmations or modal-heavy flows.

## TODO Implementation Notes

When implementing tasks from `TODO.md`:

- complete tasks incrementally
- keep commits and changes small
- update TODO status clearly
- explain tradeoffs when changing the original plan

If implementation reveals a better approach than the original TODO:

- stop and explain the reasoning first
- confirm the new direction before proceeding

## Code Style

- Prefer readable and simple code
- Avoid premature abstraction
- Avoid overengineering
- Keep components small and focused
- Prefer explicit behavior over magic

## UI Philosophy

Current should feel calm and focused.

The UI should support:

- focusing on the current task
- maintaining rhythm
- quickly returning attention to work

The UI should not feel:

- noisy
- overly gamified
- data-heavy
- management-oriented

## AI Assistance Guidelines

When working with AI:

- explain reasoning clearly
- propose small incremental steps
- avoid making large assumptions
- prefer discussion before architectural changes

The project direction may evolve during development.

Do not assume that earlier decisions are always final.
