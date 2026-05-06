# Habit Planner RPG v12

Updates in this pass:

- Action Bank items can now be removed without breaking existing planned blocks.
- Removal is non-destructive: actions disappear from the Action Bank, while blocks already placed on the board still render and work.
- Action Bank Options includes Manage, Export, Import, Template, and Restore removed actions when applicable.
- The top More menu now renders above the planner instead of behind the board.
- Dark/light theme switching is available from More and persists with the plan.
- Existing import/export/template behavior is preserved.
- package-lock.json is intentionally excluded.

Run:

```bash
npm install
npm run dev
```

Storage migrates from `habit-planner-rpg-v11` when available and persists to:

```txt
habit-planner-rpg-v12
```
