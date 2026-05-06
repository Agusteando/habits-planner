
# Habit Planner RPG v16

Updates in this pass:

- Reworked the Time view into a focused single-day timeline so a full day fits cleanly in the main panel.
- Added a true Y-axis time layout with compressed time bands.
- Added a live current-time beam for the selected day when that day is today.
- When the beam crosses a task row, the row lights up and task cards receive an energized laser-cut effect with particles.
- Time rows use horizontal card lanes so the day still fits on screen even with multiple tasks in the same band.
- The default Kanban remains the main block-first planning view.
- Morning / Afternoon / Both filters remain available in the Time lens.
- Dragging into a time row assigns that time band.
- No package-lock.json is included.

Run:

```bash
npm install
npm run dev
```

Storage migrates from v15/v14/v13/v12/v11 when available and persists to:

```txt
habit-planner-rpg-v16
```
