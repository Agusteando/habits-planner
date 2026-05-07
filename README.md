# Habit Planner RPG v32

Updates in this pass:

- Action Bank deletion is now permanent across reloads. Removed non-system seed actions are tracked in `deletedTaskIds`, so they are not silently rehydrated from defaults.
- Action Bank cards now expose a compact hover/focus × delete control directly on each removable card. The old Manage-to-delete flow is removed from the visible UI.
- System actions remain protected and cannot be removed.
- Deleting an action also removes its planned blocks and normalizes the remaining plan order.
- Progression now uses the classic RuneScape-style XP curve through level 99. Level 99 requires 13,034,431 total XP.
- XP gains update level from total XP, cap at level 99, and animate near the completed block with XP float feedback and stronger level-up burst treatment.
- Vault now includes level, total XP, XP-to-next-level, and a progression bar.
- Patched both source and the included prebuilt dist assets.
- No package-lock.json or node_modules is included.

Build note: this package requires dependencies from package.json. The local handoff environment did not include node_modules, so a full Vite rebuild could not be completed here. Source TSX transpilation and prebuilt dist JS syntax checks passed.

Windows run note:

- Use `START_HABIT_PLANNER.cmd` from the extracted folder to run the included `dist` build. This launcher does not use or copy `zipdev.exe`.
- Use `RUN_DEV_WITH_NPM.cmd` only if you want the Vite development server and have Node.js/npm installed.

