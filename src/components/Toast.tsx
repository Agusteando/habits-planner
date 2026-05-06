import { useEffect } from "react";
import { usePlanner } from "../state/PlannerContext";
export function Toast() { const { importMessage, clearImportMessage } = usePlanner(); useEffect(() => { if (!importMessage) return; const t = setTimeout(clearImportMessage, 2400); return () => clearTimeout(t); }, [importMessage, clearImportMessage]); return importMessage ? <div className="toast glass-panel">{importMessage}</div> : null; }
