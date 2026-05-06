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
  REVIEW_WINDOW_MS
} from "../domain/rules";
import { ActionBankSnapshot, DayKey, HabitTask, PlannerSnapshot, PlannerState, ScheduledBlock } from "../domain/types";

const STORAGE_KEY = "habit-planner-rpg-v10";
const CURRENT_SCHEMA_VERSION = 10;
const ACCEPTED_SCHEMA_VERSIONS = new Set([6, 10]);

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
  | { type: "SEAL" }
  | { type: "REQUEST_EMERGENCY_REVIEW" }
  | { type: "OPEN_EMERGENCY_REVIEW" }
  | { type: "OPEN_REVIEW"; blockId: string }
  | { type: "STARTER_WEEK" }
  | { type: "RESET_PLAN" }
  | { type: "IMPORT"; snapshot: PlannerSnapshot }
  | { type: "IMPORT_ACTION_BANK"; snapshot: ActionBankSnapshot }
  | { type: "TOAST"; toast?: string };

function baseState(toast?: string): PlannerState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activeView: "plan",
    tasks: taskTemplates,
    blocks: [],
    player: initialPlayer,
    week: initialWeek,
    selectedDay: "mon",
    toast
  };
}

function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && DAYS.includes(value as DayKey);
}

function validateTier(value: unknown): asserts value is HabitTask["tiers"][number] {
  const tier = value as HabitTask["tiers"][number];
  if (!tier || typeof tier !== "object") throw new Error("Tier must be an object.");
  if (![1, 2, 3].includes(tier.level)) throw new Error("Tier level must be 1, 2, or 3.");
  if (typeof tier.label !== "string" || !tier.label.trim()) throw new Error("Tier label is required.");
  for (const key of ["minutes", "xp", "tension", "relief"] as const) {
    if (typeof tier[key] !== "number" || Number.isNaN(tier[key])) throw new Error(`Tier ${key} must be a number.`);
  }
}

function validateTask(value: unknown): HabitTask {
  const task = value as HabitTask;
  if (!task || typeof task !== "object") throw new Error("Task must be an object.");
  if (typeof task.id !== "string" || !task.id.trim()) throw new Error("Task id is required.");
  if (typeof task.title !== "string" || !task.title.trim()) throw new Error(`Task ${task.id} needs a title.`);
  if (typeof task.icon !== "string" || !task.icon.trim()) throw new Error(`Task ${task.id} needs an icon.`);
  if (!["discipline", "reward", "recovery", "review", "pause"].includes(task.kind)) throw new Error(`Task ${task.id} has an invalid kind.`);
  if (!["Body", "Food", "Focus", "Dopa", "Recovery", "System"].includes(task.category)) throw new Error(`Task ${task.id} has an invalid category.`);
  if (!["cyan", "mint", "gold", "violet", "rose", "blue", "amber", "silver"].includes(task.accent)) throw new Error(`Task ${task.id} has an invalid accent.`);
  if (typeof task.tokenCost !== "number" || typeof task.tokenEarn !== "number") throw new Error(`Task ${task.id} has invalid token values.`);
  if (!Array.isArray(task.tiers) || task.tiers.length !== 3) throw new Error(`Task ${task.id} must include exactly three tiers.`);
  task.tiers.forEach(validateTier);
  return task;
}

function validateSnapshot(input: unknown): PlannerSnapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid plan file.");
  const snapshot = input as Partial<PlannerSnapshot>;
  if (!ACCEPTED_SCHEMA_VERSIONS.has(Number(snapshot.schemaVersion))) throw new Error("Unsupported plan version.");
  if (!snapshot.tasks || typeof snapshot.tasks !== "object") throw new Error("Plan is missing actions.");
  if (!Array.isArray(snapshot.blocks)) throw new Error("Plan is missing blocks.");
  if (!snapshot.player || !snapshot.week) throw new Error("Plan is missing state.");
  if (!isDayKey(snapshot.selectedDay)) throw new Error("Plan has an invalid selected day.");
  Object.values(snapshot.tasks).forEach(validateTask);

  for (const block of snapshot.blocks as ScheduledBlock[]) {
    if (!block.id || !block.taskId || !isDayKey(block.day)) throw new Error("Plan contains an invalid block.");
    if (!snapshot.tasks[block.taskId] && !taskTemplates[block.taskId]) throw new Error(`Block references missing action: ${block.taskId}`);
  }

  return {
    ...(snapshot as PlannerSnapshot),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tasks: { ...taskTemplates, ...(snapshot.tasks as Record<string, HabitTask>) },
    blocks: normalizeOrders(snapshot.blocks as ScheduledBlock[]),
    week: {
      mode: snapshot.week.mode ?? "draft",
      sealedAt: snapshot.week.sealedAt,
      reviewOpenUntil: snapshot.week.reviewOpenUntil,
      emergencyReviewRequestedAt: snapshot.week.emergencyReviewRequestedAt,
      emergencyReviewUnlockAt: snapshot.week.emergencyReviewUnlockAt
    }
  };
}

function validateActionBankSnapshot(input: unknown): ActionBankSnapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid action bank file.");
  const snapshot = input as Partial<ActionBankSnapshot>;
  if (!ACCEPTED_SCHEMA_VERSIONS.has(Number(snapshot.schemaVersion))) throw new Error("Unsupported action bank version.");
  if (snapshot.kind !== "habit-action-bank") throw new Error("This is not an action bank file.");
  if (!snapshot.tasks || typeof snapshot.tasks !== "object") throw new Error("Action bank is missing tasks.");
  const tasks: Record<string, HabitTask> = {};
  for (const task of Object.values(snapshot.tasks)) {
    const validated = validateTask(task);
    tasks[validated.id] = validated;
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    kind: "habit-action-bank",
    exportedAt: new Date().toISOString(),
    tasks
  };
}

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState();
    const parsed = JSON.parse(raw) as PlannerState;
    if (!ACCEPTED_SCHEMA_VERSIONS.has(Number(parsed.schemaVersion))) return baseState();

    const tasks = { ...taskTemplates, ...(parsed.tasks ?? {}) };
    Object.values(tasks).forEach(validateTask);

    return {
      ...baseState(),
      ...parsed,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tasks,
      blocks: normalizeOrders(parsed.blocks ?? []),
      week: {
        mode: parsed.week?.mode ?? "draft",
        sealedAt: parsed.week?.sealedAt,
        reviewOpenUntil: parsed.week?.reviewOpenUntil,
        emergencyReviewRequestedAt: parsed.week?.emergencyReviewRequestedAt,
        emergencyReviewUnlockAt: parsed.week?.emergencyReviewUnlockAt
      }
    };
  } catch {
    return baseState("Stored plan was invalid and has been reset.");
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
  return !canEditPlan(state.week);
}

function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, activeView: action.view };

    case "SET_DAY":
      return { ...state, selectedDay: action.day };

    case "ADD_TEMPLATE": {
      if (editBlocked(state)) return { ...state, toast: "Plan is sealed. Open a Review window before editing." };
      const task = state.tasks[action.taskId];
      if (!task) return { ...state, toast: "Action not found." };
      const block = makeBlock(task, action.target.day, nextOrder(state.blocks, action.target.day), state.week.mode !== "draft");
      const blocks = insertBlock(state.blocks, block, action.target);
      return { ...state, blocks, selectedDay: action.target.day };
    }

    case "MOVE_BLOCK": {
      if (editBlocked(state)) return { ...state, toast: "Plan is sealed. Open a Review window before editing." };
      const moving = state.blocks.find((block) => block.id === action.blockId);
      if (!moving) return { ...state, toast: "Block not found." };
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
      const blocks = state.blocks.map((block) => {
        if (block.id !== action.blockId) return block;
        const tier: 1 | 2 | 3 = block.tier === 1 ? 2 : block.tier === 2 ? 3 : 1;
        return { ...block, tier };
      });
      return { ...state, blocks };
    }

    case "MARK_DONE": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return { ...state, toast: "Block not found." };
      const task = state.tasks[block.taskId];
      if (!task) return { ...state, toast: "Action not found." };
      const tier = getTier(task, block.tier);
      const wasAlreadyDone = block.status === "done";
      const blocks = state.blocks.map((candidate) =>
        candidate.id === action.blockId ? { ...candidate, status: "done" as const } : candidate
      );
      return {
        ...state,
        blocks,
        player: wasAlreadyDone
          ? state.player
          : {
              ...state.player,
              xp: state.player.xp + tier.xp,
              tokens: Math.max(0, state.player.tokens + task.tokenEarn - (task.kind === "reward" ? task.tokenCost : 0)),
              streakState: task.kind === "recovery" ? "healthy" : state.player.streakState
            }
      };
    }

    case "REPORT_MISSED": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return { ...state, toast: "Block not found." };

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
      if (!pause) return { ...state, toast: "Pause block not found." };
      const task = state.tasks[pause.taskId];
      if (task?.kind !== "pause") return { ...state, toast: "This block is not a Pause block." };

      const blocks = state.blocks.map((block) => {
        if (block.id === pause.id) return { ...block, status: "done" as const, pauseAppliedAt: nowIso() };
        if (block.day === pause.day && block.order > pause.order && block.status === "planned") {
          return { ...block, status: "paused" as const };
        }
        return block;
      });
      return { ...state, blocks, toast: "Rest of day paused." };
    }

    case "SEAL": {
      const report = calculateEquilibrium(state.blocks, state.tasks);
      if (!canSealWeek(report, state.week)) return { ...state, toast: report.sealDisabledReason ?? "Cannot seal yet." };
      return {
        ...state,
        week: { mode: "sealed", sealedAt: nowIso() },
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
      if (state.week.mode !== "sealed") return { ...state, toast: "Seal the week before requesting an emergency Review Gate." };
      const unlock = new Date(Date.now() + REVIEW_DELAY_MS).toISOString();
      return {
        ...state,
        week: {
          mode: "reviewPending",
          sealedAt: state.week.sealedAt,
          emergencyReviewRequestedAt: nowIso(),
          emergencyReviewUnlockAt: unlock
        },
        toast: "Review Gate requested."
      };
    }

    case "OPEN_EMERGENCY_REVIEW": {
      if (state.week.mode !== "reviewPending" || !state.week.emergencyReviewUnlockAt) {
        return { ...state, toast: "No Review Gate is pending." };
      }
      if (Date.now() < new Date(state.week.emergencyReviewUnlockAt).getTime()) {
        return { ...state, toast: `Review Gate opens in ${countdownText(state.week.emergencyReviewUnlockAt)}.` };
      }
      return {
        ...state,
        week: {
          mode: "reviewOpen",
          sealedAt: state.week.sealedAt,
          reviewOpenUntil: new Date(Date.now() + REVIEW_WINDOW_MS).toISOString()
        },
        toast: "Review window open. Edit, then reseal."
      };
    }

    case "OPEN_REVIEW": {
      const block = state.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return { ...state, toast: "Review block not found." };
      const task = state.tasks[block.taskId];
      if (task?.kind !== "review") return { ...state, toast: "This block is not a Review block." };
      if (!block.reviewUnlockAt || Date.now() < new Date(block.reviewUnlockAt).getTime()) {
        return { ...state, toast: `Review opens in ${countdownText(block.reviewUnlockAt)}.` };
      }
      return {
        ...state,
        week: {
          mode: "reviewOpen",
          sealedAt: state.week.sealedAt,
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
        if (task) blocks.push(makeBlock(task, day, nextOrder(blocks, day), false));
      }
      return { ...state, blocks: normalizeOrders(blocks), selectedDay: "mon", toast: "Starter week added." };
    }

    case "RESET_PLAN":
      return baseState("Plan reset.");

    case "IMPORT":
      return {
        ...action.snapshot,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        activeView: "plan",
        tasks: { ...taskTemplates, ...action.snapshot.tasks },
        blocks: normalizeOrders(action.snapshot.blocks),
        toast: "Plan imported."
      };

    case "IMPORT_ACTION_BANK":
      return {
        ...state,
        tasks: { ...state.tasks, ...action.snapshot.tasks },
        toast: `Action bank imported (${Object.keys(action.snapshot.tasks).length}).`
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
  makeActionBankSnapshot: () => ActionBankSnapshot;
  importFile: (file: File) => Promise<void>;
  importActionBankFile: (file: File) => Promise<void>;
  exportPlan: () => void;
  exportActionBank: () => void;
  exportActionBankTemplate: () => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    const serializable: PlannerState = { ...state, toast: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: "TOAST", toast: undefined }), 2600);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  const report = useMemo(() => calculateEquilibrium(state.blocks, state.tasks), [state.blocks, state.tasks]);
  const canEdit = canEditPlan(state.week);

  const makeSnapshot = useCallback((): PlannerSnapshot => ({
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    toast: undefined
  }), [state]);

  const makeActionBankSnapshot = useCallback((): ActionBankSnapshot => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    kind: "habit-action-bank",
    exportedAt: new Date().toISOString(),
    tasks: state.tasks
  }), [state.tasks]);

  const importFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      dispatch({ type: "IMPORT", snapshot: validateSnapshot(parsed) });
    } catch (error) {
      dispatch({ type: "TOAST", toast: error instanceof Error ? error.message : "Plan import failed." });
    }
  }, []);

  const importActionBankFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      dispatch({ type: "IMPORT_ACTION_BANK", snapshot: validateActionBankSnapshot(parsed) });
    } catch (error) {
      dispatch({ type: "TOAST", toast: error instanceof Error ? error.message : "Action bank import failed." });
    }
  }, []);

  const exportPlan = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`habit-plan-${stamp}.json`, makeSnapshot());
    dispatch({ type: "TOAST", toast: "Plan exported." });
  }, [makeSnapshot]);

  const exportActionBank = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`habit-action-bank-${stamp}.json`, makeActionBankSnapshot());
    dispatch({ type: "TOAST", toast: "Action bank exported." });
  }, [makeActionBankSnapshot]);

  const exportActionBankTemplate = useCallback(() => {
    const template: ActionBankSnapshot = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      kind: "habit-action-bank",
      exportedAt: new Date().toISOString(),
      tasks: {
        example_custom_action: {
          id: "example_custom_action",
          title: "Example Custom Action",
          icon: "✧",
          kind: "discipline",
          category: "Focus",
          tokenCost: 0,
          tokenEarn: 1,
          accent: "cyan",
          tiers: [
            { level: 1, label: "Minimum version", minutes: 5, xp: 10, tension: 4, relief: 0 },
            { level: 2, label: "Standard version", minutes: 20, xp: 30, tension: 16, relief: 0 },
            { level: 3, label: "Deep version", minutes: 45, xp: 60, tension: 34, relief: 0 }
          ]
        }
      }
    };
    downloadJson("habit-action-bank-template.json", template);
    dispatch({ type: "TOAST", toast: "Template downloaded." });
  }, []);

  const value = useMemo(
    () => ({ state, report, dispatch, canEdit, makeSnapshot, makeActionBankSnapshot, importFile, importActionBankFile, exportPlan, exportActionBank, exportActionBankTemplate }),
    [state, report, canEdit, makeSnapshot, makeActionBankSnapshot, importFile, importActionBankFile, exportPlan, exportActionBank, exportActionBankTemplate]
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside PlannerProvider.");
  return value;
}
