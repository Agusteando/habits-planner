# Habit Planner RPG v15

Updates in this pass:

- Review blocks are guarded. They cannot be spent unless a day or week is currently sealed.
- Unseal is guarded. It only works for sealed days, and only while Review is active.
- Sealing a day automatically creates a protected Review block on that day.
- Sealing the week automatically creates a protected Review block on Sunday.
- Review Gate also creates a visible Review block with the same countdown.
- When Review takes effect, the Review block and affected Kanban surface get a visible active state.
- The default planning surface remains the block-first Kanban.
- A separate compressed Time lens is now available from the Week controls.
- Time lens supports compressed bands such as 5–7 AM, 7–9 AM, etc.
- Time lens supports Morning, Afternoon, and Both filters.
- Dragging a block/action into a time band assigns that band.
- Review, Pause, and Recovery remain protected system blocks.
- No package-lock.json is included.

Run:

```bash
npm install
npm run dev
```

Storage migrates from v14/v13/v12/v11 when available and persists to:

```txt
habit-planner-rpg-v15
```
