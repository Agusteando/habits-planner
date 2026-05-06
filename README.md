# Habit Planner RPG v5

This pass focuses on the core UX problem: the main planning surface now opens as an empty canvas and scales without squeezing the calendar blocks.

Key changes:

- The app opens on Plan, not Today.
- No scheduled blocks are seeded by default. The user starts from an empty week.
- A visible `Use starter week` button exists for users who want a populated demo plan.
- Desktop planning uses an adaptive wrapping calendar canvas instead of forcing seven narrow columns at standard resolutions.
- Wide screens can still show seven days when there is enough width.
- Block controls in the calendar use readable text buttons: `Tier`, `Done`, `Skip`, and `Remove`.
- Action Bank is explicitly labeled and explains the first action: drag one block into a day.
- Empty days explain where to drop actions.
- The storage key is `habit-planner-rpg-v5`, so older seeded local state is not automatically loaded.
- Import/export remains real JSON behavior.

Run:

```bash
npm install
npm run dev
```

Production build was verified with:

```bash
npm run build
```
