import { usePlanner } from "../state/PlannerContext";
export function LensToggle() { const { planningLens, setPlanningLens } = usePlanner(); return <button className={`lens-toggle ${planningLens}`} onClick={() => setPlanningLens(planningLens === "blocks" ? "time" : "blocks")}>{planningLens === "blocks" ? "▦" : "◷"}<span>{planningLens === "blocks" ? "Days" : "Time"}</span></button>; }
