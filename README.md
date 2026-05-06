# Habit Planner RPG v31

Updates in this pass:

- Tightened the Time view into a calmer calendar surface with dynamic morning/afternoon/both time framing in source.
- Corrected the current-time beam source behavior so the no-target beam extends from the Y-axis into the current day lane instead of overshooting unrelated lanes.
- Added stronger sealed-day and sealed-lane treatments so locked plans read as locked at the column/day level.
- Improved block popover placement fallback in source so anchored controls prefer the right side, then the left side, then a safe mobile-style clamp.
- Added a confirmation gate for the full reset escape hatch while preserving reset-count tracking.
- Added premium polish overrides for cards, time resize handles, beam containment, hover/focus states, scrollbars, and completion effects.
- Patched the prebuilt dist CSS and the critical no-target beam behavior so the included build remains usable without regenerating assets.
- No package-lock.json or node_modules is included.

Additional v31 pass:

- Reworked non-Time/Kanban block density with smaller, readable cards, tighter day columns, lighter drag handles, one-line title/detail treatment, and hidden secondary system/category badges until hover/focus.
- Tightened Today queue rows to match the denser execution surface without changing behavior.
- Patched the prebuilt dist CSS so the included static build reflects the density changes.

Build note: this package requires dependencies from package.json. The local handoff environment did not include node_modules, so a full rebuild could not be completed here.
