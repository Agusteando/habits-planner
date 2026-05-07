import iconSprite from "./fantasy/icons-sprite.svg";
import effectsSprite from "./fantasy/effects-sprites.svg";
import brandMark from "./fantasy/brand-mark.svg";
import brandOptions from "./fantasy/brand-options.svg";
import panelOrnament from "./fantasy/panel-ornament.svg";
import panelDark from "./fantasy/surfaces/panel-dark.webp";
import panelLight from "./fantasy/surfaces/panel-light.webp";
import ambientMist from "./fantasy/surfaces/ambient-mist.webp";
import borderMetal from "./fantasy/surfaces/border-metal.webp";

export type SpriteSpec = { x: number; y: number };

export const ICON_GRID = { columns: 6, rows: 4 } as const;

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

export const visualAssets = {
  brandMark,
  brandOptions,
  iconSprite,
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
