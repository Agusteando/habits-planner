import { DAYS, dayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/PlannerContext";
import { ActionBankSheet } from "./ActionBankSheet";
import { DayColumn } from "./DayColumn";
import { EquilibriumMeter } from "./EquilibriumMeter";
import { HoldToSealButton } from "./HoldToSealButton";
import { LensToggle } from "./LensToggle";
import { TimeLens } from "./TimeLens";

export function PlanMobile() {
  const { selectedDay, setSelectedDay, planningLens, setInventoryOpen, blocks, useStarterPlan } = usePlanner();
  const idx = DAYS.indexOf(selectedDay);
  const shift = (delta: number) => setSelectedDay(DAYS[(idx + delta + DAYS.length) % DAYS.length]);
  const empty = blocks.length === 0;

  return (
    <div className="plan-mobile">
      <div className="plan-strip">
        <EquilibriumMeter compact />
        <LensToggle />
      </div>
      <section className="day-switch glass-panel">
        <button onClick={() => shift(-1)}>‹</button>
        <div><h1>{dayLabel(selectedDay)}</h1><span>{planningLens === "blocks" ? "day canvas" : "time lens"}</span></div>
        <button onClick={() => shift(1)}>›</button>
      </section>
      {empty && (
        <section className="mobile-empty-intro glass-panel">
          <strong>Start with one action.</strong>
          <p>Tap the bank, then drag a block into this day.</p>
          <div><button onClick={() => setInventoryOpen(true)}>Open action bank</button><button onClick={useStarterPlan}>Starter week</button></div>
        </section>
      )}
      <div className="mobile-calendar-surface">{planningLens === "blocks" ? <DayColumn day={selectedDay as DayKey} mobile /> : <TimeLens day={selectedDay as DayKey} />}</div>
      <div className="mobile-plan-actions"><button className="add-block" onClick={() => setInventoryOpen(true)}>＋ Add actions</button><HoldToSealButton /></div>
      <ActionBankSheet />
    </div>
  );
}
