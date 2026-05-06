export type TaskKind = "discipline" | "reward" | "recovery";
export type TaskCategory = "Body" | "Food" | "Focus" | "Dopa" | "Recovery";
export type StreakState = "healthy" | "fractured";
export type WeekMode = "draft" | "sealed" | "reviewPending";
export type PlanningLens = "blocks" | "time";
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Tier { level: 1 | 2 | 3; label: string; minutes: number; xp: number; tension: number; relief: number; }
export interface HabitTask { id: string; title: string; icon: string; kind: TaskKind; category: TaskCategory; tokenCost: number; tokenEarn: number; accent: string; tiers: Tier[]; }
export type ScheduledStatus = "scheduled" | "done" | "skipped" | "recoveryDue";
export interface ScheduledBlock { id: string; taskId: string; day: DayKey; order: number; at?: string; tier: 1 | 2 | 3; status: ScheduledStatus; sealed: boolean; injected?: boolean; note?: string; }
export interface PlayerState { level: number; xp: number; tokens: number; streakDays: number; streakState: StreakState; }
export interface WeekState { mode: WeekMode; sealCompletedAt?: string; reviewRequestedAt?: string; reviewUnlocksAt?: string; sosUntil?: string; }
export interface EquilibriumReport { tension: number; relief: number; netTension: number; plannedTokenDelta: number; status: "balanced" | "thinIce" | "redZone"; sealDisabledReason?: string; }
export interface PlannerSnapshot { schemaVersion: 4; exportedAt: string; tasks: Record<string, HabitTask>; blocks: ScheduledBlock[]; player: PlayerState; week: WeekState; selectedDay: DayKey; planningLens: PlanningLens; }
