import { useMemo, useState } from "react";
import { usePlanner } from "../state/PlannerContext";
import { BlockCard } from "./BlockCard";
const chips = ["All", "Body", "Food", "Focus", "Dopa", "Recovery"] as const;

export function ActionBank({ rail = false }: { rail?: boolean }) {
  const { tasks } = usePlanner();
  const [chip, setChip] = useState<(typeof chips)[number]>("All");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => Object.values(tasks).filter((task) => {
    const q = query.trim().toLowerCase();
    return (chip === "All" || task.category === chip) && (!q || task.title.toLowerCase().includes(q));
  }), [tasks, chip, query]);

  return (
    <section className={`action-bank ${rail ? "rail" : ""}`}>
      <div className="bank-title">
        <strong>Action bank</strong>
        <span>Drag one into a day</span>
      </div>
      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find action" />
      </label>
      <div className="chips">
        {chips.map((item) => <button key={item} className={chip === item ? "active" : ""} onClick={() => setChip(item)}>{item}</button>)}
      </div>
      <div className="bank-grid">
        {visible.map((task) => <BlockCard key={task.id} task={task} bank compact={rail} />)}
      </div>
    </section>
  );
}
