
# Habit Planner RPG v27

Updates in this pass:

- Removed the direct “Add” button from Action Bank cards.
- Rebuilt Time view as a true calendar-style surface instead of a stacked time-band Kanban.
- Time view now uses continuous vertical time lanes from 5 AM to 9 PM.
- Dropping into Time view places an action at the precise snapped time position.
- Each time event can be resized vertically from its bottom handle; duration is estimated and persisted in minutes.
- The current-time beam is constrained inside the current day lane and inside the active event when it intersects one.
- Time events are contained in their day lanes to prevent leaking across the layout.
- No package-lock.json is included.
