import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { seedBlocks, seedPlayer, seedTasks, seedWeek } from "../data/sampleData";
import { calculateEquilibrium, canEditSealedWeek, canSealWeek, getTier, isDayKey, normalizeOrders } from "../domain/rules";
import { DayKey, EquilibriumReport, HabitTask, PlannerSnapshot, PlanningLens, PlayerState, ScheduledBlock, WeekState } from "../domain/types";

const STORAGE_KEY = "habit-planner-rpg-v4";
type View = "today" | "plan" | "vault";
interface StoredState { tasks: Record<string, HabitTask>; blocks: ScheduledBlock[]; player: PlayerState; week: WeekState; selectedDay: DayKey; planningLens: PlanningLens; }
interface DropOptions { beforeBlockId?: string; at?: string; }
interface PlannerValue extends StoredState {
  activeView: View; inventoryOpen: boolean; importMessage: string | null; report: EquilibriumReport;
  setActiveView: (view: View) => void; setSelectedDay: (day: DayKey) => void; setPlanningLens: (lens: PlanningLens) => void; setInventoryOpen: (open: boolean) => void; clearImportMessage: () => void;
  addTaskToDay: (taskId: string, day: string, options?: DropOptions) => void; moveBlock: (blockId: string, day: string, options?: DropOptions) => void; deleteBlock: (blockId: string) => void; completeBlock: (blockId: string) => void; skipBlock: (blockId: string) => void; cycleTier: (blockId: string) => void; triggerSos: () => void; sealWeek: () => void; requestReviewGate: () => void; makeSnapshot: () => PlannerSnapshot; importSnapshot: (input: unknown) => void;
}
const PlannerContext = createContext<PlannerValue | null>(null);
const uuid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
function defaultStored(): StoredState { return { tasks: seedTasks, blocks: normalizeOrders(seedBlocks), player: seedPlayer, week: seedWeek, selectedDay: "tue", planningLens: "blocks" }; }
function readStored(): StoredState { try { const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("habit-planner-rpg-v2") ?? localStorage.getItem("habit-planner-rpg-v3"); if (!raw) return defaultStored(); const parsed = JSON.parse(raw); const source = parsed?.state ?? parsed; const tasks = { ...seedTasks, ...(source.tasks ?? {}) }; const blocks = normalizeOrders(((source.blocks ?? seedBlocks) as ScheduledBlock[]).map((b, i) => ({...b, order: b.order ?? i + 1}))); return { tasks, blocks, player: source.player ?? seedPlayer, week: source.week ?? seedWeek, selectedDay: isDayKey(source.selectedDay) ? source.selectedDay : "tue", planningLens: source.planningLens === "time" ? "time" : "blocks" }; } catch { return defaultStored(); } }
function validateSnapshot(input: unknown): PlannerSnapshot { const s = input as Partial<PlannerSnapshot>; if (!s || typeof s !== "object" || s.schemaVersion !== 4) throw new Error("Unsupported plan file."); if (!s.tasks || !Array.isArray(s.blocks) || !s.player || !s.week) throw new Error("Plan file is incomplete."); for (const block of s.blocks) { if (!block.id || !block.taskId || !isDayKey(block.day) || !s.tasks[block.taskId]) throw new Error("Plan contains an invalid block."); } return { ...(s as PlannerSnapshot), selectedDay: isDayKey(s.selectedDay) ? s.selectedDay : "tue", planningLens: s.planningLens === "time" ? "time" : "blocks" }; }
function nextOrder(blocks: ScheduledBlock[], day: DayKey) { const same = blocks.filter((b) => b.day === day); return same.length ? Math.max(...same.map((b) => b.order)) + 1 : 1; }
function defaultTier(task: HabitTask): 1 | 2 | 3 { return task.kind === "reward" ? 2 : 3; }
function insertBefore(blocks: ScheduledBlock[], incoming: ScheduledBlock, beforeBlockId?: string) { if (!beforeBlockId) return normalizeOrders([...blocks, incoming]); const before = blocks.find((b) => b.id === beforeBlockId); if (!before) return normalizeOrders([...blocks, incoming]); const rest = blocks.filter((b) => b.day !== before.day); const same = blocks.filter((b) => b.day === before.day).sort((a,b)=>a.order-b.order); const rebuilt: ScheduledBlock[] = [...rest]; for (const block of same) { if (block.id === beforeBlockId) rebuilt.push({ ...incoming, day: before.day, order: block.order - 0.1 }); rebuilt.push(block); } return normalizeOrders(rebuilt); }

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredState>(() => readStored());
  const [activeView, setActiveView] = useState<View>("today");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const report = useMemo(() => calculateEquilibrium(stored.blocks, stored.tasks), [stored.blocks, stored.tasks]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch { /* safe in private mode */ } }, [stored]);
  function patch(updater: (state: StoredState) => StoredState) { setStored((state) => updater(state)); }
  const value: PlannerValue = {
    ...stored, activeView, inventoryOpen, importMessage, report, setActiveView, setInventoryOpen, clearImportMessage: () => setImportMessage(null),
    setSelectedDay: (selectedDay) => patch((s) => ({...s, selectedDay})),
    setPlanningLens: (planningLens) => patch((s) => ({...s, planningLens})),
    addTaskToDay: (taskId, day, options) => patch((s) => { if (!isDayKey(day) || !canEditSealedWeek(s.week)) return s; const task = s.tasks[taskId]; if (!task) return s; const incoming: ScheduledBlock = { id: uuid(), taskId, day, order: nextOrder(s.blocks, day), at: options?.at, tier: defaultTier(task), status: "scheduled", sealed: s.week.mode !== "draft" }; return { ...s, selectedDay: day, blocks: options?.beforeBlockId ? insertBefore(s.blocks, incoming, options.beforeBlockId) : normalizeOrders([...s.blocks, incoming]) }; }),
    moveBlock: (blockId, day, options) => patch((s) => { if (!isDayKey(day) || !canEditSealedWeek(s.week)) return s; const moving = s.blocks.find((b) => b.id === blockId); if (!moving) return s; const rest = s.blocks.filter((b) => b.id !== blockId); const moved = { ...moving, day, at: options?.at ?? moving.at, order: options?.beforeBlockId ? 0 : nextOrder(rest, day) }; return { ...s, selectedDay: day, blocks: options?.beforeBlockId ? insertBefore(rest, moved, options.beforeBlockId) : normalizeOrders([...rest, moved]) }; }),
    deleteBlock: (blockId) => patch((s) => canEditSealedWeek(s.week) ? { ...s, blocks: normalizeOrders(s.blocks.filter((b) => b.id !== blockId)) } : s),
    completeBlock: (blockId) => patch((s) => { const block = s.blocks.find((b) => b.id === blockId); if (!block) return s; const task = s.tasks[block.taskId]; if (!task) return s; const tier = getTier(task, block.tier); const blocks = s.blocks.map((b) => b.id === blockId ? { ...b, status: "done" as const } : b); const tokenDelta = task.tokenEarn - (task.kind === "reward" ? task.tokenCost : 0); const player: PlayerState = { ...s.player, xp: s.player.xp + tier.xp, tokens: Math.max(0, s.player.tokens + tokenDelta), streakState: task.kind === "recovery" ? "healthy" : s.player.streakState }; return { ...s, blocks, player }; }),
    skipBlock: (blockId) => patch((s) => { const block = s.blocks.find((b) => b.id === blockId); if (!block) return s; const recovery: ScheduledBlock = { id: uuid(), taskId: "recovery", day: block.day, order: nextOrder(s.blocks, block.day), tier: 1, status: "recoveryDue", sealed: false, injected: true }; const blocks = normalizeOrders([...s.blocks.map((b) => b.id === blockId ? { ...b, status: "skipped" as const } : b), recovery]); return { ...s, blocks, player: { ...s.player, streakState: "fractured" } }; }),
    cycleTier: (blockId) => patch((s) => { if (!canEditSealedWeek(s.week)) return s; const locked = Boolean(s.week.sosUntil && Date.now() < new Date(s.week.sosUntil).getTime()); return { ...s, blocks: s.blocks.map((b) => { if (b.id !== blockId) return b; if (locked && b.tier === 1) return b; return { ...b, tier: b.tier === 1 ? 2 : b.tier === 2 ? 3 : 1 }; }) }; }),
    triggerSos: () => patch((s) => ({ ...s, week: { ...s.week, sosUntil: new Date(Date.now() + 86400000).toISOString() }, blocks: s.blocks.map((b) => b.status === "scheduled" || b.status === "recoveryDue" ? { ...b, tier: 1 as const } : b) })),
    sealWeek: () => patch((s) => canSealWeek(calculateEquilibrium(s.blocks, s.tasks), s.week) ? { ...s, week: { ...s.week, mode: "sealed", sealCompletedAt: new Date().toISOString() }, blocks: s.blocks.map((b) => ({ ...b, sealed: true })) } : s),
    requestReviewGate: () => patch((s) => { if (s.week.mode !== "sealed") return s; const now = new Date(); return { ...s, week: { ...s.week, mode: "reviewPending", reviewRequestedAt: now.toISOString(), reviewUnlocksAt: new Date(now.getTime() + 86400000).toISOString() } }; }),
    makeSnapshot: () => ({ schemaVersion: 4, exportedAt: new Date().toISOString(), ...stored }),
    importSnapshot: (input) => { try { const snap = validateSnapshot(input); setStored({ tasks: { ...seedTasks, ...snap.tasks }, blocks: normalizeOrders(snap.blocks), player: snap.player, week: snap.week, selectedDay: snap.selectedDay, planningLens: snap.planningLens }); setImportMessage("Plan imported"); } catch (error) { setImportMessage(error instanceof Error ? error.message : "Import failed"); } }
  };
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}
export function usePlanner() { const ctx = useContext(PlannerContext); if (!ctx) throw new Error("usePlanner must be used within PlannerProvider"); return ctx; }
