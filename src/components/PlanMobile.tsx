import { DAYS, dayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/PlannerContext";
import { ActionBankSheet } from "./ActionBankSheet";
import { DayColumn } from "./DayColumn";
import { EquilibriumMeter } from "./EquilibriumMeter";
import { HoldToSealButton } from "./HoldToSealButton";
import { LensToggle } from "./LensToggle";
import { TimeLens } from "./TimeLens";
export function PlanMobile() { const { selectedDay, setSelectedDay, planningLens, setInventoryOpen } = usePlanner(); const idx = DAYS.indexOf(selectedDay); const shift = (d: number) => setSelectedDay(DAYS[(idx + d + DAYS.length) % DAYS.length]); return <div className="plan-mobile"><div className="plan-strip"><EquilibriumMeter compact /><LensToggle /></div><section className="day-switch glass-panel"><button onClick={() => shift(-1)}>‹</button><div><h1>{dayLabel(selectedDay)}</h1><span>{planningLens === "blocks" ? "blocks" : "time"}</span></div><button onClick={() => shift(1)}>›</button></section><div className="mobile-calendar-surface">{planningLens === "blocks" ? <DayColumn day={selectedDay as DayKey} mobile /> : <TimeLens day={selectedDay as DayKey} />}</div><div className="mobile-plan-actions"><button className="add-block" onClick={() => setInventoryOpen(true)}>＋ Drag actions</button><HoldToSealButton /></div><ActionBankSheet /></div>; }
