import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/plannerStore";

type DragPayload =
  | { type: "template"; taskId: string }
  | { type: "block"; blockId: string };

interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
}

interface DragContextValue {
  drag?: DragState;
  beginDrag: (payload: DragPayload, event: React.PointerEvent) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

function targetFromPoint(x: number, y: number): { day: DayKey; beforeBlockId?: string } | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;

  const blockTarget = el.closest<HTMLElement>("[data-drop-block]");
  if (blockTarget?.dataset.dropBlock) {
    const dayEl = blockTarget.closest<HTMLElement>("[data-drop-day]");
    const day = dayEl?.dataset.dropDay as DayKey | undefined;
    if (day) return { day, beforeBlockId: blockTarget.dataset.dropBlock };
  }

  const dayTarget = el.closest<HTMLElement>("[data-drop-day]");
  if (dayTarget?.dataset.dropDay) {
    return { day: dayTarget.dataset.dropDay as DayKey };
  }

  return null;
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const { dispatch, state } = usePlanner();
  const [drag, setDrag] = useState<DragState | undefined>();

  const beginDrag = useCallback((payload: DragPayload, event: React.PointerEvent) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setDrag({ payload, x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    if (!drag) return;

    function onMove(event: PointerEvent) {
      setDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
    }

    function onUp(event: PointerEvent) {
      const target = targetFromPoint(event.clientX, event.clientY);
      const current = drag;
      setDrag(undefined);

      if (!target) return;

      if (current.payload.type === "template") {
        dispatch({ type: "ADD_TEMPLATE", taskId: current.payload.taskId, target });
      } else {
        dispatch({ type: "MOVE_BLOCK", blockId: current.payload.blockId, target });
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, dispatch]);

  const value = useMemo(() => ({ drag, beginDrag }), [drag, beginDrag]);

  const task =
    drag?.payload.type === "template"
      ? state.tasks[drag.payload.taskId]
      : drag?.payload.type === "block"
        ? state.tasks[state.blocks.find((block) => block.id === drag.payload.blockId)?.taskId ?? ""]
        : undefined;

  return (
    <DragContext.Provider value={value}>
      {children}
      {drag && task && (
        <div className="drag-overlay" style={{ left: drag.x, top: drag.y }}>
          <div className={`mini-card ${task.accent} ${task.kind}`}>
            <span>{task.icon}</span>
            <strong>{task.title}</strong>
          </div>
        </div>
      )}
    </DragContext.Provider>
  );
}

export function useDragLayer() {
  const value = useContext(DragContext);
  if (!value) throw new Error("useDragLayer must be used inside DragProvider.");
  return value;
}
