import { getTier } from "../domain/rules";
import { HabitTask, ScheduledBlock } from "../domain/types";
import { useDragRuntime } from "../state/DragContext";
import { usePlanner } from "../state/PlannerContext";

export function BlockCard({ task, block, bank = false, compact = false, quiet = false }: { task: HabitTask; block?: ScheduledBlock; bank?: boolean; compact?: boolean; quiet?: boolean }) {
  const drag = useDragRuntime();
  const planner = usePlanner();
  const tier = getTier(task, block?.tier ?? (task.kind === "reward" ? 2 : 3));
  const dragKind = block ? "block" : "task";
  const dragId = block?.id ?? task.id;

  return (
    <article
      className={["block-card", task.kind, task.accent, compact ? "compact" : "", bank ? "bank" : "", block?.status ?? "", block?.injected ? "injected" : "", quiet ? "quiet" : ""].join(" ")}
      data-drop-block={block?.id}
      data-drop-day={block?.day}
      onPointerDown={(event) => drag.beginDrag(dragKind, dragId, task.title, task.icon, event)}
    >
      <span className="grip" aria-hidden="true">⋮</span>
      <span className="icon" aria-hidden="true">{task.icon}</span>
      <span className="copy">
        <strong>{task.title}</strong>
        <small>{tier.label}{block?.at ? ` · ${block.at}` : ""}</small>
      </span>
      <span className="metric">{task.kind === "reward" ? `${task.tokenCost}T` : `+${task.tokenEarn}T`}</span>

      {block && !quiet && (
        <span className="controls" onPointerDown={(event) => event.stopPropagation()}>
          <button className="tier-btn" onClick={() => planner.cycleTier(block.id)}>Tier {block.tier}</button>
          <button className="done-btn" onClick={() => planner.completeBlock(block.id)}>Done</button>
          <button className="skip-btn" onClick={() => planner.skipBlock(block.id)}>Skip</button>
          <button className="remove-btn" onClick={() => planner.deleteBlock(block.id)}>Remove</button>
        </span>
      )}
    </article>
  );
}
