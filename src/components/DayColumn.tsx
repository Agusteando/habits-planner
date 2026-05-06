import type { CSSProperties } from "react";
import { getDayBlocks, shortDayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/plannerStore";
import { BlockCard } from "./BlockCard";

export function DayColumn({ day }: { day: DayKey }) {
  const { state, dispatch } = usePlanner();
  const blocks = getDayBlocks(state.blocks, day);
  const done = blocks.filter((block) => block.status === "done" || block.status === "paused").length;
  const progress = blocks.length ? done / blocks.length : 0;

  return (
    <section
      className={`day-column ${state.selectedDay === day ? "selected" : ""}`}
      data-drop-day={day}
      onClick={() => dispatch({ type: "SET_DAY", day })}
    >
      <header className="day-head">
        <div className="day-orb" style={{ "--progress": progress } as CSSProperties}>
          <span>{shortDayLabel(day).slice(0, 1)}</span>
        </div>
        <div>
          <strong>{shortDayLabel(day)}</strong>
          <small>{blocks.length ? `${blocks.length} blocks` : "drop actions"}</small>
        </div>
      </header>

      <div className="day-stack">
        {blocks.map((block) => {
          const task = state.tasks[block.taskId];
          return task ? <BlockCard key={block.id} block={block} task={task} /> : null;
        })}

        {blocks.length === 0 && (
          <div className="drop-hint">
            <span />
            <small>Drop here</small>
          </div>
        )}
      </div>
    </section>
  );
}
