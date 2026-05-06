import { isSosLocked } from "../domain/rules";
import { usePlanner } from "../state/PlannerContext";
export function SosButton({ compact = false }: { compact?: boolean }) { const { week, triggerSos } = usePlanner(); const locked = isSosLocked(week); return <button className={`sos ${compact ? "compact" : ""} ${locked ? "locked" : ""}`} disabled={locked} onClick={triggerSos}>⚠<span>{locked ? "Valley" : "SOS"}</span></button>; }
