# Habit Planner RPG v4

Stable responsive build focused on avoiding blank-screen failures and improving scaling.

What changed from the previous package:
- Removed dnd-kit, Framer Motion, Zustand, and icon-package runtime dependencies.
- Replaced them with a custom pointer drag layer built with React and DOM hit testing.
- Kept mobile + desktop drag/drop, day-first calendar, optional time lens, autosave, import, export, seal, SOS, tokens, recovery, and equilibrium rules.
- Added an Error Boundary so runtime failures show a recoverable screen instead of a blank page.
- Rebuilt scaling with fluid CSS, wider desktop activation, internal scrolling, and readable column minimums.

Run:

```bash
npm install
npm run dev
```

Storage key: `habit-planner-rpg-v4`
Export schema: `4`
