# Habit Planner RPG v6

A full React + TypeScript frontend focused on the corrected core UX:

- Empty week by default when no stored plan exists.
- Horizontal one-row week Kanban as the main planning surface.
- No forced responsive wrapping of the week board.
- Day columns preserve usable width and horizontally scroll when needed.
- Blocks stack vertically inside each day and remain readable with multiple items.
- Calendar block controls use text labels: Tier, Done, Missed, Remove, Review, Pause.
- Completion is exception-based: the app assumes the plan went right unless the user reports otherwise.
- Review blocks are first-class blocks with countdowns. When ready, they unlock a short edit window before resealing.
- Pause blocks are first-class blocks that pause the rest of the day without treating it as failure.
- Import/export are real JSON snapshots.
- Local persistence is isolated under `habit-planner-rpg-v6`.

Run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```
