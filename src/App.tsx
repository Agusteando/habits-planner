import { BottomNav } from "./components/BottomNav";
import { MissionControl } from "./components/MissionControl";
import { PlanMobile } from "./components/PlanMobile";
import { Toast } from "./components/Toast";
import { TodayView } from "./components/TodayView";
import { TopBar } from "./components/TopBar";
import { VaultView } from "./components/VaultView";
import { usePlanner } from "./state/PlannerContext";
export function App() { const { activeView } = usePlanner(); return <main className="app-shell"><TopBar /><div className="mobile-stage"><section className="mobile-view">{activeView === "today" && <TodayView />}{activeView === "plan" && <PlanMobile />}{activeView === "vault" && <VaultView />}</section><BottomNav /></div><div className="desktop-stage"><MissionControl /></div><Toast /></main>; }
