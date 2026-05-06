import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { initialPlayer, initialWeek, taskTemplates } from "../data/templates";
import {
  calculateEquilibrium,
  canEditPlan,
  canSealWeek,
  countdownText,
  DAYS,
  getTier,
  id,
  nextOrder,
  normalizeOrders,
  nowIso,
  REVIEW_DELAY_MS,
  REVIEW_WINDOW_MS,
  SOS_LOCK_MS
} from "../domain/rules";
import { DayKey, HabitTask, PlannerSnapshot, PlannerState, ScheduledBlock } from "../domain/types";

const STORAGE_KEY = "habit-planner-rpg-v6";

type DropTarget = { day: DayKey; beforeBlockId?: string };
type Action =
  | { type: "SET_VIEW"; view: PlannerState["activeView"] }
  | { type: "SET_DAY"; day: DayKey }
  | { type: "ADD_TEMPLATE"; taskId: string; target: DropTarget }
  | { type: "MOVE_BLOCK"; blockId: string; target: DropTarget }
  | { type: "DELETE_BLOCK"; blockId: string }
  | { type: "CYCLE_TIER"; blockId: string }
  | { type: "MARK_DONE"; blockId: string }
  | { type: "REPORT_MISSED"; blockId: string }
  | { type: "APPLY_PAUSE"; blockId: string }
  | { type: "DOWNSHIFT_DAY"; day: DayKey }
  | { type: "SEAL" }
  | { type: "REQUEST_EMERGENCY_REVIEW" }
  | { type: "OPEN_REVIEW"; blockId: string }
  | { type: "STARTER_WEEK" }
  | { type: "IMPORT"; snapshot: PlannerSnapshot }
  | { type: "TOAST"; toast?: string };

function baseState(): PlannerState {
  return {
    schemaVersion: 6,
    activeView: "plan",
    tasks: taskTemplates,
    blocks: [],
    player: initialPlayer,
    week: initialWeek,
    selectedDay: "mon"
  };
}

function validateSnapshot(input: unknown): PlannerSnapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid plan file.");
  const snapshot = input as Partial<PlannerSnapshot>;
  if (snapshot.schemaVersion !== 6) throw new Error("Unsupported plan version.");
  if (!snapshot.tasks || typeof snapshot.tasks !== "object") throw new Error("Plan is missing actions.");
  if (!Array.isArray(snapshot.blocks)) throw new Error("Plan is missing blocks.");
  if (!snapshot.player || !snapshot.week) throw new Error("Plan is missing state.");
  if (!snapshot.selectedDay || !DAYS.includes(snapshot.selectedDay)) throw new Error("Plan has an invalid day.");
  return snapshot as PlannerSnapshot;
}

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState();
    const parsed = JSON.parse(raw) as PlannerState;
    if (parsed.schemaVersion !== 6) return baseState();
    return {
      ...baseState(),
      ...parsed,
      tasks: { ...taskTemplates, ...(parsed.tasks ?? {}) },
      blocks: normalizeOrders(parsed.blocks ?? [])
    };
  } catch {
    return baseState();
  }
}

function makeBlock(task: HabitTask, day: DayKey, order: number, sealed: boolean): ScheduledBlock {
  const createdAt = nowIso();
  const reviewUnlockAt =
    task.kind === "review"
      ? new Date(Date.now() + REVIEW_DELAY_MS).toISOString()
      : undefined;

  return {
    id: id("block"),
    taskId: task.id,
    day,
    order,
    tier: task.kind === "reward" ? 2 : 1,
    status: "planned",
    sealed,
    createdAt,
    reviewUnlockAt
  };
}

function insertBlock(blocks: ScheduledBlock[], incoming: ScheduledBlock, target: DropTarget) {
  const otherDays = blocks.filter((block) => block.day !== target.day);
  const dayBlocks = blocks.filter((block) => block.day === target.day).sort((a, b) => a.order - b.order);
  const nextDay: ScheduledBlock[] = [];

  if (!target.beforeBlockId) {
    return normalizeOrders([...blocks, { ...incoming, day: target.day, order: nextOrder(blocks, target.day) }]);
  }

  let inserted = false;
  for (const block of dayBlocks) {
    if (block.id === target.beforeBlockId) {
      nextDay.push({ ...incoming, day: target.day, order: block.order - 0.5 });
      inserted = true;
    }
    nextDay.push(block);
  }

  if (!inserted) nextDay.push({ ...incoming, day: target.day, order: nextOrder(blocks, target.day) });
  return normalizeOrders([...otherDays, ...nextDay]);
}

function editBlocked(state: PlannerState) {
  if (canEditPlan(state.week)) return false;
  return true;
}

function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, activeView: action.view };

    case "SET_DAY":
      return { ...state, selectedDay: action.day };

    case "ADD_TEMPLATE": {
      if (editBlocked(state)) return { ...state, toast: "Plan is sealed. Add a Review block first." };
      const task = state.tasks[action.taskId];
      if (!task) return state;
      const block = makeBlock(task, action.target.day, nextOrder(state.blocks, action.target.day), state.week.mode !== "draft");
      const blocks = insertBlock(state.blocks, block, action.target);
      return { ...state, blocks, selectedDay: action.target.day };
    }

    case "MOVE_BLOCK": {
      if (editBlocked(state)) return { ...state, toast: "Plan is sealed." };
      const moving = state.blocks.find((block) => block.id === action.blockId);
      if (!moving) return state;
      const rest = state.blocks.filter((block) => block.id !== action.blockId);
      const moved = { ...moving, day: action.target.day };
      const blocks = insertBlock(rest, moved, action.target);
      return { ...state, blocks, selectedDay: action.target.day };
    }

    case "DELETE_BLOCK": {
      if (editBlocked(state)) return { ...state, toast: "Open a Review window before editing." };
      return { ...state, blocks: normalizeOrders(state.blocks.filter((block) => block.id !== action.blockId)) };
    }

    case "CYCLE_TIER": {
      if (editBlocked(state)) return { ...state, toast: "Open a Review window before changing tiers." };
      const sosLocked = state.week.sosUntil && Date.now() < new Date(state.week.sosUntil).getTime();
      const blocks = state.blocks.map((block) => {
        if (block.id !== action.blockId) return block;
        if (sosLocked && block.tier === 1) return block;
        const tier = block.tier === 1 ? 2 : block.tier === 2 ? 3 : 1;
        return { ...block, tier };
      });
      return { ...state, blocks };
    }

    case "MARK_DONE": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return state;
      const task = state.tasks[block.taskId];
      if (!task) return state;
      const tier = getTier(task, block.tier);
      const blocks = state.blocks.map((candidate) =>
        candidate.id === action.blockId ? { ...candidate, status: "done" as const } : candidate
      );
      return {
        ...state,
        blocks,
        player: {
          ...state.player,
          xp: state.player.xp + tier.xp,
          tokens: Math.max(0, state.player.tokens + task.tokenEarn - (task.kind === "reward" ? task.tokenCost : 0)),
          streakState: task.kind === "recovery" ? "healthy" : state.player.streakState
        }
      };
    }

    case "REPORT_MISSED": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return state;

      const existingRecovery = state.blocks.some(
        (candidate) => candidate.day === block.day && candidate.taskId === "recovery" && candidate.status === "recoveryDue"
      );
      const recovery = makeBlock(state.tasks.recovery, block.day, nextOrder(state.blocks, block.day), false);

      const blocks = normalizeOrders([
        ...state.blocks.map((candidate) =>
          candidate.id === action.blockId ? { ...candidate, status: "missed" as const } : candidate
        ),
        ...(existingRecovery ? [] : [{ ...recovery, tier: 1 as const, status: "recoveryDue" as const, injected: true }])
      ]);

      return {
        ...state,
        blocks,
        player: { ...state.player, streakState: "fractured" },
        toast: existingRecovery ? "Miss noted." : "Recovery added."
      };
    }

    case "APPLY_PAUSE": {
      const pause = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!pause) return state;
      const blocks = state.blocks.map((block) => {
        if (block.id === pause.id) return { ...block, status: "done" as const, pauseAppliedAt: nowIso() };
        if (block.day === pause.day && block.order > pause.order && block.status === "planned") {
          return { ...block, status: "paused" as const };
        }
        return block;
      });
      return { ...state, blocks, toast: "Rest of day paused." };
    }

    case "DOWNSHIFT_DAY": {
      const until = new Date(Date.now() + SOS_LOCK_MS).toISOString();
      const blocks = state.blocks.map((block) =>
        block.day === action.day && block.status === "planned" ? { ...block, tier: 1 as const } : block
      );
      return { ...state, blocks, week: { ...state.week, sosUntil: until }, toast: "Day downshifted." };
    }

    case "SEAL": {
      const report = calculateEquilibrium(state.blocks, state.tasks);
      if (!canSealWeek(report, state.week)) return { ...state, toast: report.sealDisabledReason ?? "Cannot seal yet." };
      return {
        ...state,
        week: { ...state.week, mode: "sealed", sealedAt: nowIso(), reviewOpenUntil: undefined },
        blocks: state.blocks.map((block) => ({
          ...block,
          sealed: true,
          reviewUnlockAt:
            state.tasks[block.taskId]?.kind === "review"
              ? block.reviewUnlockAt ?? new Date(Date.now() + REVIEW_DELAY_MS).toISOString()
              : block.reviewUnlockAt
        })),
        toast: "Week sealed."
      };
    }

    case "REQUEST_EMERGENCY_REVIEW": {
      const unlock = new Date(Date.now() + REVIEW_DELAY_MS).toISOString();
      return {
        ...state,
        week: {
          ...state.week,
          mode: "reviewPending",
          emergencyReviewRequestedAt: nowIso(),
          emergencyReviewUnlockAt: unlock
        },
        toast: "Emergency review queued."
      };
    }

    case "OPEN_REVIEW": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return state;
      if (!block.reviewUnlockAt || Date.now() < new Date(block.reviewUnlockAt).getTime()) {
        return { ...state, toast: `Review opens in ${countdownText(block.reviewUnlockAt)}.` };
      }
      return {
        ...state,
        week: {
          ...state.week,
          mode: "reviewOpen",
          reviewOpenUntil: new Date(Date.now() + REVIEW_WINDOW_MS).toISOString()
        },
        blocks: state.blocks.map((candidate) =>
          candidate.id === action.blockId ? { ...candidate, status: "done" as const, reviewOpenedAt: nowIso() } : candidate
        ),
        toast: "Review open. Edit, then reseal."
      };
    }

    case "STARTER_WEEK": {
      if (state.blocks.length > 0) return { ...state, toast: "Starter week only applies to a blank week." };
      const starter = [
        ["mon", "pushups"], ["mon", "tuna"], ["mon", "walk"],
        ["tue", "focus"], ["tue", "game"],
        ["wed", "pushups"], ["wed", "tuna"],
        ["thu", "focus"], ["thu", "pause"],
        ["fri", "walk"], ["fri", "pizza"],
        ["sun", "review"]
      ] as Array<[DayKey, string]>;

      let blocks: ScheduledBlock[] = [];
      for (const [day, taskId] of starter) {
        const task = state.tasks[taskId];
        blocks.push(makeBlock(task, day, nextOrder(blocks, day), false));
      }
      return { ...state, blocks: normalizeOrders(blocks), selectedDay: "mon", toast: "Starter week added." };
    }

    case "IMPORT":
      return {
        ...action.snapshot,
        schemaVersion: 6,
        tasks: { ...taskTemplates, ...action.snapshot.tasks },
        blocks: normalizeOrders(action.snapshot.blocks),
        toast: "Plan imported."
      };

    case "TOAST":
      return { ...state, toast: action.toast };

    default:
      return state;
  }
}

interface PlannerContextValue {
  state: PlannerState;
  report: ReturnType<typeof calculateEquilibrium>;
  dispatch: React.Dispatch<Action>;
  canEdit: boolean;
  makeSnapshot: () => PlannerSnapshot;
  importFile: (file: File) => Promise<void>;
  exportPlan: () => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    const serializable: PlannerState = { ...state, toast: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: "TOAST", toast: undefined }), 2400);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  const report = useMemo(() => calculateEquilibrium(state.blocks, state.tasks), [state.blocks, state.tasks]);
  const canEdit = canEditPlan(state.week);

  const makeSnapshot = useCallback((): PlannerSnapshot => ({
    ...state,
    exportedAt: new Date().toISOString(),
    toast: undefined
  }), [state]);

  const importFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    dispatch({ type: "IMPORT", snapshot: validateSnapshot(parsed) });
  }, []);

  const exportPlan = useCallback(() => {
    const snapshot = makeSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `habit-plan-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [makeSnapshot]);

  const value = useMemo(() => ({ state, report, dispatch, canEdit, makeSnapshot, importFile, exportPlan }), [state, report, canEdit, makeSnapshot, importFile, exportPlan]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside PlannerProvider.");
  return value;
}
