import { CSSProperties } from "react";
import { dayLabel, getDayBlocks, shortDayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/PlannerContext";
import { BlockCard } from "./BlockCard";

export function DayColumn({ day, mobile = false }: { day: DayKey; mobile?: boolean }) {
  const { blocks, tasks, setSelectedDay, setInventoryOpen } = usePlanner();
  const dayBlocks = getDayBlocks(blocks, day);
  const done = dayBlocks.filter((block) => block.status === "done").length;
  const progress = done / Math.max(1, dayBlocks.length);

  return (
    <article className={`day-column ${mobile ? "mobile" : ""}`} data-drop-day={day} onClick={() => setSelectedDay(day)}>
      <header>
        <div className="day-orb" style={{ "--p": progress } as CSSProperties}>{shortDayLabel(day).slice(0, 1)}</div>
        <div>
          <strong>{mobile ? dayLabel(day) : shortDayLabel(day)}</strong>
          <small>{dayBlocks.length ? `${dayBlocks.length} block${dayBlocks.length === 1 ? "" : "s"}` : "empty"}</small>
        </div>
      </header>
      <div className="day-stack">
        {dayBlocks.map((block) => {
          const task = tasks[block.taskId];
          return task ? <BlockCard key={block.id} task={task} block={block} compact={!mobile} /> : null;
        })}
        {dayBlocks.length === 0 && (
          <div className="empty-day">
            <span aria-hidden="true" />
            <strong>Drop actions here</strong>
            <p>Build this day from the action bank.</p>
            {mobile && <button onClick={(event) => { event.stopPropagation(); setInventoryOpen(true); }}>Open action bank</button>}
          </div>
        )}
      </div>
    </article>
  );
}
