export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TaskKind = "discipline" | "reward" | "recovery" | "review" | "pause";
export type TaskCategory = "Body" | "Food" | "Focus" | "Dopa" | "Recovery" | "System";
export type WeekMode = "draft" | "sealed" | "reviewOpen" | "reviewPending";
export type StreakState = "healthy" | "fractured";
export type BlockStatus = "planned" | "done" | "missed" | "paused" | "recoveryDue";

export interface Tier {
  level: 1 | 2 | 3;
  label: string;
  minutes: number;
  xp: number;
  tension: number;
  relief: number;
}

export interface HabitTask {
  id: string;
  title: string;
  icon: string;
  kind: TaskKind;
  category: TaskCategory;
  tokenCost: number;
  tokenEarn: number;
  accent: "cyan" | "mint" | "gold" | "violet" | "rose" | "blue" | "amber" | "silver";
  tiers: Tier[];
}

export interface ScheduledBlock {
  id: string;
  taskId: string;
  day: DayKey;
  order: number;
  tier: 1 | 2 | 3;
  status: BlockStatus;
  sealed: boolean;
  createdAt: string;
  reviewUnlockAt?: string;
  reviewOpenedAt?: string;
  pauseAppliedAt?: string;
  injected?: boolean;
}

export interface PlayerState {
  level: number;
  xp: number;
  tokens: number;
  streakDays: number;
  streakState: StreakState;
}

export interface WeekState {
  mode: WeekMode;
  sealedAt?: string;
  reviewOpenUntil?: string;
  emergencyReviewRequestedAt?: string;
  emergencyReviewUnlockAt?: string;
}

export interface EquilibriumReport {
  tension: number;
  relief: number;
  netTension: number;
  tokenDelta: number;
  status: "balanced" | "thinIce" | "redZone";
  sealDisabledReason?: string;
}

export interface PlannerState {
  schemaVersion: number;
  activeView: "plan" | "today" | "vault";
  tasks: Record<string, HabitTask>;
  blocks: ScheduledBlock[];
  player: PlayerState;
  week: WeekState;
  selectedDay: DayKey;
  toast?: string;
}

export interface PlannerSnapshot extends PlannerState {
  exportedAt: string;
}

export interface ActionBankSnapshot {
  schemaVersion: number;
  kind: "habit-action-bank";
  exportedAt: string;
  tasks: Record<string, HabitTask>;
}
