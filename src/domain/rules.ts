import { DayKey, EquilibriumReport, HabitTask, ScheduledBlock, WeekState } from "./types";

export const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const HOURS = ["06", "08", "10", "12", "14", "16", "18", "20", "22"];
const RED_ZONE_NET_TENSION = 80;
const THIN_ICE_NET_TENSION = 52;

export function getTier(task: HabitTask, level: 1 | 2 | 3) { return task.tiers.find((tier) => tier.level === level) ?? task.tiers[0]; }
export function getDayBlocks(blocks: ScheduledBlock[], day: DayKey) { return blocks.filter((block) => block.day === day).sort((a, b) => a.order - b.order || (a.at ?? "").localeCompare(b.at ?? "")); }
export function normalizeOrders(blocks: ScheduledBlock[]) { const out: ScheduledBlock[] = []; for (const day of DAYS) getDayBlocks(blocks, day).forEach((block, index) => out.push({ ...block, order: index + 1 })); return out; }
export function isDayKey(input: unknown): input is DayKey { return typeof input === "string" && (DAYS as string[]).includes(input); }

export function calculateEquilibrium(blocks: ScheduledBlock[], tasks: Record<string, HabitTask>): EquilibriumReport {
  let tension = 0, relief = 0, plannedTokenDelta = 0;
  for (const block of blocks) {
    if (block.status === "skipped") continue;
    const task = tasks[block.taskId];
    if (!task) continue;
    const tier = getTier(task, block.tier);
    tension += tier.tension;
    relief += tier.relief;
    plannedTokenDelta += task.tokenEarn;
    plannedTokenDelta -= task.tokenCost;
  }
  const netTension = tension - relief;
  const status = netTension >= RED_ZONE_NET_TENSION ? "redZone" : netTension >= THIN_ICE_NET_TENSION ? "thinIce" : "balanced";
  return { tension, relief, netTension, plannedTokenDelta, status, sealDisabledReason: status === "redZone" ? "Add relief before sealing." : plannedTokenDelta < 0 ? "Earn tokens or remove a reward." : undefined };
}
export function canSealWeek(report: EquilibriumReport, week: WeekState) { return week.mode === "draft" && report.status !== "redZone" && report.plannedTokenDelta >= 0; }
export function canEditSealedWeek(week: WeekState, now = new Date()) { if (week.mode === "draft") return true; if (week.mode !== "reviewPending" || !week.reviewUnlocksAt) return false; return now.getTime() >= new Date(week.reviewUnlocksAt).getTime(); }
export function isSosLocked(week: WeekState, now = new Date()) { return Boolean(week.sosUntil && now.getTime() < new Date(week.sosUntil).getTime()); }
export function dayLabel(day: DayKey) { return ({ mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" } as const)[day]; }
export function shortDayLabel(day: DayKey) { return day.toUpperCase(); }
