import { usePlanner } from "../state/plannerStore";

export function VaultView() {
  const { state, exportPlan } = usePlanner();

  return (
    <section className="vault-panel glass-panel">
      <div className="vault-hero">
        <span>✦</span>
        <h1>Vault</h1>
        <p>{state.player.tokens} tokens available for planned rewards.</p>
      </div>
      <div className="vault-actions">
        <button onClick={exportPlan}>Export plan</button>
        <button onClick={() => localStorage.removeItem("habit-planner-rpg-v6")}>Clear stored plan</button>
      </div>
      <div className="vault-list">
        <div>✦ Videogames · 2T</div>
        <div>✺ Pizza Night · 3T</div>
        <div>◈ Review Window · unlocks edits</div>
        <div>Ⅱ Pause Day · stops the remaining day</div>
      </div>
    </section>
  );
}
