import { DAYS } from "../domain/rules";
import { usePlanner } from "../state/PlannerContext";
import { ActionBank } from "./ActionBank";
import { DayColumn } from "./DayColumn";
import { EquilibriumMeter } from "./EquilibriumMeter";
import { HoldToSealButton } from "./HoldToSealButton";
import { LensToggle } from "./LensToggle";
import { SosButton } from "./SosButton";
import { TimeBoard } from "./TimeLens";
export function MissionControl() { const { planningLens } = usePlanner(); return <section className="mission-control"><aside className="inventory-rail glass-panel"><EquilibriumMeter /><ActionBank rail /></aside><section className="week-board glass-panel"><div className="board-header"><div><h1>Plan</h1><span>Drag actions into days. Drop onto a block to reorder.</span></div><div className="board-actions"><LensToggle /><SosButton compact /><HoldToSealButton /></div></div>{planningLens === "blocks" ? <div className="board-grid">{DAYS.map((day)=><DayColumn key={day} day={day} />)}</div> : <TimeBoard />}</section></section>; }
