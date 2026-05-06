import { useMemo, useState } from "react";
import { TaskCategory } from "../domain/types";
import { useDragLayer } from "./DragLayer";
import { usePlanner } from "../state/plannerStore";

const chips: Array<"All" | TaskCategory> = ["All", "Body", "Food", "Focus", "Dopa", "Recovery", "System"];

export function ActionBank() {
  const { state } = usePlanner();
  const { beginDrag } = useDragLayer();
  const [chip, setChip] = useState<"All" | TaskCategory>("All");

  const visible = useMemo(
    () => Object.values(state.tasks).filter((task) => chip === "All" || task.category === chip),
    [state.tasks, chip]
  );

  return (
    <aside className="action-bank glass-panel">
      <div className="bank-head">
        <strong>Action Bank</strong>
        <span>Drag into a day</span>
      </div>

      <div className="chip-row">
        {chips.map((item) => (
          <button key={item} className={chip === item ? "active" : ""} onClick={() => setChip(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="bank-strip">
        {visible.map((task) => (
          <button
            key={task.id}
            className={`bank-card ${task.kind} ${task.accent}`}
            onPointerDown={(event) => beginDrag({ type: "template", taskId: task.id }, event)}
          >
            <span className="bank-icon">{task.icon}</span>
            <span className="bank-copy">
              <strong>{task.title}</strong>
              <small>{task.kind === "reward" ? `${task.tokenCost} tokens` : task.kind === "review" ? "planned edits" : task.kind === "pause" ? "stop point" : `+${task.tokenEarn} token`}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
