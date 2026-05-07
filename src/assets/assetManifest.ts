import effectsSprite from "./fantasy/effects-sprites.png";
import iconSprite from "./fantasy/icons-sprite.png";
import itemSprite from "./fantasy/item-sprite.png";
import ornamentsSprite from "./fantasy/ornaments-sprite.png";
import plannerMark from "./fantasy/planner-mark.png";
import ambientMist from "./fantasy/surfaces/ambient-mist.webp";
import borderMetal from "./fantasy/surfaces/border-metal.webp";
import panelDark from "./fantasy/surfaces/panel-dark.webp";
import panelLight from "./fantasy/surfaces/panel-light.webp";

export type SpriteSheet = "icons" | "items" | "effects" | "ornaments";
export type SpriteSpec = { x: number; y: number; sheet?: SpriteSheet };

export const ICON_GRID = { columns: 6, rows: 6 } as const;
export const ITEM_GRID = { columns: 8, rows: 8 } as const;
export const EFFECTS_GRID = { columns: 4, rows: 4 } as const;
export const ORNAMENT_GRID = { columns: 4, rows: 4 } as const;

export const spriteGrids = {
  icons: ICON_GRID,
  items: ITEM_GRID,
  effects: EFFECTS_GRID,
  ornaments: ORNAMENT_GRID,
} as const;

export const itemIconPool = {
  muscle_fiber: { x: 0, y: 0, sheet: "items" },
  runner: { x: 1, y: 0, sheet: "items" },
  gold_dumbbell: { x: 2, y: 0, sheet: "items" },
  teal_dumbbell: { x: 3, y: 0, sheet: "items" },
  flexed_muscle: { x: 4, y: 0, sheet: "items" },
  joint: { x: 5, y: 0, sheet: "items" },
  bio_shoe: { x: 6, y: 0, sheet: "items" },
  meditation: { x: 7, y: 0, sheet: "items" },
  water_drop: { x: 0, y: 1, sheet: "items" },
  electrolyte_bottle: { x: 1, y: 1, sheet: "items" },
  energy_vial: { x: 2, y: 1, sheet: "items" },
  blue_crystal: { x: 3, y: 1, sheet: "items" },
  grain_bowl: { x: 4, y: 1, sheet: "items" },
  protein_plate: { x: 5, y: 1, sheet: "items" },
  avocado: { x: 6, y: 1, sheet: "items" },
  apple: { x: 7, y: 1, sheet: "items" },
  glucose_meter: { x: 0, y: 2, sheet: "items" },
  pancreas: { x: 1, y: 2, sheet: "items" },
  molecule_ring: { x: 2, y: 2, sheet: "items" },
  cell_cluster: { x: 3, y: 2, sheet: "items" },
  shaker: { x: 4, y: 2, sheet: "items" },
  protein_scoop: { x: 5, y: 2, sheet: "items" },
  amino_molecule: { x: 6, y: 2, sheet: "items" },
  protein_ribbon: { x: 7, y: 2, sheet: "items" },
  mitochondria: { x: 0, y: 3, sheet: "items" },
  mito_lantern: { x: 1, y: 3, sheet: "items" },
  crystal_cluster: { x: 2, y: 3, sheet: "items" },
  dna_helix: { x: 3, y: 3, sheet: "items" },
  cell_membrane: { x: 4, y: 3, sheet: "items" },
  neuron_spark: { x: 5, y: 3, sheet: "items" },
  heart: { x: 6, y: 3, sheet: "items" },
  heartbeat: { x: 7, y: 3, sheet: "items" },
  lungs: { x: 0, y: 4, sheet: "items" },
  water_molecule: { x: 1, y: 4, sheet: "items" },
  red_blood_cells: { x: 2, y: 4, sheet: "items" },
  bone_badge: { x: 3, y: 4, sheet: "items" },
  molecule_shield: { x: 4, y: 4, sheet: "items" },
  muscle_cross_section: { x: 5, y: 4, sheet: "items" },
  glycogen_crystal: { x: 6, y: 4, sheet: "items" },
  oil_vial: { x: 7, y: 4, sheet: "items" },
  recovery_capsule: { x: 0, y: 5, sheet: "items" },
  bed_moon: { x: 1, y: 5, sheet: "items" },
  crescent_moon: { x: 2, y: 5, sheet: "items" },
  sleep_mask: { x: 3, y: 5, sheet: "items" },
  lotus: { x: 4, y: 5, sheet: "items" },
  brain_profile: { x: 5, y: 5, sheet: "items" },
  atom_token: { x: 6, y: 5, sheet: "items" },
  hourglass: { x: 7, y: 5, sheet: "items" },
  calendar: { x: 0, y: 6, sheet: "items" },
  review_clipboard: { x: 1, y: 6, sheet: "items" },
  flask: { x: 2, y: 6, sheet: "items" },
  test_tubes: { x: 3, y: 6, sheet: "items" },
  microscope: { x: 4, y: 6, sheet: "items" },
  smart_chart: { x: 5, y: 6, sheet: "items" },
  biomarker_chip: { x: 6, y: 6, sheet: "items" },
  molecule_compass: { x: 7, y: 6, sheet: "items" },
  comet_token: { x: 0, y: 7, sheet: "items" },
  star_medal: { x: 1, y: 7, sheet: "items" },
  xp_badge: { x: 2, y: 7, sheet: "items" },
  gears: { x: 3, y: 7, sheet: "items" },
  milestone: { x: 4, y: 7, sheet: "items" },
  pause_medal: { x: 5, y: 7, sheet: "items" },
  broom: { x: 6, y: 7, sheet: "items" },
  data_book: { x: 7, y: 7, sheet: "items" },
} as const;

export type ItemIconId = keyof typeof itemIconPool;
export const itemIconIds = Object.keys(itemIconPool) as ItemIconId[];
export const defaultItemIconId: ItemIconId = "molecule_compass";

export const taskIconIds = {
  pushups: "gold_dumbbell",
  walk: "bio_shoe",
  avena_walk: "runner",
  plank: "molecule_shield",
  isometrics: "muscle_fiber",
  rope_jumping: "comet_token",
  bike_cardio: "heartbeat",
  public_squats: "flexed_muscle",
  weight_lifting: "teal_dumbbell",
  chest_day: "heart",
  back_day: "muscle_cross_section",
  shoulder_day: "joint",
  bicep_day: "flexed_muscle",
  tricep_day: "flexed_muscle",
  forearm_day: "muscle_fiber",
  core_day: "cell_membrane",
  leg_day: "bio_shoe",
  quad_day: "muscle_cross_section",
  hamstring_day: "muscle_fiber",
  glute_day: "muscle_cross_section",
  calf_day: "bio_shoe",
  cold_shower: "water_drop",
  early_bedtime: "bed_moon",
  early_bird: "energy_vial",
  fasting: "hourglass",
  tuna: "protein_plate",
  boiled_egg: "protein_scoop",
  drink_water: "electrolyte_bottle",
  bring_lunch: "grain_bowl",
  portion_control: "apple",
  skip_oxxo: "glucose_meter",
  tidy_room: "broom",
  game: "atom_token",
  doomscroll: "brain_profile",
  pizza: "avocado",
  recovery: "recovery_capsule",
  review: "review_clipboard",
  pause: "pause_medal",
} as const satisfies Record<string, ItemIconId>;

export const iconSprites = {
  category: {
    Body: { x: 0, y: 0 },
    Food: { x: 1, y: 0 },
    Dopamine: { x: 3, y: 0 },
    System: { x: 4, y: 0 },
  },
  kind: {
    discipline: { x: 0, y: 2 },
    reward: { x: 3, y: 3 },
    recovery: { x: 4, y: 2 },
    review: { x: 4, y: 0 },
    pause: { x: 3, y: 2 },
    custom: { x: 3, y: 5 },
  },
  status: {
    planned: { x: 1, y: 2 },
    done: { x: 0, y: 2 },
    missed: { x: 2, y: 2 },
    paused: { x: 5, y: 0 },
    recoveryDue: { x: 4, y: 2 },
    sealed: { x: 5, y: 2 },
  },
  core: {
    xp: { x: 0, y: 3 },
    token: { x: 1, y: 3 },
    streak: { x: 2, y: 3 },
    level: { x: 4, y: 3 },
    beam: { x: 4, y: 3 },
    mark: { x: 3, y: 5 },
    search: { x: 5, y: 1 },
    edit: { x: 5, y: 3 },
    archive: { x: 0, y: 4 },
  },
} as const;

export const itemSprites = {
  task: Object.fromEntries(Object.entries(taskIconIds).map(([id, iconId]) => [id, itemIconPool[iconId]])) as Record<keyof typeof taskIconIds, SpriteSpec>,
  category: {
    Body: itemIconPool.muscle_fiber,
    Food: itemIconPool.grain_bowl,
    Dopamine: itemIconPool.brain_profile,
    System: itemIconPool.smart_chart,
  },
  kind: {
    discipline: itemIconPool.molecule_shield,
    reward: itemIconPool.atom_token,
    recovery: itemIconPool.recovery_capsule,
    review: itemIconPool.review_clipboard,
    pause: itemIconPool.pause_medal,
    custom: itemIconPool.molecule_compass,
  },
  effect: {
    potion: itemIconPool.electrolyte_bottle,
    aura: itemIconPool.neuron_spark,
    relic: itemIconPool.crystal_cluster,
    token: itemIconPool.atom_token,
    streak: itemIconPool.star_medal,
    cooldown: itemIconPool.hourglass,
  },
} as const;

export const effectSprites = {
  completion: { x: 0, y: 0, sheet: "effects" },
  beamImpact: { x: 1, y: 0, sheet: "effects" },
  aura: { x: 2, y: 0, sheet: "effects" },
  tokenBurst: { x: 3, y: 0, sheet: "effects" },
  fragments: { x: 0, y: 1, sheet: "effects" },
  motes: { x: 1, y: 1, sheet: "effects" },
  recovery: { x: 2, y: 1, sheet: "effects" },
  sealed: { x: 3, y: 1, sheet: "effects" },
  halo: { x: 0, y: 2, sheet: "effects" },
  trail: { x: 1, y: 2, sheet: "effects" },
  success: { x: 2, y: 2, sheet: "effects" },
  attention: { x: 3, y: 2, sheet: "effects" },
  dust: { x: 0, y: 3, sheet: "effects" },
  levelUp: { x: 1, y: 3, sheet: "effects" },
  comet: { x: 2, y: 3, sheet: "effects" },
  frame: { x: 3, y: 3, sheet: "effects" },
} as const;

export const ornamentSprites = {
  cornerGold: { x: 0, y: 0, sheet: "ornaments" },
  divider: { x: 1, y: 0, sheet: "ornaments" },
  shieldTab: { x: 2, y: 0, sheet: "ornaments" },
  ribbon: { x: 3, y: 0, sheet: "ornaments" },
  socket: { x: 0, y: 1, sheet: "ornaments" },
  leaf: { x: 1, y: 1, sheet: "ornaments" },
  crystal: { x: 2, y: 1, sheet: "ornaments" },
  plate: { x: 3, y: 1, sheet: "ornaments" },
  bracket: { x: 0, y: 2, sheet: "ornaments" },
  bottomCap: { x: 1, y: 2, sheet: "ornaments" },
  crown: { x: 2, y: 2, sheet: "ornaments" },
  beamReceptor: { x: 3, y: 2, sheet: "ornaments" },
  gem: { x: 0, y: 3, sheet: "ornaments" },
  darkCorner: { x: 1, y: 3, sheet: "ornaments" },
  vellum: { x: 2, y: 3, sheet: "ornaments" },
  streakRing: { x: 3, y: 3, sheet: "ornaments" },
} as const;

export const visualAssets = {
  iconSprite,
  itemSprite,
  effectsSprite,
  ornamentsSprite,
  plannerMark,
  surfaces: {
    sourceAtlasPath: "src/assets/fantasy/surfaces/material-atlas.png",
    panelDark,
    panelLight,
    ambientMist,
    borderMetal,
  },
} as const;
