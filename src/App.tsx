import { ActionBank } from "./components/ActionBank";
import { DragProvider } from "./components/DragLayer";
import { TodayView } from "./components/TodayView";
import { TopBar } from "./components/TopBar";
import { VaultView } from "./components/VaultView";
import { WeekBoard } from "./components/WeekBoard";
import { usePlanner } from "./state/plannerStore";

function BottomNav() {
  const { state, dispatch } = usePlanner();
  const items = [
    ["plan", "Plan"],
    ["today", "Today"],
    ["vault", "Vault"]
  ] as const;

  return (
    <nav className="bottom-nav">
      {items.map(([view, label]) => (
        <button key={view} className={state.activeView === view ? "active" : ""} onClick={() => dispatch({ type: "SET_VIEW", view })}>
          {label}
        </button>
      ))}
    </nav>
  );
}

function Toast() {
  const { state } = usePlanner();
  return state.toast ? <div className="toast glass-panel">{state.toast}</div> : null;
}

export function App() {
  const { state } = usePlanner();

  return (
    <DragProvider>
      <main className="app-shell">
        <TopBar />

        <section className="workspace">
          {state.activeView === "plan" && (
            <>
              <WeekBoard />
              <ActionBank />
            </>
          )}
          {state.activeView === "today" && <TodayView />}
          {state.activeView === "vault" && <VaultView />}
        </section>

        <BottomNav />
        <Toast />
      </main>
    </DragProvider>
  );
}
