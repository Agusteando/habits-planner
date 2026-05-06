import { useRef } from "react";
import { countdownText } from "../domain/rules";
import { usePlanner } from "../state/plannerStore";

export function TopBar() {
  const { state, report, dispatch, exportPlan, importFile } = usePlanner();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reviewText =
    state.week.mode === "reviewOpen"
      ? `Review ${countdownText(state.week.reviewOpenUntil)}`
      : state.week.mode === "reviewPending"
        ? `Gate ${countdownText(state.week.emergencyReviewUnlockAt)}`
        : state.week.mode === "sealed"
          ? "Sealed"
          : "Draft";

  return (
    <header className="topbar glass-panel">
      <button className="brand" onClick={() => dispatch({ type: "SET_VIEW", view: "plan" })}>
        <span className="brand-mark">◆</span>
        <span>Habit Planner</span>
      </button>

      <div className="top-status">
        <span>LVL {state.player.level}</span>
        <span>{state.player.xp} XP</span>
        <span>{state.player.tokens}T</span>
        <span className={`streak ${state.player.streakState}`}>{state.player.streakDays}d</span>
        <span className={`mode ${state.week.mode}`}>{reviewText}</span>
      </div>

      <div className="top-actions">
        {state.blocks.length === 0 && (
          <button className="soft-action" onClick={() => dispatch({ type: "STARTER_WEEK" })}>Starter</button>
        )}
        <button className="soft-action" onClick={exportPlan}>Export</button>
        <button className="soft-action" onClick={() => inputRef.current?.click()}>Import</button>
        <button className={`seal-action ${report.status}`} onClick={() => dispatch({ type: "SEAL" })}>
          {state.week.mode === "reviewOpen" ? "Reseal" : "Seal"}
        </button>
      </div>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </header>
  );
}
