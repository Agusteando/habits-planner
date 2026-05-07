import iconSprite from "./fantasy/icons-sprite.svg";
import itemSprite from "./fantasy/item-sprite.svg";
import effectsSprite from "./fantasy/effects-sprites.svg";
import brandMark from "./fantasy/brand-mark.svg";
import brandOptions from "./fantasy/brand-options.svg";
import panelOrnament from "./fantasy/panel-ornament.svg";
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
    Focus: { x: 2, y: 0 },
    Dopa: { x: 3, y: 0 },
    Recovery: { x: 4, y: 0 },
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
    tuna: { x: 0, y: 1, sheet: "items" },
    focus: { x: 2, y: 2, sheet: "items" },
    game: { x: 3, y: 1, sheet: "items" },
    pizza: { x: 1, y: 1, sheet: "items" },
    recovery: { x: 4, y: 0, sheet: "items" },
    review: { x: 6, y: 2, sheet: "items" },
    pause: { x: 5, y: 2, sheet: "items" },
  },
  category: {
    Body: { x: 3, y: 2, sheet: "items" },
    Food: { x: 0, y: 1, sheet: "items" },
    Focus: { x: 2, y: 2, sheet: "items" },
    Dopa: { x: 3, y: 1, sheet: "items" },
    Recovery: { x: 4, y: 0, sheet: "items" },
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
  brandMark,
  brandOptions,
  iconSprite,
  itemSprite,
  effectsSprite,
  panelOrnament,
  surfaces: {
    sourceAtlasPath: "src/assets/fantasy/surfaces/material-atlas.png",
    panelDark,
    panelLight,
    ambientMist,
    borderMetal,
  },
} as const;
