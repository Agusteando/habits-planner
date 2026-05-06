import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { usePlanner } from "./PlannerContext";

type DragKind = "task" | "block";
interface DragState { kind: DragKind; id: string; title: string; icon: string; x: number; y: number; }
interface DragValue { drag: DragState | null; beginDrag: (kind: DragKind, id: string, title: string, icon: string, event: ReactPointerEvent) => void; }
const DragContext = createContext<DragValue | null>(null);

function closestDropTarget(x: number, y: number) {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.dataset.dropDay || el.dataset.dropBlock) return el;
    el = el.parentElement;
  }
  return null;
}

export function DragProvider({ children }: { children: ReactNode }) {
  const planner = usePlanner();
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;
    document.body.classList.add("is-dragging");

    function move(event: PointerEvent) {
      setDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
    }

    function up(event: PointerEvent) {
      const target = closestDropTarget(event.clientX, event.clientY);
      if (target) {
        const day = target.dataset.dropDay;
        const beforeBlockId = target.dataset.dropBlock;
        const at = target.dataset.dropHour ? `${target.dataset.dropHour.padStart(2, "0")}:00` : undefined;
        if (day && activeDrag.kind === "task") planner.addTaskToDay(activeDrag.id, day, { beforeBlockId, at });
        if (day && activeDrag.kind === "block" && activeDrag.id !== beforeBlockId) planner.moveBlock(activeDrag.id, day, { beforeBlockId, at });
      }
      setDrag(null);
    }

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
    return () => {
      document.body.classList.remove("is-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, planner]);

  const value = useMemo(() => ({
    drag,
    beginDrag: (kind: DragKind, id: string, title: string, icon: string, event: ReactPointerEvent) => {
      if (event.button !== 0) return;
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      setDrag({ kind, id, title, icon, x: event.clientX, y: event.clientY });
    }
  }), [drag]);

  return <DragContext.Provider value={value}>{children}<DragLayer /></DragContext.Provider>;
}
function DragLayer() {
  const ctx = useContext(DragContext);
  if (!ctx?.drag) return null;
  return <div className="drag-layer" style={{ transform: `translate3d(${ctx.drag.x}px, ${ctx.drag.y}px, 0)` }}><span>{ctx.drag.icon}</span><strong>{ctx.drag.title}</strong></div>;
}
export function useDragRuntime() { const ctx = useContext(DragContext); if (!ctx) throw new Error("useDragRuntime must be used in DragProvider"); return ctx; }
