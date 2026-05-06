# Habit Planner RPG v14

Updates in this pass:

- Full reset is now a prominent Vault action.
- Full reset resets level, XP, tokens, streak, completion/missed/paused state, and all seals.
- Full reset increments reset count and keeps the plan structure plus Action Bank.
- Review, Pause, and Recovery are protected system blocks.
- System blocks get a distinct visual treatment and cannot be deleted from the board.
- System actions cannot be deleted from the Action Bank.
- Normal unsealing/editing still happens through Review blocks.
- Dark/light theme switching and import/export/template behavior remain.
- package-lock.json is intentionally excluded.

Run:

```bash
npm install
npm run dev
```

Storage migrates from v13/v12/v11 when available and persists to:

```txt
habit-planner-rpg-v14
```
