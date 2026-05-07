import iconSprite from "./fantasy/icons-sprite.png";
import itemSprite from "./fantasy/item-sprite.png";
import effectsSprite from "./fantasy/effects-sprites.png";
import panelDark from "./fantasy/surfaces/panel-dark.webp";
import panelLight from "./fantasy/surfaces/panel-light.webp";
import ambientMist from "./fantasy/surfaces/ambient-mist.webp";
import borderMetal from "./fantasy/surfaces/border-metal.webp";

export type SpriteSpec = { x: number; y: number; sheet?: "icons" | "items" };

export const ICON_GRID = { columns: 6, rows: 4 } as const;
export const ITEM_GRID = { columns: 8, rows: 4 } as const;

export const iconSprites = {
  category: {
    Body: { x: 0, y: 0 },
    Food: { x: 1, y: 0 },
    Dopamine: { x: 3, y: 0 },
    System: { x: 5, y: 0 },
  },
  kind: {
    discipline: { x: 0, y: 1 },
    reward: { x: 1, y: 1 },
    recovery: { x: 2, y: 1 },
    review: { x: 3, y: 1 },
    pause: { x: 4, y: 1 },
    custom: { x: 5, y: 1 },
  },
  status: {
    planned: { x: 0, y: 2 },
    done: { x: 1, y: 2 },
    missed: { x: 2, y: 2 },
    paused: { x: 3, y: 2 },
    recoveryDue: { x: 4, y: 2 },
    sealed: { x: 5, y: 2 },
  },
  core: {
    xp: { x: 0, y: 3 },
    token: { x: 1, y: 3 },
    streak: { x: 2, y: 3 },
    level: { x: 3, y: 3 },
    beam: { x: 4, y: 3 },
    mark: { x: 5, y: 3 },
  },
} as const;

export const itemSprites = {
  task: {
    pushups: { x: 3, y: 2, sheet: "items" },
    walk: { x: 0, y: 2, sheet: "items" },
    avena_walk: { x: 0, y: 2, sheet: "items" },
    plank: { x: 3, y: 2, sheet: "items" },
    isometrics: { x: 2, y: 2, sheet: "items" },
    rope_jumping: { x: 5, y: 3, sheet: "items" },
    bike_cardio: { x: 0, y: 3, sheet: "items" },
    public_squats: { x: 3, y: 2, sheet: "items" },
    weight_lifting: { x: 3, y: 2, sheet: "items" },
    chest_day: { x: 3, y: 2, sheet: "items" },
    back_day: { x: 3, y: 2, sheet: "items" },
    shoulder_day: { x: 3, y: 2, sheet: "items" },
    bicep_day: { x: 3, y: 2, sheet: "items" },
    tricep_day: { x: 3, y: 2, sheet: "items" },
    forearm_day: { x: 3, y: 2, sheet: "items" },
    core_day: { x: 2, y: 2, sheet: "items" },
    leg_day: { x: 3, y: 2, sheet: "items" },
    quad_day: { x: 3, y: 2, sheet: "items" },
    hamstring_day: { x: 3, y: 2, sheet: "items" },
    glute_day: { x: 3, y: 2, sheet: "items" },
    calf_day: { x: 3, y: 2, sheet: "items" },
    cold_shower: { x: 0, y: 0, sheet: "items" },
    early_bedtime: { x: 7, y: 2, sheet: "items" },
    early_bird: { x: 5, y: 1, sheet: "items" },
    fasting: { x: 7, y: 0, sheet: "items" },
    tuna: { x: 0, y: 1, sheet: "items" },
    boiled_egg: { x: 4, y: 1, sheet: "items" },
    drink_water: { x: 0, y: 0, sheet: "items" },
    bring_lunch: { x: 0, y: 1, sheet: "items" },
    portion_control: { x: 1, y: 1, sheet: "items" },
    skip_oxxo: { x: 7, y: 0, sheet: "items" },
    tidy_room: { x: 6, y: 0, sheet: "items" },
    game: { x: 3, y: 1, sheet: "items" },
    doomscroll: { x: 3, y: 1, sheet: "items" },
    pizza: { x: 1, y: 1, sheet: "items" },
    recovery: { x: 4, y: 0, sheet: "items" },
    review: { x: 6, y: 2, sheet: "items" },
    pause: { x: 5, y: 2, sheet: "items" },
  },
  category: {
    Body: { x: 3, y: 2, sheet: "items" },
    Food: { x: 0, y: 1, sheet: "items" },
    Dopamine: { x: 3, y: 1, sheet: "items" },
    System: { x: 6, y: 2, sheet: "items" },
  },
  kind: {
    discipline: { x: 0, y: 0, sheet: "items" },
    reward: { x: 1, y: 0, sheet: "items" },
    recovery: { x: 4, y: 0, sheet: "items" },
    review: { x: 6, y: 2, sheet: "items" },
    pause: { x: 5, y: 2, sheet: "items" },
    custom: { x: 7, y: 3, sheet: "items" },
  },
  effect: {
    potion: { x: 0, y: 0, sheet: "items" },
    aura: { x: 1, y: 0, sheet: "items" },
    relic: { x: 2, y: 0, sheet: "items" },
    token: { x: 4, y: 1, sheet: "items" },
    streak: { x: 5, y: 1, sheet: "items" },
    cooldown: { x: 7, y: 2, sheet: "items" },
  },
} as const;

export const visualAssets = {
  iconSprite,
  itemSprite,
  effectsSprite,
  surfaces: {
    sourceAtlasPath: "src/assets/fantasy/surfaces/material-atlas.png",
    panelDark,
    panelLight,
    ambientMist,
    borderMetal,
  },
} as const;
