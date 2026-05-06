# Habit Planner RPG v10

This version removes placeholder-like behavior and completes previously incomplete flows.

Completed / removed:

- Removed the hidden downshift state and reducer paths.
- Vault “Reset plan” now resets the in-memory app state immediately and persists the clean state.
- Error recovery clears all known planner storage keys before reloading.
- Plan import catches invalid files and shows a toast instead of failing silently.
- Action Bank import catches invalid files and shows a toast instead of failing silently.
- Action Bank validation checks task IDs, kinds, categories, accents, tokens, and all three tiers.
- Review Gate is now a complete flow:
  - In sealed mode, click Review Gate.
  - The 24-hour countdown appears.
  - When ready, Open Gate unlocks a timed review window.
  - Reseal closes the review window.
- Action Bank export, import, and template download are real JSON flows.
- Empty stored state still starts with a blank week.

Run:

```bash
npm install
npm run dev
```

Storage key:

```txt
habit-planner-rpg-v10
```
