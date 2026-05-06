import { DAYS } from "../domain/rules";
import { DayColumn } from "./DayColumn";
import { EquilibriumMeter } from "./EquilibriumMeter";
import { usePlanner } from "../state/plannerStore";

export function WeekBoard() {
  const { state } = usePlanner();

  return (
    <section className="week-panel glass-panel">
      <div className="week-head">
        <div>
          <h1>Week</h1>
          <p>
            {state.week.mode === "sealed"
              ? "Sealed. Report exceptions or open a planned Review block."
              : state.week.mode === "reviewOpen"
                ? "Review window open. Make changes, then reseal."
                : "Drag actions into days. The plan assumes success unless you report otherwise."}
          </p>
        </div>
        <EquilibriumMeter />
      </div>

      <div className="week-scroll">
        <div className="week-row">
          {DAYS.map((day) => <DayColumn key={day} day={day} />)}
        </div>
      </div>
    </section>
  );
}
