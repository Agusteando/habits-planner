import { DAYS } from "../domain/rules";
import { usePlanner } from "../state/PlannerContext";
import { ActionBank } from "./ActionBank";
import { DayColumn } from "./DayColumn";
import { EquilibriumMeter } from "./EquilibriumMeter";
import { HoldToSealButton } from "./HoldToSealButton";
import { LensToggle } from "./LensToggle";
import { SosButton } from "./SosButton";
import { TimeBoard } from "./TimeLens";

export function MissionControl() {
  const { planningLens, blocks, useStarterPlan } = usePlanner();
  const empty = blocks.length === 0;

  return (
    <section className="mission-control">
      <aside className="inventory-rail glass-panel">
        <EquilibriumMeter />
        <ActionBank rail />
      </aside>
      <section className={`week-board glass-panel ${empty ? "empty" : ""}`}>
        <div className="board-header">
          <div>
            <h1>{empty ? "Build your week" : "Plan"}</h1>
            <span>{empty ? "Drag one action from the bank into any day. That is the whole interaction." : "Drag blocks between days. Drop onto another block to reorder."}</span>
          </div>
          <div className="board-actions">
            {empty && <button className="starter-btn" onClick={useStarterPlan}>Use starter week</button>}
            <LensToggle />
            <SosButton compact />
            <HoldToSealButton />
          </div>
        </div>
        {planningLens === "blocks" ? (
          <div className="board-grid">
            {empty && (
              <div className="canvas-help">
                <strong>Empty canvas</strong>
                <p>The left rail is your action bank. Drag a block into Monday, or use the starter week button.</p>
              </div>
            )}
            {DAYS.map((day) => <DayColumn key={day} day={day} />)}
          </div>
        ) : <TimeBoard />}
      </section>
    </section>
  );
}
