import { useMemo, useRef, useState } from "react";
import { TaskCategory } from "../domain/types";
import { useDragLayer } from "./DragLayer";
import { usePlanner } from "../state/plannerStore";

const chips: Array<"All" | TaskCategory> = ["All", "Body", "Food", "Focus", "Dopa", "Recovery", "System"];

export function ActionBank() {
  const { state, importActionBankFile, exportActionBank, exportActionBankTemplate } = usePlanner();
  const { beginDrag } = useDragLayer();
  const [chip, setChip] = useState<"All" | TaskCategory>("All");
  const [query, setQuery] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);

  const visible = useMemo(
    () => Object.values(state.tasks).filter((task) => {
      const matchesChip = chip === "All" || task.category === chip;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || [task.title, task.category, task.kind, task.tiers.map((tier) => tier.label).join(" ")].join(" ").toLowerCase().includes(q);
      return matchesChip && matchesQuery;
    }),
    [state.tasks, chip, query]
  );

  return (
    <aside className="action-bank glass-panel">
      <div className="bank-head">
        <strong>Action Bank</strong>
        <span>{visible.length}</span>
      </div>

      <label className="bank-search">
        <span>⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions" />
      </label>

      <div className="bank-tools">
        <button onClick={exportActionBank}>Export</button>
        <button onClick={() => importRef.current?.click()}>Import</button>
        <button onClick={exportActionBankTemplate}>Template</button>
        <input
          ref={importRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importActionBankFile(file);
            if (importRef.current) importRef.current.value = "";
          }}
        />
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
              <small>{task.kind === "reward" ? `${task.tokenCost} tokens` : task.kind === "review" ? "review" : task.kind === "pause" ? "pause" : `+${task.tokenEarn} token`}</small>
            </span>
          </button>
        ))}
        {visible.length === 0 && <div className="bank-empty">No actions found.</div>}
      </div>
    </aside>
  );
}
