import { HabitTask, PlayerState, WeekState } from "../domain/types";

export const taskTemplates: Record<string, HabitTask> = {
  pushups: {
    id: "pushups",
    title: "Push-ups",
    icon: "⚔",
    kind: "discipline",
    category: "Body",
    tokenCost: 0,
    tokenEarn: 1,
    accent: "cyan",
    tiers: [
      { level: 1, label: "10 min stretch", minutes: 10, xp: 18, tension: 10, relief: 0 },
      { level: 2, label: "Push-ups 2x8", minutes: 14, xp: 32, tension: 18, relief: 0 },
      { level: 3, label: "Push-ups 3x8", minutes: 18, xp: 48, tension: 26, relief: 0 }
    ]
  },
  walk: {
    id: "walk",
    title: "Walk",
    icon: "◐",
    kind: "discipline",
    category: "Body",
    tokenCost: 0,
    tokenEarn: 1,
    accent: "mint",
    tiers: [
      { level: 1, label: "5 min outside", minutes: 5, xp: 16, tension: 5, relief: 2 },
      { level: 2, label: "12 min walk", minutes: 12, xp: 26, tension: 10, relief: 4 },
      { level: 3, label: "20 min walk", minutes: 20, xp: 36, tension: 16, relief: 8 }
    ]
  },
  tuna: {
    id: "tuna",
    title: "Tuna Bowl",
    icon: "◇",
    kind: "discipline",
    category: "Food",
    tokenCost: 0,
    tokenEarn: 1,
    accent: "gold",
    tiers: [
      { level: 1, label: "Protein snack", minutes: 5, xp: 15, tension: 6, relief: 2 },
      { level: 2, label: "Tuna Bowl", minutes: 20, xp: 50, tension: 16, relief: 3 },
      { level: 3, label: "Cook full meal", minutes: 35, xp: 70, tension: 24, relief: 5 }
    ]
  },
  focus: {
    id: "focus",
    title: "Deep Focus",
    icon: "◆",
    kind: "discipline",
    category: "Focus",
    tokenCost: 0,
    tokenEarn: 1,
    accent: "blue",
    tiers: [
      { level: 1, label: "Open project", minutes: 8, xp: 16, tension: 8, relief: 0 },
      { level: 2, label: "25 min focus", minutes: 25, xp: 38, tension: 24, relief: 0 },
      { level: 3, label: "50 min focus", minutes: 50, xp: 70, tension: 42, relief: 0 }
    ]
  },
  game: {
    id: "game",
    title: "Videogames",
    icon: "✦",
    kind: "reward",
    category: "Dopa",
    tokenCost: 2,
    tokenEarn: 0,
    accent: "violet",
    tiers: [
      { level: 1, label: "15 min game", minutes: 15, xp: 0, tension: 0, relief: 18 },
      { level: 2, label: "30 min game", minutes: 30, xp: 0, tension: 0, relief: 32 },
      { level: 3, label: "60 min game", minutes: 60, xp: 0, tension: 0, relief: 52 }
    ]
  },
  pizza: {
    id: "pizza",
    title: "Pizza Night",
    icon: "✺",
    kind: "reward",
    category: "Dopa",
    tokenCost: 3,
    tokenEarn: 0,
    accent: "rose",
    tiers: [
      { level: 1, label: "Small treat", minutes: 15, xp: 0, tension: 0, relief: 20 },
      { level: 2, label: "Pizza meal", minutes: 45, xp: 0, tension: 0, relief: 45 },
      { level: 3, label: "Pizza + movie", minutes: 100, xp: 0, tension: 0, relief: 70 }
    ]
  },
  recovery: {
    id: "recovery",
    title: "Recovery",
    icon: "⬖",
    kind: "recovery",
    category: "Recovery",
    tokenCost: 0,
    tokenEarn: 0,
    accent: "amber",
    tiers: [
      { level: 1, label: "Water + breathe", minutes: 15, xp: 12, tension: 0, relief: 12 },
      { level: 2, label: "Room reset", minutes: 20, xp: 18, tension: 2, relief: 18 },
      { level: 3, label: "Full reset ritual", minutes: 30, xp: 28, tension: 4, relief: 28 }
    ]
  },
  review: {
    id: "review",
    title: "Review Window",
    icon: "◈",
    kind: "review",
    category: "System",
    tokenCost: 0,
    tokenEarn: 0,
    accent: "silver",
    tiers: [
      { level: 1, label: "15 min edit window", minutes: 15, xp: 0, tension: 0, relief: 8 },
      { level: 2, label: "30 min review", minutes: 30, xp: 0, tension: 0, relief: 10 },
      { level: 3, label: "45 min reset", minutes: 45, xp: 0, tension: 0, relief: 12 }
    ]
  },
  pause: {
    id: "pause",
    title: "Pause Day",
    icon: "Ⅱ",
    kind: "pause",
    category: "System",
    tokenCost: 0,
    tokenEarn: 0,
    accent: "silver",
    tiers: [
      { level: 1, label: "Pause remaining day", minutes: 0, xp: 0, tension: 0, relief: 20 },
      { level: 2, label: "Protect evening", minutes: 0, xp: 0, tension: 0, relief: 30 },
      { level: 3, label: "Full stop", minutes: 0, xp: 0, tension: 0, relief: 40 }
    ]
  }
};

export const initialPlayer: PlayerState = {
  level: 5,
  xp: 1400,
  tokens: 4,
  streakDays: 12,
  streakState: "healthy"
};

export const initialWeek: WeekState = {
  mode: "draft"
};
