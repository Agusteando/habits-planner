# Habit Planner RPG v11

Complete single-file React implementation focused on the requested UX:

- Per-day sealing. Each day can be sealed independently; sealed days reject edits unless a Review window is open.
- Week navigation with real calendar dates.
- Current day is highlighted. Past days are grayed out and can be hidden for the current week.
- Day columns scroll vertically when many blocks are stacked.
- The board stays a horizontal one-row Kanban and scrolls sideways when needed.
- Block cards are larger and wrap text so titles/tier labels are readable.
- Action Bank search, hidden import/export/template options, and real custom action creation.
- Plan import/export hidden under a compact top menu.
- Full wipe resets XP/levels/plan/seals and increments reset count.
- Review blocks and Review Gate are real timed edit flows.
- Pause blocks pause the rest of a day.

Run:

```bash
npm install
npm run dev
```

Storage key: `habit-planner-rpg-v11`
