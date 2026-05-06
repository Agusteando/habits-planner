import { usePlanner } from "../state/PlannerContext";
import { ActionBank } from "./ActionBank";
export function ActionBankSheet() { const { inventoryOpen, setInventoryOpen } = usePlanner(); if (!inventoryOpen) return null; return <aside className="bank-sheet glass-panel"><div className="sheet-handle"><span /><button onClick={() => setInventoryOpen(false)}>×</button></div><ActionBank /></aside>; }
