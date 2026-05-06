import { usePlanner } from "../state/PlannerContext";
const items = [{ id:"today", icon:"◎", label:"Today" }, { id:"plan", icon:"▦", label:"Plan" }, { id:"vault", icon:"◆", label:"Vault" }] as const;
export function BottomNav() { const { activeView, setActiveView } = usePlanner(); return <nav className="bottom-nav">{items.map((item) => <button key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => setActiveView(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>; }
