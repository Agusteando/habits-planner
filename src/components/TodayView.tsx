import type { CSSProperties } from "react";
import { getDayBlocks, getTier } from "../domain/rules";
import { usePlanner } from "../state/PlannerContext";
import { BlockCard } from "./BlockCard";
import { SosButton } from "./SosButton";

export function TodayView() {
  const { blocks, tasks, selectedDay, setActiveView, setInventoryOpen } = usePlanner();
  const dayBlocks = getDayBlocks(blocks, selectedDay);
  const active = dayBlocks.find((block) => block.status === "scheduled" || block.status === "recoveryDue");
  const upcoming = dayBlocks.filter((block) => block.id !== active?.id && block.status === "scheduled");
  const done = dayBlocks.filter((block) => block.status === "done").length;
  const pct = Math.round((done / Math.max(1, dayBlocks.length)) * 100);

  return (
    <div className="today-view">
      <section className="today-orbit glass-panel">
        <div className="big-orb" style={{ "--p": done / Math.max(1, dayBlocks.length) } as CSSProperties}>{pct}%</div>
        <div><h1>Today</h1><p>{active ? "Next action" : dayBlocks.length ? "Clear" : "No blocks yet"}</p></div>
        <SosButton compact />
      </section>
      <section className="active-now">
        {active ? <BlockCard task={tasks[active.taskId]} block={active} /> : (
          <div className="empty-focus glass-panel">
            <strong>{dayBlocks.length ? "Done." : "Nothing scheduled."}</strong>
            <p>{dayBlocks.length ? "The day is clear." : "Go to Plan and drag an action into a day."}</p>
            {!dayBlocks.length && <button onClick={() => { setActiveView("plan"); setInventoryOpen(true); }}>Add first action</button>}
          </div>
        )}
      </section>
      <section className="quiet-queue">
        {upcoming.map((block) => {
          const task = tasks[block.taskId];
          const tier = getTier(task, block.tier);
          return <div className={`queue-row ${task.kind}`} key={block.id}><span>{task.icon}</span><strong>{task.title}</strong><small>{block.at ?? tier.minutes + "m"}</small></div>;
        })}
      </section>
    </div>
  );
}
