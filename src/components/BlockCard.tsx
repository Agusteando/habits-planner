import { countdownText, getTier, isReviewReady } from "../domain/rules";
import { HabitTask, ScheduledBlock } from "../domain/types";
import { usePlanner } from "../state/plannerStore";
import { useDragLayer } from "./DragLayer";

interface Props {
  block: ScheduledBlock;
  task: HabitTask;
}

export function BlockCard({ block, task }: Props) {
  const { dispatch, canEdit } = usePlanner();
  const { beginDrag } = useDragLayer();
  const tier = getTier(task, block.tier);
  const ready = task.kind === "review" && isReviewReady(block);
  const reviewCountdown = task.kind === "review" ? countdownText(block.reviewUnlockAt) : undefined;

  const statusText =
    block.status === "done"
      ? "Done"
      : block.status === "missed"
        ? "Missed"
        : block.status === "paused"
          ? "Paused"
          : block.status === "recoveryDue"
            ? "Recovery"
            : task.kind === "review"
              ? reviewCountdown
              : "Assumed OK";

  return (
    <article className={`block-card ${task.kind} ${task.accent} ${block.status}`} data-drop-block={block.id}>
      <button
        className="drag-handle"
        aria-label={`Move ${task.title}`}
        onPointerDown={(event) => beginDrag({ type: "block", blockId: block.id }, event)}
      >
        ⋮⋮
      </button>

      <div className="block-main">
        <div className="block-icon">{task.icon}</div>
        <div className="block-copy">
          <div className="block-title-row">
            <strong>{task.title}</strong>
            <span className={`status-pill ${block.status}`}>{statusText}</span>
          </div>
          <small>{tier.label} · {tier.minutes ? `${tier.minutes}m` : "no timer"}</small>
        </div>
      </div>

      <div className="block-actions">
        {task.kind === "review" ? (
          <>
            <button disabled={!ready} onClick={() => dispatch({ type: "OPEN_REVIEW", blockId: block.id })}>
              Review
            </button>
            <button disabled={!canEdit} onClick={() => dispatch({ type: "DELETE_BLOCK", blockId: block.id })}>
              Remove
            </button>
          </>
        ) : task.kind === "pause" ? (
          <>
            <button onClick={() => dispatch({ type: "APPLY_PAUSE", blockId: block.id })}>Pause rest</button>
            <button disabled={!canEdit} onClick={() => dispatch({ type: "DELETE_BLOCK", blockId: block.id })}>Remove</button>
          </>
        ) : (
          <>
            <button disabled={!canEdit} onClick={() => dispatch({ type: "CYCLE_TIER", blockId: block.id })}>Tier {block.tier}</button>
            <button onClick={() => dispatch({ type: "MARK_DONE", blockId: block.id })}>Done</button>
            <button onClick={() => dispatch({ type: "REPORT_MISSED", blockId: block.id })}>Missed</button>
            <button disabled={!canEdit} onClick={() => dispatch({ type: "DELETE_BLOCK", blockId: block.id })}>Remove</button>
          </>
        )}
      </div>
    </article>
  );
}
