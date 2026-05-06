# Habit Planner RPG v13

Correction in this pass:

- Removed the action-hiding behavior entirely.
- Action Bank Manage now performs destructive deletion.
- Deleting an action removes it from the Action Bank and removes any planned blocks that referenced it.
- There is no Restore removed actions flow because deletion is destructive.
- Existing import/export/template behavior remains.
- Dark/light theme switching remains.
- The top More menu layering fix remains.
- package-lock.json is intentionally excluded.

Run:

```bash
npm install
npm run dev
```

Storage migrates from v12/v11 when available and persists to:

```txt
habit-planner-rpg-v13
```
