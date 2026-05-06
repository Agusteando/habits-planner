import { useEffect, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    if (task.kind !== "review") return;
    const timer = window.setInterval(() => setMinuteTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, [task.kind]);

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
              : "OK";

  return (
    <article
      className={`block-card ${task.kind} ${task.accent} ${block.status} ${expanded ? "expanded" : ""}`}
      data-drop-block={block.id}
      onClick={(event) => {
        event.stopPropagation();
        setExpanded((value) => !value);
      }}
    >
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

      {expanded && (
        <div className="block-actions" onClick={(event) => event.stopPropagation()}>
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
      )}
    </article>
  );
}
