import type { CSSProperties } from "react";
import { getDayBlocks, getTier } from "../domain/rules";
import { usePlanner } from "../state/plannerStore";
import { BlockCard } from "./BlockCard";

export function TodayView() {
  const { state } = usePlanner();
  const blocks = getDayBlocks(state.blocks, state.selectedDay);
  const current = blocks.find((block) => block.status === "planned" || block.status === "recoveryDue");
  const completed = blocks.filter((block) => block.status === "done" || block.status === "paused").length;
  const total = Math.max(blocks.length, 1);
  const progress = Math.round((completed / total) * 100);

  return (
    <section className="today-panel glass-panel">
      <div className="today-head">
        <div className="today-ring" style={{ "--progress": completed / total } as CSSProperties}>
          <span>{progress}%</span>
        </div>
        <div>
          <h1>Today</h1>
          <p>Assumed complete unless you report otherwise.</p>
        </div>
      </div>

      {current && state.tasks[current.taskId] ? (
        <BlockCard block={current} task={state.tasks[current.taskId]} />
      ) : (
        <div className="quiet-empty">No active exception.</div>
      )}

      <div className="today-queue">
        {blocks.filter((block) => block.id !== current?.id).map((block) => {
          const task = state.tasks[block.taskId];
          if (!task) return null;
          const tier = getTier(task, block.tier);
          return (
            <div className={`queue-line ${block.status}`} key={block.id}>
              <span>{task.icon}</span>
              <strong>{task.title}</strong>
              <small>{block.status === "planned" ? `${tier.minutes}m` : block.status}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
