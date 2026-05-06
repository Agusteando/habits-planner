import { DayKey, EquilibriumReport, HabitTask, ScheduledBlock, WeekState } from "./types";

export const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const RED_ZONE_NET_TENSION = 80;
export const THIN_ICE_NET_TENSION = 52;
export const REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_WINDOW_MS = 45 * 60 * 1000;
export const SOS_LOCK_MS = 24 * 60 * 60 * 1000;

export function id(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getTier(task: HabitTask, level: 1 | 2 | 3) {
  return task.tiers.find((tier) => tier.level === level) ?? task.tiers[0];
}

export function dayLabel(day: DayKey) {
  return {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  }[day];
}

export function shortDayLabel(day: DayKey) {
  return day.toUpperCase();
}

export function getDayBlocks(blocks: ScheduledBlock[], day: DayKey) {
  return blocks
    .filter((block) => block.day === day)
    .sort((a, b) => a.order - b.order);
}

export function normalizeOrders(blocks: ScheduledBlock[]) {
  return DAYS.flatMap((day) =>
    getDayBlocks(blocks, day).map((block, index) => ({ ...block, order: index + 1 }))
  );
}

export function nextOrder(blocks: ScheduledBlock[], day: DayKey) {
  const dayBlocks = blocks.filter((block) => block.day === day);
  return dayBlocks.length ? Math.max(...dayBlocks.map((block) => block.order)) + 1 : 1;
}

export function calculateEquilibrium(blocks: ScheduledBlock[], tasks: Record<string, HabitTask>): EquilibriumReport {
  let tension = 0;
  let relief = 0;
  let tokenDelta = 0;

  for (const block of blocks) {
    if (block.status === "missed" || block.status === "paused") continue;
    const task = tasks[block.taskId];
    if (!task) continue;

    const tier = getTier(task, block.tier);
    tension += tier.tension;
    relief += tier.relief;
    tokenDelta += task.tokenEarn;
    tokenDelta -= task.tokenCost;
  }

  const netTension = tension - relief;
  const status =
    netTension >= RED_ZONE_NET_TENSION
      ? "redZone"
      : netTension >= THIN_ICE_NET_TENSION
        ? "thinIce"
        : "balanced";

  return {
    tension,
    relief,
    netTension,
    tokenDelta,
    status,
    sealDisabledReason:
      status === "redZone"
        ? "Add relief before sealing."
        : tokenDelta < 0
          ? "Rewards exceed earned tokens."
          : undefined
  };
}

export function canSealWeek(report: EquilibriumReport, week: WeekState) {
  return (week.mode === "draft" || week.mode === "reviewOpen") && report.status !== "redZone" && report.tokenDelta >= 0;
}

export function canEditPlan(week: WeekState, at = new Date()) {
  if (week.mode === "draft") return true;
  if (week.mode === "reviewOpen" && week.reviewOpenUntil) {
    return at.getTime() < new Date(week.reviewOpenUntil).getTime();
  }
  return false;
}

export function isReviewReady(block: ScheduledBlock, at = new Date()) {
  if (!block.reviewUnlockAt) return false;
  return at.getTime() >= new Date(block.reviewUnlockAt).getTime();
}

export function countdownText(targetIso?: string, at = new Date()) {
  if (!targetIso) return "";
  const ms = new Date(targetIso).getTime() - at.getTime();
  if (ms <= 0) return "Ready";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function blocksAfterPause(blocks: ScheduledBlock[], pause: ScheduledBlock) {
  return blocks.filter((block) => block.day === pause.day && block.order > pause.order && block.status === "planned");
}
