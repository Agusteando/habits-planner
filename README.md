# Habit Planner RPG v7

This version focuses on the corrected layout model:

- The Action Bank is a persistent left rail on desktop.
- The week board remains a single horizontal row of seven days.
- The board scrolls horizontally when needed instead of wrapping or squeezing.
- Blocks keep a readable calm default state.
- Block actions are hidden until the user clicks/taps a block or the “Adjust” affordance.
- Actions remain text-based when revealed: Tier, Done, Missed, Remove, Review, Pause rest.
- Empty stored state still starts with a blank week.
- Review and Pause blocks remain first-class planning blocks.
- Import/export and local persistence remain real.

Run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```
