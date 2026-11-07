# Task Workspace Density Implementation Plan

**Goal:** Make the task detail page feel like one focused workspace instead of several widely separated cards.

**Architecture:** Keep the existing Vue sections and workflow behavior, but constrain the content width, tighten vertical rhythm, and group permission context with task confirmation. Use the existing semantic CSS tokens and preserve the screenshot's title, workflow, confirmation, AI execution, and single primary action.

**Tech Stack:** Vue 3 SFC, TypeScript, existing component CSS and design tokens.

**Spec:** User-provided task-detail screenshot and request to make the whole page feel more concentrated.

## Global Constraints

- Do not change task workflow, role gates, task data, or action behavior.
- Keep the previously removed legacy Brief/tabs section hidden.
- Keep one primary button for the Brief confirmation state.
- Keep layouts fluid and readable on narrow screens.

## Review Focus

- Long task names, permission copy, and acceptance text must wrap without clipping.
- Three-column workflow remains legible at desktop widths and stacks on narrow screens.
- Confirmation state and task description must remain distinguishable.
- AI execution details keep their two-column desktop and single-column mobile behavior.

## Implementation

- [x] Tighten the workspace width and vertical spacing in `src/styles/task-workspace.css`.
- [x] Group the permission line with the task confirmation card in `src/components/tasks/TaskWorkspace.vue`.
- [x] Keep task execution content and bottom actions aligned to the same content column.
- [x] Run lint, tests, production build, and `git diff --check`.

