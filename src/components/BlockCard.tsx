import { getTier } from "../domain/rules";
import { HabitTask, ScheduledBlock } from "../domain/types";
import { useDragRuntime } from "../state/DragContext";
import { usePlanner } from "../state/PlannerContext";
export function BlockCard({ task, block, bank = false, compact = false, quiet = false }: { task: HabitTask; block?: ScheduledBlock; bank?: boolean; compact?: boolean; quiet?: boolean }) {
  const drag = useDragRuntime(); const planner = usePlanner(); const tier = getTier(task, block?.tier ?? (task.kind === "reward" ? 2 : 3)); const dragKind = block ? "block" : "task"; const dragId = block?.id ?? task.id;
  return <article className={["block-card", task.kind, task.accent, compact ? "compact" : "", block?.status ?? "", block?.injected ? "injected" : "", quiet ? "quiet" : ""].join(" ")} data-drop-block={block?.id} data-drop-day={block?.day} onPointerDown={(e) => drag.beginDrag(dragKind, dragId, task.title, task.icon, e)}>
    <span className="grip">⋮</span><span className="icon">{task.icon}</span><span className="copy"><strong>{task.title}</strong><small>{tier.label}{block?.at ? ` · ${block.at}` : ""}</small></span><span className="metric">{task.kind === "reward" ? `${task.tokenCost}T` : `+${task.tokenEarn}T`}</span>
    {block && !quiet && <span className="controls" onPointerDown={(e) => e.stopPropagation()}><button onClick={() => planner.cycleTier(block.id)}>T{block.tier}</button><button onClick={() => planner.completeBlock(block.id)}>✓</button><button onClick={() => planner.skipBlock(block.id)}>−</button><button onClick={() => planner.deleteBlock(block.id)}>×</button></span>}
  </article>;
}
