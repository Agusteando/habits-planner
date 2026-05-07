import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";
import "./styles.css";
import { ICON_GRID, ITEM_GRID, iconSprites, itemSprites, visualAssets, type SpriteSpec } from "./assets/assetManifest";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type TimeBand = "05-07" | "07-09" | "09-11" | "11-13" | "13-15" | "15-17" | "17-19" | "19-21";
type PlanningView = "blocks" | "time";
type TimeFilter = "morning" | "afternoon" | "both";
type Kind = "discipline" | "reward" | "recovery" | "review" | "pause";
type Category = "Body" | "Food" | "Focus" | "Dopa" | "Recovery" | "System";
type Accent = "cyan" | "mint" | "gold" | "violet" | "rose" | "blue" | "amber" | "silver";
type Status = "planned" | "done" | "missed" | "paused" | "recoveryDue";
type Mode = "draft" | "sealed" | "reviewPending" | "reviewOpen";

type Tier = { level: 1 | 2 | 3; label: string; minutes: number; xp: number; tension: number; relief: number };
type Task = { id: string; title: string; icon: string; kind: Kind; category: Category; tokenCost: number; tokenEarn: number; accent: Accent; tiers: Tier[] };
type Block = { id: string; taskId: string; day: DayKey; order: number; tier: 1 | 2 | 3; status: Status; createdAt: string; timeBand?: TimeBand; timeStart?: number; timeMinutes?: number; reviewUnlockAt?: string; reviewOpenedAt?: string; pauseAppliedAt?: string; injected?: boolean };
type DaySeal = { sealedAt: string };
type Player = { level: number; xp: number; tokens: number; streakDays: number; streakState: "healthy" | "fractured"; resetCount: number };
type Week = { mode: Mode; sealedAt?: string; reviewOpenUntil?: string; emergencyReviewRequestedAt?: string; emergencyReviewUnlockAt?: string; daySeals: Partial<Record<DayKey, DaySeal>> };
type Theme = "dark" | "light";
type AppView = "plan" | "today";
type State = { schemaVersion: 28; activeView: AppView; tasks: Record<string, Task>; deletedTaskIds: string[]; blocks: Block[]; player: Player; week: Week; selectedDay: DayKey; weekStartIso: string; hidePastDays: boolean; planningView: PlanningView; timeFilter: TimeFilter; theme: Theme; audioMuted: boolean; toast?: string };
type BankFile = { schemaVersion: number; kind: "habit-action-bank"; exportedAt: string; tasks: Record<string, Task> };
type PlanFile = State & { exportedAt: string };
type ParticleBurst = { id: string; x: number; y: number; mode: "done" | "auto" | "level" };
type XpFloat = { id: string; x: number; y: number; xp: number; levelUp?: number };

const appAssetVars = {
  "--asset-brand-mark": `url(${visualAssets.brandMark})`,
  "--asset-panel-dark": `url(${visualAssets.surfaces.panelDark})`,
  "--asset-panel-light": `url(${visualAssets.surfaces.panelLight})`,
  "--asset-ambient-mist": `url(${visualAssets.surfaces.ambientMist})`,
  "--asset-border-metal": `url(${visualAssets.surfaces.borderMetal})`,
  "--asset-icon-sprite": `url(${visualAssets.iconSprite})`,
  "--asset-item-sprite": `url(${visualAssets.itemSprite})`,
  "--asset-effects-sprite": `url(${visualAssets.effectsSprite})`,
  "--asset-panel-ornament": `url(${visualAssets.panelOrnament})`,
} as React.CSSProperties & Record<string, string>;

const categorySprites = iconSprites.category as Record<Category, SpriteSpec>;
const kindSprites = iconSprites.kind as Record<Kind | "custom", SpriteSpec>;
const statusSprites = iconSprites.status as Record<Status | "sealed", SpriteSpec>;
const itemTaskSprites = itemSprites.task as Record<string, SpriteSpec>;
const itemCategorySprites = itemSprites.category as Record<Category, SpriteSpec>;
const itemKindSprites = itemSprites.kind as Record<Kind | "custom", SpriteSpec>;

function spriteStyle(spec: SpriteSpec): React.CSSProperties {
  const grid = spec.sheet === "items" ? ITEM_GRID : ICON_GRID;
  const x = grid.columns <= 1 ? 0 : (spec.x / (grid.columns - 1)) * 100;
  const y = grid.rows <= 1 ? 0 : (spec.y / (grid.rows - 1)) * 100;
  return { "--sprite-x": `${x}%`, "--sprite-y": `${y}%` } as React.CSSProperties;
}

function SpriteIcon({ spec, className = "" }: { spec: SpriteSpec; className?: string }) {
  return <span className={`sprite-icon ${spec.sheet === "items" ? "item-sprite" : ""} ${className}`} style={spriteStyle(spec)} aria-hidden="true" />;
}

function taskSprite(t: Task) {
  return itemTaskSprites[t.id] || itemCategorySprites[t.category] || itemKindSprites[t.kind] || categorySprites[t.category] || kindSprites[t.kind] || kindSprites.custom;
}

function statusSprite(status: Status) {
  return statusSprites[status] || statusSprites.planned;
}

const STORAGE_KEY = "habit-planner-rpg-v28";
const LEGACY_STORAGE_KEYS = ["habit-planner-rpg-v26","habit-planner-rpg-v25","habit-planner-rpg-v24","habit-planner-rpg-v23","habit-planner-rpg-v22","habit-planner-rpg-v21","habit-planner-rpg-v20","habit-planner-rpg-v19","habit-planner-rpg-v18","habit-planner-rpg-v17","habit-planner-rpg-v16","habit-planner-rpg-v15","habit-planner-rpg-v14","habit-planner-rpg-v13","habit-planner-rpg-v12","habit-planner-rpg-v11"];
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const REVIEW_DELAY = 24 * 60 * 60 * 1000;
const REVIEW_WINDOW = 45 * 60 * 1000;
const RED_ZONE = 80;
const THIN_ICE = 52;
const TIME_BANDS:{id:TimeBand;label:string;phase:"morning"|"afternoon"}[]=[{id:"05-07",label:"5–7 AM",phase:"morning"},{id:"07-09",label:"7–9 AM",phase:"morning"},{id:"09-11",label:"9–11 AM",phase:"morning"},{id:"11-13",label:"11 AM–1 PM",phase:"morning"},{id:"13-15",label:"1–3 PM",phase:"afternoon"},{id:"15-17",label:"3–5 PM",phase:"afternoon"},{id:"17-19",label:"5–7 PM",phase:"afternoon"},{id:"19-21",label:"7–9 PM",phase:"afternoon"}];
const CATEGORY_OPTIONS: Category[] = ["Body","Food","Focus","Dopa","Recovery","System"];
const KIND_OPTIONS: Kind[] = ["discipline","reward","recovery","review","pause"];
const SYSTEM_TASK_IDS = new Set(["recovery","review","pause"]);
const CATEGORY_ACCENTS: Record<Category, Accent> = {Body:"mint",Food:"gold",Focus:"blue",Dopa:"violet",Recovery:"amber",System:"silver"};
type SoundName = "complete" | "drop" | "seal" | "review" | "pause" | "recover" | "reward" | "spend" | "open" | "error" | "reset" | "tick" | "edit";
const SOUND_NAMES: SoundName[] = ["complete","drop","seal","review","pause","recover","reward","spend","open","error","reset","tick","edit"];
const SOUND_PATHS: Record<SoundName, string> = {
  complete:"/sfx/complete.mp3",
  drop:"/sfx/drop.mp3",
  seal:"/sfx/seal.mp3",
  review:"/sfx/review.mp3",
  pause:"/sfx/pause.mp3",
  recover:"/sfx/recover.mp3",
  reward:"/sfx/reward.mp3",
  spend:"/sfx/spend.mp3",
  open:"/sfx/open.mp3",
  error:"/sfx/error.mp3",
  reset:"/sfx/reset.mp3",
  tick:"/sfx/tick.mp3",
  edit:"/sfx/edit.mp3",
};
const CAL_START = 5 * 60;
const CAL_END = 21 * 60;
const CAL_MINUTES = CAL_END - CAL_START;
const CAL_PX_PER_MIN = 1;
const MIN_EVENT_MINUTES = 15;
const RS_MAX_LEVEL = 99;
function rsXpForLevel(level:number){const target=clamp(Math.floor(level),1,RS_MAX_LEVEL); let points=0; for(let n=1;n<target;n++){points+=Math.floor(n+300*Math.pow(2,n/7));} return Math.floor(points/4);}
const RS_XP_CAP = rsXpForLevel(RS_MAX_LEVEL);
function rsLevelForXp(xp:number){const safe=clamp(Math.floor(xp||0),0,RS_XP_CAP); let level=1; for(let l=2;l<=RS_MAX_LEVEL;l++){if(safe>=rsXpForLevel(l)) level=l; else break;} return level;}
function rsProgress(xp:number){const safe=clamp(Math.floor(xp||0),0,RS_XP_CAP); const level=rsLevelForXp(safe); const current=rsXpForLevel(level); const next=level>=RS_MAX_LEVEL?current:rsXpForLevel(level+1); const span=Math.max(1,next-current); return {xp:safe,level,current,next,remaining:level>=RS_MAX_LEVEL?0:Math.max(0,next-safe),progress:level>=RS_MAX_LEVEL?1:(safe-current)/span};}
function compactNumber(n:number){return Math.floor(n).toLocaleString();}
function normalizePlayer(player:Player){const xp=clamp(Math.floor(player.xp||0),0,RS_XP_CAP); return {...player,xp,level:rsLevelForXp(xp),tokens:Math.max(0,Math.floor(player.tokens||0)),streakDays:Math.max(0,Math.floor(player.streakDays||0)),resetCount:Math.max(0,Math.floor(player.resetCount||0))};}
function applyPlayerGain(player:Player,xpDelta:number,tokenDelta:number,recovery=false){const xp=clamp((player.xp||0)+xpDelta,0,RS_XP_CAP); return normalizePlayer({...player,xp,tokens:Math.max(0,(player.tokens||0)+tokenDelta),streakState:recovery?"healthy":player.streakState});}

type SoundNote = [frequency: number, offset: number, duration: number, wave?: OscillatorType];
function soundNotes(name: SoundName): SoundNote[] {
  switch(name){
    case "complete": return [[523,.00,.09,"triangle"],[659,.07,.10,"triangle"],[784,.15,.14,"sine"]];
    case "reward": return [[392,.00,.10,"triangle"],[587,.08,.11,"triangle"],[880,.17,.16,"sine"]];
    case "spend": return [[740,.00,.07,"square"],[494,.08,.12,"triangle"]];
    case "drop": return [[220,.00,.05,"square"],[440,.045,.08,"triangle"]];
    case "seal": return [[196,.00,.22,"sine"],[392,.035,.24,"triangle"],[587,.07,.20,"sine"]];
    case "review": return [[330,.00,.10,"triangle"],[660,.06,.14,"sine"],[990,.16,.12,"sine"]];
    case "pause": return [[294,.00,.18,"sine"],[220,.12,.22,"sine"]];
    case "recover": return [[349,.00,.12,"triangle"],[523,.09,.18,"sine"],[698,.18,.15,"sine"]];
    case "error": return [[150,.00,.16,"sawtooth"],[118,.12,.18,"sawtooth"]];
    case "reset": return [[180,.00,.08,"square"],[135,.07,.12,"square"],[90,.18,.20,"sine"]];
    case "edit": return [[440,.00,.06,"triangle"],[660,.08,.08,"triangle"]];
    case "tick": return [[680,.00,.045,"triangle"]];
    case "open":
    default: return [[392,.00,.08,"triangle"],[523,.07,.10,"sine"]];
  }
}
function createSoundEngine(){
  let ctx: AudioContext | null = null;
  let unlocked = false;
  let muted = false;
  const lastPlayed: Partial<Record<SoundName, number>> = {};
  const available = new Map<SoundName, boolean>();
  const audioCache = new Map<SoundName, HTMLAudioElement>();
  const ensureContext = () => {
    if(ctx) return ctx;
    const Ctor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if(!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  };
  const scan = (name: SoundName) => {
    if(available.has(name)) return;
    available.set(name,false);
    fetch(SOUND_PATHS[name],{method:"HEAD",cache:"no-store"})
      .then(r=>{if(!r.ok)return; available.set(name,true); const a=new Audio(SOUND_PATHS[name]); a.preload="auto"; audioCache.set(name,a);})
      .catch(()=>{available.set(name,false);});
  };
  const fallback = (name: SoundName) => {
    const audio = ensureContext();
    if(!audio) return;
    if(audio.state === "suspended") void audio.resume();
    const master = audio.createGain();
    master.connect(audio.destination);
    const now = audio.currentTime;
    master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(name==="error"?.07:.052,now+.015);
    master.gain.exponentialRampToValueAtTime(.0001,now+.58);
    soundNotes(name).forEach(([frequency,offset,duration,wave])=>{
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = wave || "sine";
      osc.frequency.setValueAtTime(frequency,now+offset);
      gain.gain.setValueAtTime(.0001,now+offset);
      gain.gain.exponentialRampToValueAtTime(.72,now+offset+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now+offset);
      osc.stop(now+offset+duration+.04);
    });
  };
  return {
    setMuted(next:boolean){muted=next;},
    unlock(){unlocked=true; const audio=ensureContext(); if(audio?.state==="suspended") void audio.resume(); SOUND_NAMES.forEach(scan);},
    play(name:SoundName){
      if(muted||!unlocked) return;
      const now = performance.now();
      if(now-(lastPlayed[name]||0)<95) return;
      lastPlayed[name]=now;
      const custom = available.get(name) && audioCache.get(name);
      if(custom){
        const node = custom.cloneNode(true) as HTMLAudioElement;
        node.volume = name==="error" ? .34 : .46;
        void node.play().catch(()=>fallback(name));
        return;
      }
      fallback(name);
    }
  };
}

const tasksSeed: Record<string, Task> = {
  pushups:{id:"pushups",title:"Push-ups",icon:"⚔",kind:"discipline",category:"Body",tokenCost:0,tokenEarn:1,accent:"cyan",tiers:[{level:1,label:"10 min stretch",minutes:10,xp:18,tension:10,relief:0},{level:2,label:"Push-ups 2x8",minutes:14,xp:32,tension:18,relief:0},{level:3,label:"Push-ups 3x8",minutes:18,xp:48,tension:26,relief:0}]},
  walk:{id:"walk",title:"Walk",icon:"◐",kind:"discipline",category:"Body",tokenCost:0,tokenEarn:1,accent:"mint",tiers:[{level:1,label:"5 min outside",minutes:5,xp:16,tension:5,relief:2},{level:2,label:"12 min walk",minutes:12,xp:26,tension:10,relief:4},{level:3,label:"20 min walk",minutes:20,xp:36,tension:16,relief:8}]},
  tuna:{id:"tuna",title:"Tuna Bowl",icon:"◇",kind:"discipline",category:"Food",tokenCost:0,tokenEarn:1,accent:"gold",tiers:[{level:1,label:"Protein snack",minutes:5,xp:15,tension:6,relief:2},{level:2,label:"Tuna Bowl",minutes:20,xp:50,tension:16,relief:3},{level:3,label:"Cook full meal",minutes:35,xp:70,tension:24,relief:5}]},
  focus:{id:"focus",title:"Deep Focus",icon:"◆",kind:"discipline",category:"Focus",tokenCost:0,tokenEarn:1,accent:"blue",tiers:[{level:1,label:"Open project",minutes:8,xp:16,tension:8,relief:0},{level:2,label:"25 min focus",minutes:25,xp:38,tension:24,relief:0},{level:3,label:"50 min focus",minutes:50,xp:70,tension:42,relief:0}]},
  game:{id:"game",title:"Videogames",icon:"✦",kind:"reward",category:"Dopa",tokenCost:2,tokenEarn:0,accent:"violet",tiers:[{level:1,label:"15 min game",minutes:15,xp:0,tension:0,relief:18},{level:2,label:"30 min game",minutes:30,xp:0,tension:0,relief:32},{level:3,label:"60 min game",minutes:60,xp:0,tension:0,relief:52}]},
  pizza:{id:"pizza",title:"Pizza Night",icon:"✺",kind:"reward",category:"Dopa",tokenCost:3,tokenEarn:0,accent:"rose",tiers:[{level:1,label:"Small treat",minutes:15,xp:0,tension:0,relief:20},{level:2,label:"Pizza meal",minutes:45,xp:0,tension:0,relief:45},{level:3,label:"Pizza + movie",minutes:100,xp:0,tension:0,relief:70}]},
  recovery:{id:"recovery",title:"Recovery",icon:"⬖",kind:"recovery",category:"Recovery",tokenCost:0,tokenEarn:0,accent:"amber",tiers:[{level:1,label:"Water + breathe",minutes:15,xp:12,tension:0,relief:12},{level:2,label:"Room reset",minutes:20,xp:18,tension:2,relief:18},{level:3,label:"Full reset ritual",minutes:30,xp:28,tension:4,relief:28}]},
  review:{id:"review",title:"Review Window",icon:"◈",kind:"review",category:"System",tokenCost:0,tokenEarn:0,accent:"silver",tiers:[{level:1,label:"15 min edit window",minutes:15,xp:0,tension:0,relief:8},{level:2,label:"30 min review",minutes:30,xp:0,tension:0,relief:10},{level:3,label:"45 min reset",minutes:45,xp:0,tension:0,relief:12}]},
  pause:{id:"pause",title:"Pause Day",icon:"Ⅱ",kind:"pause",category:"System",tokenCost:0,tokenEarn:0,accent:"silver",tiers:[{level:1,label:"Pause remaining day",minutes:0,xp:0,tension:0,relief:20},{level:2,label:"Protect evening",minutes:0,xp:0,tension:0,relief:30},{level:3,label:"Full stop",minutes:0,xp:0,tension:0,relief:40}]}
};

function uid(prefix="id") { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`; }
function todayStart(d=new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d=new Date()) { const x=todayStart(d); const day=x.getDay(); x.setDate(x.getDate() + (day===0?-6:1-day)); return x; }
function startOfWeekIso(d=new Date()) { return startOfWeek(d).toISOString(); }
function addDays(d:Date,n:number){const x=new Date(d); x.setDate(x.getDate()+n); return x;}
function dayDate(weekStartIso:string, day:DayKey){return addDays(new Date(weekStartIso), DAYS.indexOf(day));}
function sameDate(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function currentWeek(iso:string){return sameDate(new Date(iso),startOfWeek());}
function isPast(iso:string, day:DayKey){return dayDate(iso,day).getTime()<todayStart().getTime();}
function isToday(iso:string, day:DayKey){return sameDate(dayDate(iso,day),new Date());}
function weekLabel(iso:string){const s=new Date(iso); const e=addDays(s,6); return `${s.toLocaleDateString(undefined,{month:"short",day:"numeric"})}–${e.toLocaleDateString(undefined,{month:e.getMonth()===s.getMonth()?undefined:"short",day:"numeric",year:"numeric"})}`;}
function dateTitle(iso:string, day:DayKey){return dayDate(iso,day).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});}
function dateShort(iso:string, day:DayKey){return dayDate(iso,day).toLocaleDateString(undefined,{month:"short",day:"numeric"});}
function getTier(t:Task,l:1|2|3){return t.tiers.find(x=>x.level===l)||t.tiers[0];}
function dayBlocks(blocks:Block[],day:DayKey){return blocks.filter(b=>b.day===day).sort((a,b)=>a.order-b.order);}
function normalize(blocks:Block[]){return DAYS.flatMap(day=>dayBlocks(blocks,day).map((b,i)=>({...b,order:i+1})));}
function nextOrder(blocks:Block[],day:DayKey){const xs=blocks.filter(b=>b.day===day); return xs.length?Math.max(...xs.map(b=>b.order))+1:1;}
function countdown(target?:string){if(!target)return""; const ms=new Date(target).getTime()-Date.now(); if(ms<=0)return"Ready"; const m=Math.ceil(ms/60000), h=Math.floor(m/60), min=m%60; if(h>=24)return`${Math.floor(h/24)}d ${h%24}h`; return h?`${h}h ${min}m`:`${min}m`;}
function categoryAccent(category:Category){return CATEGORY_ACCENTS[category] || "cyan";}
function formatExactDateTime(iso?:string){if(!iso)return""; const d=new Date(iso); if(Number.isNaN(d.getTime()))return""; return d.toLocaleString([], {weekday:"short", hour:"numeric", minute:"2-digit", month:"short", day:"numeric"});}
function progressBetween(startIso:string|undefined,endIso:string|undefined){const start=startIso?new Date(startIso).getTime():Date.now(); const end=endIso?new Date(endIso).getTime():Date.now(); if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 100; return clamp((Date.now()-start)/(end-start)*100,0,100);}
function dayEndIso(weekStartIso:string,day:DayKey){const d=dayDate(weekStartIso,day); d.setHours(23,59,59,999); return d.toISOString();}
function blockTiming(t:Task,b:Block,week:Week,weekStartIso:string,reviewLive:boolean):{label:string;detail:string;progress:number;tone:"review"|"pause"|"recovery"|"cooldown"}|null{
  if(t.kind==="review"){
    if(reviewLive&&week.reviewOpenUntil)return{label:`Review ${countdown(week.reviewOpenUntil)}`,detail:`Ends ${formatExactDateTime(week.reviewOpenUntil)}`,progress:progressBetween(b.reviewOpenedAt,week.reviewOpenUntil),tone:"review"};
    if(b.status==="planned"&&b.reviewUnlockAt)return{label:`Opens ${countdown(b.reviewUnlockAt)}`,detail:`Ready ${formatExactDateTime(b.reviewUnlockAt)}`,progress:progressBetween(b.createdAt,b.reviewUnlockAt),tone:"cooldown"};
  }
  if(t.kind==="pause"&&b.status==="done"&&b.pauseAppliedAt){const end=dayEndIso(weekStartIso,b.day); return{label:`Paused ${countdown(end)}`,detail:`Until ${formatExactDateTime(end)}`,progress:progressBetween(b.pauseAppliedAt,end),tone:"pause"};}
  if(b.status==="paused"){const end=dayEndIso(weekStartIso,b.day); return{label:`Paused ${countdown(end)}`,detail:`Until ${formatExactDateTime(end)}`,progress:progressBetween(b.createdAt,end),tone:"pause"};}
  if(b.status==="recoveryDue")return{label:"Recovery due",detail:"Streak waiting",progress:100,tone:"recovery"};
  return null;
}
function baseState(toast?:string, resetCount=0):State{const player=normalizePlayer({level:5,xp:1400,tokens:4,streakDays:12,streakState:"healthy",resetCount}); return{schemaVersion:28,activeView:"plan",tasks:tasksSeed,deletedTaskIds:[],blocks:[],player,week:{mode:"draft",daySeals:{}},selectedDay:"mon",weekStartIso:startOfWeekIso(),hidePastDays:false,planningView:"blocks",timeFilter:"both",theme:"dark",audioMuted:false,toast};}
function loadState():State{try{let raw=localStorage.getItem(STORAGE_KEY); if(!raw){for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key); if(raw)break;}} if(!raw)return baseState(); const p=JSON.parse(raw); if(!p||typeof p!=="object")return baseState(); const deletedTaskIds:string[]=Array.isArray(p.deletedTaskIds)?p.deletedTaskIds.filter((id:any):id is string=>typeof id==="string"):[]; const tasks={...tasksSeed,...(p.tasks||{})}; deletedTaskIds.forEach(id=>{if(tasks[id]&&!isSystemTask(tasks[id])) delete tasks[id];}); return {...baseState(),...p,schemaVersion:28,activeView:p.activeView==="today"?"today":"plan",tasks,deletedTaskIds,blocks:normalize((p.blocks||[]).filter((b:Block)=>!!tasks[b.taskId])),player:normalizePlayer({...baseState().player,...(p.player||{}),resetCount:p.player?.resetCount||0}),week:{mode:p.week?.mode||"draft",sealedAt:p.week?.sealedAt,reviewOpenUntil:p.week?.reviewOpenUntil,emergencyReviewRequestedAt:p.week?.emergencyReviewRequestedAt,emergencyReviewUnlockAt:p.week?.emergencyReviewUnlockAt,daySeals:p.week?.daySeals||{}},weekStartIso:p.weekStartIso||startOfWeekIso(),hidePastDays:!!p.hidePastDays,planningView:p.planningView==="time"?"time":"blocks",timeFilter:p.timeFilter==="morning"||p.timeFilter==="afternoon"?p.timeFilter:"both",theme:p.theme==="light"?"light":"dark",audioMuted:!!p.audioMuted};}catch{return baseState("Stored plan reset.");}}
function report(blocks:Block[],tasks:Record<string,Task>){let tension=0,relief=0,tokenDelta=0; for(const b of blocks){if(b.status==="missed"||b.status==="paused")continue; const t=tasks[b.taskId]; if(!t)continue; const tier=getTier(t,b.tier); tension+=tier.tension; relief+=tier.relief; tokenDelta+=t.tokenEarn-t.tokenCost;} const netTension=tension-relief; const status=netTension>=RED_ZONE?"redZone":netTension>=THIN_ICE?"thinIce":"balanced"; return{tension,relief,tokenDelta,netTension,status,sealDisabledReason: status==="redZone"?"Add relief before sealing.":tokenDelta<0?"Rewards exceed earned tokens.":undefined};}
function canSeal(r:ReturnType<typeof report>, week:Week){return (week.mode==="draft"||week.mode==="reviewOpen")&&r.status!=="redZone"&&r.tokenDelta>=0;}
function canEditGlobal(week:Week){return week.mode==="draft"|| (week.mode==="reviewOpen" && !!week.reviewOpenUntil && Date.now()<new Date(week.reviewOpenUntil).getTime());}
function isDaySealed(s:State, day:DayKey){return !!s.week.daySeals?.[day];}
function canEditDay(s:State, day:DayKey){if(s.week.mode==="reviewOpen"&&canEditGlobal(s.week))return true; return !isDaySealed(s,day);}
function hasAnySealed(s:State){return DAYS.some(d=>isDaySealed(s,d));}
function firstSealedDay(s:State){return (DAYS.find(d=>isDaySealed(s,d))||s.selectedDay) as DayKey;}
function visibleBands(filter:TimeFilter){return TIME_BANDS.filter(b=>filter==="both"||b.phase===filter);}
function calendarFrame(filter:TimeFilter){const bands=visibleBands(filter); const first=bands[0]||TIME_BANDS[0]; const last=bands[bands.length-1]||TIME_BANDS[TIME_BANDS.length-1]; return {start:bandRange(first.id).start,end:bandRange(last.id).end};}
function autoBand(index:number):TimeBand{return TIME_BANDS[Math.min(TIME_BANDS.length-1,index)].id;}
function effectiveBand(b:Block,index:number):TimeBand{return b.timeBand||autoBand(index);}
function bandRange(id:TimeBand){const [start,end]=id.split("-").map(Number); return {start:start*60,end:end*60};}
function currentLineInfo(weekStartIso:string,day:DayKey,filter:TimeFilter){if(!isToday(weekStartIso,day))return null; const frame=calendarFrame(filter); const now=new Date(); const mins=now.getHours()*60+now.getMinutes(); if(mins<frame.start||mins>frame.end)return null; const pct=(mins-frame.start)/(frame.end-frame.start)*100; const currentBand=(visibleBands(filter).find(b=>mins>=bandRange(b.id).start&&mins<bandRange(b.id).end)?.id)||visibleBands(filter).slice(-1)[0]?.id||TIME_BANDS[TIME_BANDS.length-1].id; const label=now.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); return {pct,currentBand,label,minutes:mins};}
function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n));}
function snap(n:number,step=15){return Math.round(n/step)*step;}
function formatMinutes(mins:number){const h=Math.floor(mins/60), m=mins%60; const d=new Date(); d.setHours(h,m,0,0); return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});}
function eventTimeMeta(b:Block,index:number,tier:Tier){const start=calendarStart(b,index); const duration=calendarDuration(b,tier); const end=clamp(start+duration,CAL_START,CAL_END); return {start,duration,end};}
function shouldAutoCompleteBlock(weekStartIso:string,b:Block,index:number,t:Task){ if(b.status!=="planned") return false; if(!isToday(weekStartIso,b.day)) return false; const {end}=eventTimeMeta(b,index,getTier(t,b.tier)); const now=new Date(); const mins=now.getHours()*60+now.getMinutes(); return mins>=end; }
function calendarStart(b:Block,index:number){if(typeof b.timeStart==="number")return clamp(b.timeStart,CAL_START,CAL_END-MIN_EVENT_MINUTES); if(b.timeBand)return bandRange(b.timeBand).start+Math.min(45,index*12); return clamp(CAL_START+index*45,CAL_START,CAL_END-MIN_EVENT_MINUTES);}
function calendarDuration(b:Block,tier:Tier){return clamp(b.timeMinutes??Math.max(MIN_EVENT_MINUTES,tier.minutes||30),MIN_EVENT_MINUTES,240);}
function ensureReviewBlock(s:State, day:DayKey, unlockAt?:string){const exists=s.blocks.some(b=>b.day===day&&s.tasks[b.taskId]?.kind==="review"&&b.status==="planned"); if(exists)return s.blocks; const review=s.tasks.review; if(!review)return s.blocks; return normalize([...s.blocks,{...makeBlock(review,day,nextOrder(s.blocks,day),unlockAt||new Date(Date.now()+REVIEW_DELAY).toISOString(),"19-21")}]);}
function isSystemTask(t?:Task){return !!t&&SYSTEM_TASK_IDS.has(t.id);}
function makeBlock(t:Task,day:DayKey,order:number,reviewUnlockAt?:string,timeBand?:TimeBand,timeStart?:number):Block{const tier=t.tiers.find(x=>x.level===(t.kind==="reward"?2:1))||t.tiers[0];return{id:uid("block"),taskId:t.id,day,order,tier:t.kind==="reward"?2:1,status:"planned",createdAt:new Date().toISOString(),timeBand,timeStart,timeMinutes:Math.max(MIN_EVENT_MINUTES,tier.minutes||30),reviewUnlockAt:t.kind==="review"?(reviewUnlockAt||new Date(Date.now()+REVIEW_DELAY).toISOString()):undefined};}
function insertBlock(blocks:Block[],incoming:Block,target:{day:DayKey;beforeBlockId?:string}){if(!target.beforeBlockId)return normalize([...blocks,{...incoming,day:target.day,order:nextOrder(blocks,target.day)}]); const rest=blocks.filter(b=>b.day!==target.day), xs=dayBlocks(blocks,target.day), out:Block[]=[]; let done=false; for(const b of xs){if(b.id===target.beforeBlockId){out.push({...incoming,day:target.day,order:b.order-.5}); done=true;} out.push(b);} if(!done)out.push({...incoming,day:target.day,order:nextOrder(blocks,target.day)}); return normalize([...rest,...out]);}
function makeCustom(title:string,kind:Kind):Task{const clean=title.trim(); const idText=clean.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,38)||"custom"; const c={discipline:["Focus","cyan","✧",0,1,[4,16,34],[10,30,60],["Minimum version","Standard version","Deep version"]],reward:["Dopa","violet","✦",1,0,[0,0,0],[0,0,0],["Small reward","Standard reward","Long reward"]],recovery:["Recovery","amber","⬖",0,0,[0,2,4],[8,16,24],["Tiny reset","Reset","Full reset"]],review:["System","silver","◈",0,0,[0,0,0],[0,0,0],["15 min edit window","30 min review","45 min reset"]],pause:["System","silver","Ⅱ",0,0,[0,0,0],[0,0,0],["Pause remaining day","Protect evening","Full stop"]]}[kind] as [Category,Accent,string,number,number,number[],number[],string[]]; const relief=kind==="reward"?[14,28,44]:kind==="recovery"?[12,20,30]:kind==="review"?[8,10,12]:kind==="pause"?[20,30,40]:[0,0,0]; return{id:`custom_${idText}_${Date.now().toString(36)}`,title:clean,icon:c[2],kind,category:c[0],accent:c[1],tokenCost:c[3],tokenEarn:c[4],tiers:[1,2,3].map((l,i)=>({level:l as 1|2|3,label:c[7][i],minutes:kind==="pause"?0:[5,20,45][i],xp:c[6][i],tension:c[5][i],relief:relief[i]}))};}
function downloadJson(name:string,data:unknown){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}
function clearPlannerPersistence(){try{for(const key of Object.keys(localStorage)){if(key.startsWith("habit-planner-rpg-")&&key!==STORAGE_KEY)localStorage.removeItem(key);}}catch{}}
function resetPlannerState(s:State):State{return{...s,activeView:"plan",blocks:[],player:normalizePlayer({level:1,xp:0,tokens:0,streakDays:0,streakState:"healthy",resetCount:s.player.resetCount+1}),week:{mode:"draft",daySeals:{}},selectedDay:"mon",weekStartIso:startOfWeekIso(),hidePastDays:false,planningView:"blocks",toast:"Full reset complete. Week cleared."};}
function validateTask(x:any):Task{if(!x||typeof x!=="object")throw new Error("Invalid action."); if(!x.id||!x.title||!x.icon)throw new Error("Action needs id, title, and icon."); if(!["discipline","reward","recovery","review","pause"].includes(x.kind))throw new Error(`Invalid action kind: ${x.kind}`); if(!["Body","Food","Focus","Dopa","Recovery","System"].includes(x.category))throw new Error(`Invalid category: ${x.category}`); if(!Array.isArray(x.tiers)||x.tiers.length!==3)throw new Error(`${x.title} must have exactly 3 tiers.`); return x as Task;}
function validateBank(x:any):BankFile{if(!x||x.kind!=="habit-action-bank"||!x.tasks)throw new Error("Not an action bank file."); const tasks:Record<string,Task>={}; Object.values(x.tasks).forEach((v:any)=>{const t=validateTask(v); tasks[t.id]=t;}); return{schemaVersion:28,kind:"habit-action-bank",exportedAt:new Date().toISOString(),tasks};}
function validatePlan(x:any):PlanFile{if(!x||!x.tasks||!Array.isArray(x.blocks))throw new Error("Invalid plan file."); const deletedTaskIds:string[]=Array.isArray(x.deletedTaskIds)?x.deletedTaskIds.filter((id:any):id is string=>typeof id==="string"):[]; const tasks={...tasksSeed,...x.tasks}; Object.values(tasks).forEach((v:any)=>validateTask(v)); deletedTaskIds.forEach(id=>{if(tasks[id]&&!isSystemTask(tasks[id])) delete tasks[id];}); return{...baseState(),...x,schemaVersion:28,activeView:x.activeView==="today"?"today":"plan",tasks,deletedTaskIds,blocks:normalize(x.blocks.filter((b:Block)=>!!tasks[b.taskId])),player:normalizePlayer({...baseState().player,...x.player,resetCount:x.player?.resetCount||0}),week:{mode:x.week?.mode||"draft",sealedAt:x.week?.sealedAt,reviewOpenUntil:x.week?.reviewOpenUntil,emergencyReviewRequestedAt:x.week?.emergencyReviewRequestedAt,emergencyReviewUnlockAt:x.week?.emergencyReviewUnlockAt,daySeals:x.week?.daySeals||{}},weekStartIso:x.weekStartIso||startOfWeekIso(),hidePastDays:!!x.hidePastDays,planningView:x.planningView==="time"?"time":"blocks",timeFilter:x.timeFilter==="morning"||x.timeFilter==="afternoon"?x.timeFilter:"both",theme:x.theme==="light"?"light":"dark",audioMuted:!!x.audioMuted,exportedAt:new Date().toISOString()};}

type DropTarget = {day:DayKey;beforeBlockId?:string;timeBand?:TimeBand;timeStart?:number};
type Drag = {type:"task";taskId:string;x:number;y:number}|{type:"block";blockId:string;x:number;y:number};
function dropTarget(x:number,y:number):DropTarget|null{const el=document.elementFromPoint(x,y) as HTMLElement|null; if(!el)return null; const cal=el.closest<HTMLElement>("[data-calendar-day]"); if(cal?.dataset.calendarDay){const rect=cal.getBoundingClientRect(); const day=cal.dataset.calendarDay as DayKey; const frameStart=Number(cal.dataset.frameStart||CAL_START); const frameEnd=Number(cal.dataset.frameEnd||CAL_END); const timeStart=clamp(snap(frameStart+(y-rect.top)/CAL_PX_PER_MIN),frameStart,frameEnd-MIN_EVENT_MINUTES); return{day,timeStart};} const time=el.closest<HTMLElement>("[data-time-band]"); if(time?.dataset.timeBand){const day=time.closest<HTMLElement>("[data-drop-day]")?.dataset.dropDay as DayKey|undefined; if(day)return{day,timeBand:time.dataset.timeBand as TimeBand};} const block=el.closest<HTMLElement>("[data-drop-block]"); if(block?.dataset.dropBlock){const day=block.closest<HTMLElement>("[data-drop-day]")?.dataset.dropDay as DayKey|undefined; if(day)return{day,beforeBlockId:block.dataset.dropBlock};} const day=el.closest<HTMLElement>("[data-drop-day]")?.dataset.dropDay as DayKey|undefined; return day?{day}:null;}

function App(){
  const [state,setState]=useState<State>(loadState); const [drag,setDrag]=useState<Drag|null>(null); const [expanded,setExpanded]=useState<string|null>(null); const [popover,setPopover]=useState<{blockId:string;top:number;left:number;width:number}|null>(null); const [menu,setMenu]=useState(false); const [resetConfirm,setResetConfirm]=useState(false); const [bankMenu,setBankMenu]=useState(false); const [showAdd,setShowAdd]=useState(false); const [query,setQuery]=useState(""); const [chip,setChip]=useState<"All"|Category>("All"); const [newTitle,setNewTitle]=useState(""); const [newKind,setNewKind]=useState<Kind>("discipline"); const [editingTaskId,setEditingTaskId]=useState<string|null>(null); const [tick,setTick]=useState(0); const [bursts,setBursts]=useState<ParticleBurst[]>([]); const [xpFloats,setXpFloats]=useState<XpFloat[]>([]); const [beamGeom,setBeamGeom]=useState<{top:number;left:number;width:number;hasTarget:boolean}|null>(null); const planImport=useRef<HTMLInputElement|null>(null); const bankImport=useRef<HTMLInputElement|null>(null); const calendarShellRef=useRef<HTMLDivElement|null>(null); const soundRef=useRef<ReturnType<typeof createSoundEngine>|null>(null);
  useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,toast:undefined}));},[state]);
  useEffect(()=>{document.documentElement.dataset.theme=state.theme;},[state.theme]);
  useEffect(()=>{const engine=createSoundEngine(); soundRef.current=engine; engine.setMuted(state.audioMuted); const unlock=()=>engine.unlock(); window.addEventListener("pointerdown",unlock,{once:true}); window.addEventListener("keydown",unlock,{once:true}); return()=>{window.removeEventListener("pointerdown",unlock); window.removeEventListener("keydown",unlock);};},[]);
  useEffect(()=>{soundRef.current?.setMuted(state.audioMuted);},[state.audioMuted]);
  useEffect(()=>{if(!state.toast)return; const t=window.setTimeout(()=>setState(s=>({...s,toast:undefined})),2600); return()=>clearTimeout(t);},[state.toast]);
  useEffect(()=>{const t=window.setInterval(()=>setTick(x=>x+1),30000); return()=>clearInterval(t);},[]);
  useEffect(()=>{if(!drag)return; const move=(e:PointerEvent)=>setDrag(d=>d?{...d,x:e.clientX,y:e.clientY}:d); const up=(e:PointerEvent)=>{const d=drag; setDrag(null); const target=dropTarget(e.clientX,e.clientY); if(!target)return; if(d.type==="task")addTemplate(d.taskId,target); else moveBlock(d.blockId,target);}; window.addEventListener("pointermove",move,{passive:true}); window.addEventListener("pointerup",up); window.addEventListener("pointercancel",up); return()=>{window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); window.removeEventListener("pointercancel",up);};},[drag,state]);
  useEffect(()=>{if(!expanded)return; const close=()=>{setExpanded(null); setPopover(null);}; const onPointerDown=(e:PointerEvent)=>{const el=e.target as HTMLElement|null; if(el?.closest("[data-block-root]")||el?.closest("[data-block-popover]"))return; close();}; const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")close();}; const onViewport=()=>close(); window.addEventListener("pointerdown",onPointerDown); window.addEventListener("keydown",onKey); window.addEventListener("resize",onViewport); window.addEventListener("scroll",onViewport,true); return()=>{window.removeEventListener("pointerdown",onPointerDown); window.removeEventListener("keydown",onKey); window.removeEventListener("resize",onViewport); window.removeEventListener("scroll",onViewport,true);};},[expanded]);
  const r=useMemo(()=>report(state.blocks,state.tasks),[state.blocks,state.tasks]);
  const playerProgress=rsProgress(state.player.xp);
  const visibleDays=DAYS.filter(d=>!(state.hidePastDays&&currentWeek(state.weekStartIso)&&isPast(state.weekStartIso,d)));
  const focusDay=(visibleDays.includes(state.selectedDay)?state.selectedDay:(visibleDays[0]||"mon")) as DayKey;
  const all=dayBlocks(state.blocks,focusDay);
  const bands=visibleBands(state.timeFilter);
  const nowLine=currentLineInfo(state.weekStartIso,focusDay,state.timeFilter);
  const filteredTasks=Object.values(state.tasks).filter(t=>{const q=query.trim().toLowerCase(); return (chip==="All"||t.category===chip)&&(!q||[t.title,t.kind,t.category,...t.tiers.map(x=>x.label)].join(" " ).toLowerCase().includes(q));});
  function emitRewardNearBlock(blockId:string, xp:number, levelUp?:number, mode:"done"|"auto"="done"){ 
    requestAnimationFrame(()=>{ 
      const el=document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement|null; 
      if(!el)return; 
      const rect=el.getBoundingClientRect(); 
      const x=rect.left+Math.min(56,Math.max(28,rect.width*.24));
      const y=rect.top+rect.height*.5;
      const burst:ParticleBurst={id:uid("burst"),x,y,mode:levelUp?"level":mode}; 
      setBursts(xs=>[...xs,burst]); 
      window.setTimeout(()=>setBursts(xs=>xs.filter(item=>item.id!==burst.id)),1100); 
      if(xp>0){const float={id:uid("xp"),x:x+10,y:y-10,xp,levelUp}; setXpFloats(xs=>[...xs,float]); window.setTimeout(()=>setXpFloats(xs=>xs.filter(item=>item.id!==float.id)),1500);} 
    }); 
  }
  useEffect(()=>{
    const pending:{id:string;xp:number;tokens:number;recovery:boolean}[]=[];
    for(const day of DAYS){
      const blocks=dayBlocks(state.blocks,day);
      blocks.forEach((b,index)=>{
        const t=state.tasks[b.taskId];
        if(!t) return;
        if(shouldAutoCompleteBlock(state.weekStartIso,b,index,t)){
          const tier=getTier(t,b.tier);
          pending.push({id:b.id,xp:tier.xp,tokens:t.tokenEarn-(t.kind==="reward"?t.tokenCost:0),recovery:t.kind==="recovery"});
        }
      });
    }
    if(!pending.length) return;
    setState(s=>{const totalXp=pending.reduce((a,p)=>a+p.xp,0); const totalTokens=pending.reduce((a,p)=>a+p.tokens,0); const beforeLevel=rsLevelForXp(s.player.xp); const player=applyPlayerGain(s.player,totalXp,totalTokens,pending.some(p=>p.recovery)); const afterLevel=player.level; pending.forEach((p,index)=>emitRewardNearBlock(p.id,p.xp,index===0&&afterLevel>beforeLevel?afterLevel:undefined,"auto")); return{
      ...s,
      blocks:s.blocks.map(b=>pending.some(p=>p.id===b.id)?{...b,status:"done" as Status}:b),
      player
    };});
  },[tick,state.weekStartIso,state.blocks,state.tasks]);

  useEffect(()=>{
    if(state.planningView!=="time"){ setBeamGeom(null); return; }
    const todayDay=visibleDays.find(day=>isToday(state.weekStartIso,day));
    if(!todayDay){ setBeamGeom(null); return; }
    const line=currentLineInfo(state.weekStartIso,todayDay,state.timeFilter);
    const shell=calendarShellRef.current;
    if(!shell||!line){ setBeamGeom(null); return; }
    const shellRect=shell.getBoundingClientRect();
    const axis=shell.querySelector(".calendar-axis") as HTMLElement|null;
    const lane=shell.querySelector(`[data-calendar-day="${todayDay}"]`) as HTMLElement|null;
    if(!axis||!lane){ setBeamGeom(null); return; }
    const axisRect=axis.getBoundingClientRect();
    const laneRect=lane.getBoundingClientRect();
    const frame=calendarFrame(state.timeFilter);
    const blocks=dayBlocks(state.blocks,todayDay);
    let hitId:string|undefined;
    blocks.forEach((b,index)=>{
      const t=state.tasks[b.taskId];
      if(!t||hitId) return;
      const meta=eventTimeMeta(b,index,getTier(t,b.tier));
      if(line.minutes>=meta.start&&line.minutes<=meta.end) hitId=b.id;
    });
    const bodyTop=laneRect.top-shellRect.top;
    const origin=(axisRect.left-shellRect.left)+axisRect.width-6;
    const laneRight=laneRect.right-shellRect.left-8;
    let width:number;
    if(hitId){
      const hitEl=shell.querySelector(`[data-event-id="${hitId}"]`) as HTMLElement|null;
      const hitRect=hitEl?.getBoundingClientRect();
      const hitLeft=hitRect ? hitRect.left-shellRect.left : laneRight;
      width=Math.max(18, hitLeft-origin);
    }else{
      width=Math.max(24,laneRight-origin);
    }
    setBeamGeom({top:bodyTop+(line.minutes-frame.start)*CAL_PX_PER_MIN,left:origin,width,hasTarget:!!hitId});
  },[state.planningView,state.weekStartIso,state.timeFilter,state.blocks,state.tasks,tick,visibleDays.join("|")]);

  function patch(fn:(s:State)=>State){setState(s=>fn(s));}
  function playSfx(name:SoundName){soundRef.current?.play(name);}
  function toggleSound(){const muted=!state.audioMuted; soundRef.current?.setMuted(muted); if(!muted) soundRef.current?.play("open"); setState(s=>({...s,audioMuted:muted,toast:muted?"Sound muted":"Sound on"}));}
  function addTemplate(taskId:string,target:DropTarget){playSfx(!canEditDay(state,target.day)||!state.tasks[taskId]?"error":"drop"); patch(s=>{if(!canEditDay(s,target.day))return{...s,toast:"That day is sealed."}; const t=s.tasks[taskId]; if(!t)return{...s,toast:"Action not found."}; return{...s,selectedDay:target.day,blocks:insertBlock(s.blocks,makeBlock(t,target.day,nextOrder(s.blocks,target.day),undefined,target.timeBand,target.timeStart),target)};});}
  function moveBlock(blockId:string,target:DropTarget){const b=state.blocks.find(x=>x.id===blockId); playSfx(!b||!canEditDay(state,b.day)||!canEditDay(state,target.day)?"error":"drop"); patch(s=>{const b=s.blocks.find(x=>x.id===blockId); if(!b)return{...s,toast:"Block not found."}; if(!canEditDay(s,b.day)||!canEditDay(s,target.day))return{...s,toast:"That day is sealed."}; return{...s,selectedDay:target.day,blocks:insertBlock(s.blocks.filter(x=>x.id!==blockId),{...b,day:target.day,timeBand:target.timeBand??b.timeBand,timeStart:target.timeStart??b.timeStart},target)};});}
  function resizeTimeBlock(e:React.PointerEvent,b:Block){e.preventDefault(); e.stopPropagation(); if(!canEditDay(state,b.day)){setState(s=>({...s,toast:"Open Review before editing a sealed day."})); return;} const task=state.tasks[b.taskId]; const tier=task?getTier(task,b.tier):undefined; const base=calendarDuration(b,tier||{level:1,label:"",minutes:30,xp:0,tension:0,relief:0}); const startY=e.clientY; const frame=calendarFrame(state.timeFilter); const index=Math.max(0,dayBlocks(state.blocks,b.day).findIndex(x=>x.id===b.id)); const start=calendarStart(b,index); const maxEnd=Math.min(CAL_END,frame.end); const maxDuration=Math.max(MIN_EVENT_MINUTES,maxEnd-start); const onMove=(ev:PointerEvent)=>{const next=clamp(snap(base+(ev.clientY-startY)/CAL_PX_PER_MIN),MIN_EVENT_MINUTES,maxDuration); setState(s=>({...s,blocks:s.blocks.map(x=>x.id===b.id?{...x,timeMinutes:next}:x)}));}; const onUp=()=>{window.removeEventListener("pointermove",onMove); window.removeEventListener("pointerup",onUp);}; window.addEventListener("pointermove",onMove); window.addEventListener("pointerup",onUp);}
  function startDrag(e:React.PointerEvent,d:Drag){e.preventDefault(); e.stopPropagation(); playSfx("tick"); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); setDrag({...d,x:e.clientX,y:e.clientY});}
  function addCustom(){const title=newTitle.trim(); if(!title){playSfx("error"); setState(s=>({...s,toast:"Name the action first."})); return;} const t=makeCustom(title,newKind); playSfx("edit"); setState(s=>({...s,tasks:{...s.tasks,[t.id]:t},toast:"Action added."})); setEditingTaskId(t.id); setNewTitle(""); setShowAdd(false);}
  function editBankAction(taskId:string,change:{category?:Category;kind?:Kind}){playSfx("edit"); setState(s=>{const task=s.tasks[taskId]; if(!task)return s; if(isSystemTask(task))return{...s,toast:"System actions cannot be edited."}; const nextKind=change.kind||task.kind; const nextCategory=change.category||task.category; const tuned=nextKind!==task.kind?makeCustom(task.title,nextKind):task; return{...s,tasks:{...s.tasks,[taskId]:{...task,...tuned,id:task.id,title:task.title,kind:nextKind,category:nextCategory,accent:categoryAccent(nextCategory)}},toast:"Action updated."};});}
  function sealDay(day:DayKey){playSfx(state.week.daySeals[day]?"error":"seal"); patch(s=>{if(s.week.daySeals[day])return{...s,toast:"Day already sealed."}; const sealedBlocks=s.blocks.map(b=>b.day===day?{...b,sealed:true}:b); const next={...s,blocks:sealedBlocks,week:{...s.week,daySeals:{...s.week.daySeals,[day]:{sealedAt:new Date().toISOString()}}}}; return{...next,blocks:ensureReviewBlock(next,day),toast:"Day sealed. Review block added."};});}
  function unsealDay(day:DayKey){playSfx(state.week.mode==="reviewOpen"&&state.week.daySeals[day]?"review":"error"); patch(s=>{if(!s.week.daySeals[day])return{...s,toast:"That day is not sealed."}; if(s.week.mode!=="reviewOpen")return{...s,toast:"Open a Review block before unsealing."}; const seals={...s.week.daySeals}; delete seals[day]; const hasSeals=DAYS.some(d=>!!seals[d]); const week=hasSeals?{...s.week,daySeals:seals}:{...s.week,mode:"draft" as Mode,sealedAt:undefined,reviewOpenUntil:undefined,emergencyReviewRequestedAt:undefined,emergencyReviewUnlockAt:undefined,daySeals:seals}; return{...s,week,blocks:s.blocks.map(b=>b.day===day?{...b,sealed:false}:b),toast:"Day unsealed."};});}
  function sealWeek(){playSfx(canSeal(r,state.week)?"seal":"error"); patch(s=>{const rr=report(s.blocks,s.tasks); if(!canSeal(rr,s.week))return{...s,toast:rr.sealDisabledReason||"Cannot seal yet."}; const daySeals=DAYS.reduce((a,d)=>({...a,[d]:{sealedAt:new Date().toISOString()}}),{} as Partial<Record<DayKey,DaySeal>>); const next={...s,week:{mode:"sealed" as Mode,sealedAt:new Date().toISOString(),daySeals},blocks:s.blocks.map(b=>({...b,sealed:true}))}; return{...next,blocks:ensureReviewBlock(next,"sun"),toast:"Week sealed. Review block added."};});}
  function blockAction(id:string,action:"tier"|"done"|"missed"|"remove"|"pause"|"review"){const current=state.blocks.find(x=>x.id===id); const currentTask=current?state.tasks[current.taskId]:undefined; playSfx(!current||!currentTask?"error":action==="done"?(currentTask.kind==="reward"?"reward":currentTask.kind==="recovery"?"recover":"complete"):action==="missed"?"error":action==="pause"?"pause":action==="review"?"review":action==="remove"?"edit":"tick"); patch(s=>{const b=s.blocks.find(x=>x.id===id); if(!b)return{...s,toast:"Block not found."}; const t=s.tasks[b.taskId]; if(!t)return{...s,toast:"Action not found."}; if(action==="remove"||action==="tier"){if(!canEditDay(s,b.day))return{...s,toast:"Open Review before editing a sealed day."};}
    if(action==="remove"){if(isSystemTask(t))return{...s,toast:"System blocks cannot be deleted."}; return{...s,blocks:normalize(s.blocks.filter(x=>x.id!==id))};}
    if(action==="tier")return{...s,blocks:s.blocks.map(x=>x.id===id?{...x,tier:x.tier===1?2:x.tier===2?3:1}:x)};
    if(action==="done"){const tier=getTier(t,b.tier), already=b.status==="done"; if(already)return{...s,blocks:s.blocks.map(x=>x.id===id?{...x,status:"done"}:x)}; const player=applyPlayerGain(s.player,tier.xp,t.tokenEarn-(t.kind==="reward"?t.tokenCost:0),t.kind==="recovery"); const levelUp=player.level>rsLevelForXp(s.player.xp)?player.level:undefined; emitRewardNearBlock(id,tier.xp,levelUp,"done"); return{...s,blocks:s.blocks.map(x=>x.id===id?{...x,status:"done"}:x),player};}
    if(action==="missed"){const has=s.blocks.some(x=>x.day===b.day&&x.taskId==="recovery"&&x.status==="recoveryDue"); const recovery=makeBlock(s.tasks.recovery,b.day,nextOrder(s.blocks,b.day)); return{...s,blocks:normalize([...s.blocks.map(x=>x.id===id?{...x,status:"missed" as Status}:x),...(has?[]:[{...recovery,tier:1 as const,status:"recoveryDue" as Status,injected:true}])]),player:{...s.player,streakState:"fractured"},toast:has?"Miss noted.":"Recovery added."};}
    if(action==="pause"){if(t.kind!=="pause")return{...s,toast:"Not a Pause block."}; return{...s,blocks:s.blocks.map(x=>x.id===id?{...x,status:"done",pauseAppliedAt:new Date().toISOString()}:x.day===b.day&&x.order>b.order&&x.status==="planned"?{...x,status:"paused"}:x),toast:"Rest of day paused."};}
    if(action==="review"){if(t.kind!=="review")return{...s,toast:"Not a Review block."}; if(!hasAnySealed(s))return{...s,toast:"Seal a day or week before using Review."}; if(!b.reviewUnlockAt||new Date(b.reviewUnlockAt).getTime()>Date.now())return{...s,toast:`Review opens in ${countdown(b.reviewUnlockAt)}.`}; return{...s,week:{...s.week,mode:"reviewOpen",reviewOpenUntil:new Date(Date.now()+REVIEW_WINDOW).toISOString()},blocks:s.blocks.map(x=>x.id===id?{...x,status:"done",reviewOpenedAt:new Date().toISOString()}:x),toast:"Review active. Sealed days can now be unsealed."};}
    return s;});}
  type D=Partial<Record<DayKey,DaySeal>>;
  function requestGate(){playSfx(hasAnySealed(state)?"review":"error"); patch(s=>{if(!hasAnySealed(s))return{...s,toast:"Seal a day or week first."}; const unlock=new Date(Date.now()+REVIEW_DELAY).toISOString(); const day=firstSealedDay(s); const next={...s,week:{...s.week,mode:"reviewPending" as Mode,emergencyReviewRequestedAt:new Date().toISOString(),emergencyReviewUnlockAt:unlock}}; return{...next,blocks:ensureReviewBlock(next,day,unlock),toast:"Review Gate requested. Review block added."};});}
  function openGate(){playSfx(gateReady?"review":"error"); patch(s=>{if(s.week.mode!=="reviewPending"||!s.week.emergencyReviewUnlockAt)return{...s,toast:"No gate pending."}; if(new Date(s.week.emergencyReviewUnlockAt).getTime()>Date.now())return{...s,toast:`Gate opens in ${countdown(s.week.emergencyReviewUnlockAt)}.`}; return{...s,week:{...s.week,mode:"reviewOpen",reviewOpenUntil:new Date(Date.now()+REVIEW_WINDOW).toISOString()},toast:"Review active. Sealed days can now be unsealed."};});}
  async function importPlan(file?:File){if(!file)return; try{const parsed=validatePlan(JSON.parse(await file.text())); playSfx("open"); setState({...parsed,toast:"Plan imported."});}catch(e){playSfx("error"); setState(s=>({...s,toast:e instanceof Error?e.message:"Plan import failed."}));}}
  async function importBank(file?:File){if(!file)return; try{const bank=validateBank(JSON.parse(await file.text())); const importedIds=Object.keys(bank.tasks); playSfx("open"); setState(s=>({...s,tasks:{...s.tasks,...bank.tasks},deletedTaskIds:s.deletedTaskIds.filter(id=>!importedIds.includes(id)),toast:`Action bank imported (${importedIds.length}).`}));}catch(e){playSfx("error"); setState(s=>({...s,toast:e instanceof Error?e.message:"Action bank import failed."}));}}
  function exportPlan(){playSfx("open"); downloadJson(`habit-plan-${new Date().toISOString().slice(0,10)}.json`,{...state,exportedAt:new Date().toISOString(),toast:undefined}); setState(s=>({...s,toast:"Plan exported."}));}
  function exportBank(){playSfx("open"); downloadJson(`habit-action-bank-${new Date().toISOString().slice(0,10)}.json`,{schemaVersion:28,kind:"habit-action-bank",exportedAt:new Date().toISOString(),tasks:state.tasks}); setState(s=>({...s,toast:"Action bank exported."}));}
  function exportTemplate(){playSfx("open"); downloadJson("habit-action-bank-template.json",{schemaVersion:28,kind:"habit-action-bank",exportedAt:new Date().toISOString(),tasks:{example_custom_action:makeCustom("Example Custom Action","discipline")}}); setState(s=>({...s,toast:"Template downloaded."}));}
  function starter(){if(state.blocks.length){playSfx("error"); setState(s=>({...s,toast:"Starter only works on a blank week."})); return;} playSfx("drop"); const starter:[DayKey,string][]=[["mon","pushups"],["mon","tuna"],["mon","walk"],["tue","focus"],["tue","game"],["wed","pushups"],["wed","tuna"],["thu","focus"],["thu","pause"],["fri","walk"],["fri","pizza"],["sun","review"]]; let blocks:Block[]=[]; for(const [d,id] of starter){const task=state.tasks[id]; if(task) blocks.push(makeBlock(task,d,nextOrder(blocks,d)));} setState(s=>({...s,blocks:normalize(blocks),toast:blocks.length?"Starter week added.":"Starter actions were removed from the bank."}));}
  function fullWipe(){playSfx("reset"); clearPlannerPersistence(); setDrag(null); setExpanded(null); setPopover(null); setMenu(false); setResetConfirm(false); setEditingTaskId(null); setState(s=>{const next=resetPlannerState(s); try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...next,toast:undefined}));}catch{} return next;});}
  function removeBankAction(taskId:string){playSfx("edit"); if(editingTaskId===taskId)setEditingTaskId(null); setState(s=>{const task=s.tasks[taskId]; if(!task)return s; if(isSystemTask(task))return{...s,toast:"System actions cannot be deleted."}; const nextTasks={...s.tasks}; delete nextTasks[taskId]; const removedBlocks=s.blocks.filter(b=>b.taskId===taskId).length; const nextBlocks=normalize(s.blocks.filter(b=>b.taskId!==taskId)); const deletedTaskIds=Array.from(new Set([...(s.deletedTaskIds||[]),taskId])); return {...s,tasks:nextTasks,deletedTaskIds,blocks:nextBlocks,toast:removedBlocks?`Deleted ${task.title} and ${removedBlocks} planned block${removedBlocks===1?"":"s"}.`:`Deleted ${task.title}.`};});}
  function toggleTheme(){playSfx("open"); setState(s=>({...s,theme:s.theme==="dark"?"light":"dark",toast:s.theme==="dark"?"Light theme":"Dark theme"}));}

  function renderBlock(b:Block, beamHit=false, timeMode=false, timeMeta?:{start:number;duration:number;end:number}){
    const t=state.tasks[b.taskId];
    if(!t)return null;
    const tier=getTier(t,b.tier);
    const open=expanded===b.id;
    const reviewLive=t.kind==="review"&&state.week.mode==="reviewOpen"&&!!b.reviewOpenedAt;
    const canEdit=canEditDay(state,b.day);
    const protectedTask=isSystemTask(t);
    const timer=blockTiming(t,b,state.week,state.weekStartIso,reviewLive);
    const status=reviewLive?"Review active":timer?.label||(b.status==="planned"?(t.kind==="review"?countdown(b.reviewUnlockAt):t.kind==="pause"?"Pause":"Ready"):b.status);
    const kindLabel=t.kind==="discipline"?"Discipline":t.kind==="reward"?"Reward":t.kind==="recovery"?"Recovery":t.kind==="review"?"Review":t.kind==="pause"?"Pause":"Action";
    const stats=[tier.xp?{spec:iconSprites.core.xp,label:`+${tier.xp} XP`}:null,t.tokenEarn?{spec:iconSprites.core.token,label:`+${t.tokenEarn}`}:null,t.tokenCost?{spec:iconSprites.core.token,label:`-${t.tokenCost}`}:null,tier.relief?{spec:iconSprites.core.streak,label:`-${tier.relief} tension`}:null].filter(Boolean) as {spec:SpriteSpec;label:string}[];
    const close=()=>{setExpanded(null); setPopover(null);};
    const openPopover=(el:HTMLElement)=>{const rect=el.getBoundingClientRect(); const width=Math.min(380, Math.max(300, window.innerWidth*0.28)); const gap=14; const rightSide=rect.right+gap; const leftSide=rect.left-gap-width; const left=rightSide+width<=window.innerWidth-14?rightSide:leftSide>=14?leftSide:Math.max(12,Math.min(window.innerWidth-width-12,rect.left)); const estimatedHeight=260; const top=Math.max(12, Math.min(rect.top-8, window.innerHeight-estimatedHeight-12)); setPopover({blockId:b.id, top, left, width}); setExpanded(b.id);};
    const action=(name:"tier"|"done"|"missed"|"remove"|"pause"|"review")=>{blockAction(b.id,name); close();};
    return <article key={b.id} data-block-id={b.id} data-block-root data-drop-block={b.id} data-kind={t.kind} data-category={t.category} data-status={b.status} data-accent={t.accent} className={`block-card ${timeMode?"time-card":""} ${t.kind} ${t.accent} ${b.status} ${open?"expanded":""} ${reviewLive?"review-live":""} ${beamHit?"beam-hit":""}`} onClick={e=>{e.stopPropagation(); const el=e.currentTarget as HTMLElement; if(open) close(); else openPopover(el);}}>
      <button className="drag-handle" onPointerDown={e=>startDrag(e,{type:"block",blockId:b.id,x:e.clientX,y:e.clientY})}>⋮⋮</button>
      <i className={`block-accent ${t.kind}`}/>
      <div className="block-main">
        <div className="block-icon"><SpriteIcon spec={taskSprite(t)} className="task-sprite"/></div>
        <div className="block-copy">
          <div className="block-meta-row"><span className={`kind-pill ${t.kind}`}>{kindLabel}</span>{protectedTask&&<span className="system-badge">System</span>}<span className={`status-pill ${b.status}`}><SpriteIcon spec={statusSprite(b.status)} className="pill-icon"/>{status}</span></div>
          <div className="block-title-row"><strong>{t.title}</strong></div>
          <small>{timeMode && timeMeta ? `${formatMinutes(timeMeta.start)}–${formatMinutes(timeMeta.end)} · ${timeMeta.duration}m` : `${tier.label} · ${tier.minutes?`${tier.minutes}m`:"No timer"}`}</small>
          {!!stats.length&&<div className="block-stat-row">{stats.map((item,i)=><span key={i}><SpriteIcon spec={item.spec}/>{item.label}</span>)}</div>}
          {timer&&<div className={`block-timer ${timer.tone}`}><span>{timer.detail}</span><i><em style={{width:`${timer.progress}%`}}/></i></div>}
        </div>
      </div>
      {open&&popover?.blockId===b.id&&createPortal(<div data-block-popover className={`block-popover block-popover-overlay ${timeMode?"time-mode":""}`} style={{top:popover.top,left:popover.left,width:popover.width}} onClick={e=>e.stopPropagation()}>
        <div className="block-popover-head"><div><strong>{t.title}</strong><small>{timeMode && timeMeta ? `${formatMinutes(timeMeta.start)}–${formatMinutes(timeMeta.end)} · ${timeMeta.duration} min` : `${kindLabel} · ${tier.label}${tier.minutes?` · ${tier.minutes} min`:""}`}</small></div><button className="popover-close" onClick={close}>✕</button></div>
        <div className="popover-actions">{t.kind==="review"?<><button className="primary" onClick={()=>action("review")}>Open Review</button>{protectedTask?<button className="ghost" disabled>System block</button>:<button className="ghost" disabled={!canEdit} onClick={()=>action("remove")}>Delete block</button>}</>:t.kind==="pause"?<><button className="primary" onClick={()=>action("pause")}>Pause rest of day</button>{protectedTask?<button className="ghost" disabled>System block</button>:<button className="ghost" disabled={!canEdit} onClick={()=>action("remove")}>Delete block</button>}</>:t.kind==="recovery"?<><button className="soft" disabled={!canEdit} onClick={()=>action("tier")}>Tier {b.tier}</button><button className="success" onClick={()=>action("done")}>Done</button><button className="danger" onClick={()=>action("missed")}>Report missed</button>{protectedTask?<button className="ghost" disabled>System block</button>:<button className="ghost" disabled={!canEdit} onClick={()=>action("remove")}>Delete block</button>}</>:<><button className="soft" disabled={!canEdit} onClick={()=>action("tier")}>Tier {b.tier}</button><button className="success" onClick={()=>action("done")}>Done</button><button className="danger" onClick={()=>action("missed")}>Report missed</button><button className="ghost" disabled={!canEdit} onClick={()=>action("remove")}>Delete block</button></>}</div>
      </div>, document.body)}
    </article>;
  }
  function renderDay(day:DayKey){
    const blocks=dayBlocks(state.blocks,day);
    const daySealed=isDaySealed(state,day);
    const past=isPast(state.weekStartIso,day);
    const today=isToday(state.weekStartIso,day);
    return <section key={day} data-drop-day={day} className={`day-column ${today?"today":""} ${past?"past":""} ${daySealed?"sealed":""} ${state.week.mode==="reviewOpen"?"review-open":""} ${state.selectedDay===day?"selected":""}`} title={dateTitle(state.weekStartIso,day)} onClick={()=>setState(s=>({...s,selectedDay:day}))}>
      <header className="day-head"><div className="day-orb"><span>{day[0].toUpperCase()}</span></div><div><strong>{day.toUpperCase()}</strong><small>{dateShort(state.weekStartIso,day)}</small></div>{daySealed?<button onClick={e=>{e.stopPropagation(); unsealDay(day);}}>{state.week.mode==="reviewOpen"?"Unseal":"Sealed"}</button>:<button onClick={e=>{e.stopPropagation(); sealDay(day);}}>Seal</button>}</header>
      <div className="day-stack">{blocks.map(b=>renderBlock(b))}{!blocks.length&&<div className="drop-hint"><span/><small>Drop here</small></div>}</div>
    </section>;
  }
  function renderTimeView(){
    const todayDay=visibleDays.find(day=>isToday(state.weekStartIso,day));
    const nowLine=todayDay?currentLineInfo(state.weekStartIso,todayDay,state.timeFilter):null;
    const frame=calendarFrame(state.timeFilter);
    const frameMinutes=frame.end-frame.start;
    const hours=Array.from({length:frameMinutes/60+1},(_,i)=>frame.start+i*60);
    return <div className="calendar-week">
      <div ref={calendarShellRef} className="calendar-grid-shell" style={{gridTemplateRows:`50px ${frameMinutes*CAL_PX_PER_MIN}px`,minHeight:50+frameMinutes*CAL_PX_PER_MIN}}>
        <div className="calendar-head-spacer" />
        {visibleDays.map(day=>{const sealed=isDaySealed(state,day); const past=isPast(state.weekStartIso,day); const today=isToday(state.weekStartIso,day); return <div key={day} className={`calendar-day-head ${today?"today":""} ${past?"past":""} ${sealed?"sealed":""}`} onClick={()=>setState(s=>({...s,selectedDay:day}))} title={dateTitle(state.weekStartIso,day)}><strong>{day.toUpperCase()}</strong><small>{dateShort(state.weekStartIso,day)}</small>{sealed&&<span>Locked</span>}</div>})}
        <div className="calendar-axis">{hours.map(h=><div key={h} className="calendar-hour-label" style={{top:(h-frame.start)*CAL_PX_PER_MIN}}>{formatMinutes(h)}</div>)}</div>{nowLine&&beamGeom&&<div className={`calendar-beam ${beamGeom.hasTarget?"has-target":"no-target"}`} style={{top:beamGeom.top,left:beamGeom.left,width:beamGeom.width}}><span>{nowLine.label}</span><i className="beam-core"/><i className="beam-aura"/><i className="beam-sparks"/></div>}
        {visibleDays.map(day=>{const blocks=dayBlocks(state.blocks,day); const today=isToday(state.weekStartIso,day); const sealed=isDaySealed(state,day); const past=isPast(state.weekStartIso,day); return <div key={day} data-drop-day={day} data-calendar-day={day} data-frame-start={frame.start} data-frame-end={frame.end} className={`calendar-day-lane ${today?"today":""} ${past?"past":""} ${sealed?"sealed":""}`}>{hours.slice(0,-1).map(h=><span key={h} className="calendar-hour-line" style={{top:(h-frame.start)*CAL_PX_PER_MIN}}/>)}{blocks.map((b,i)=>{const t=state.tasks[b.taskId]; if(!t)return null; const tier=getTier(t,b.tier); const meta=eventTimeMeta(b,i,tier); if(meta.end<=frame.start||meta.start>=frame.end)return null; const visibleStart=Math.max(meta.start,frame.start); const visibleEnd=Math.min(meta.end,frame.end); const top=(visibleStart-frame.start)*CAL_PX_PER_MIN; const rawHeight=(visibleEnd-visibleStart)*CAL_PX_PER_MIN; const height=Math.max(30,rawHeight); const density=height<46?"micro-event":height<68?"compact-event":""; const hit=today&&nowLine&&nowLine.minutes>=meta.start&&nowLine.minutes<=meta.end; return <div key={b.id} data-event-id={b.id} className={`calendar-event-shell ${density} ${hit?"beam-hit-shell":""}`} style={{top,height}}>{renderBlock(b,!!hit,true,meta)}<button className="calendar-resize" title={`Resize duration · ${meta.duration} min`} onPointerDown={e=>resizeTimeBlock(e,b)}><span>{meta.duration}m</span></button></div>})}</div>})}
      </div>
    </div>;
  }
  const dragTask=drag?.type==="task"?state.tasks[drag.taskId]:drag?.type==="block"?state.tasks[state.blocks.find(b=>b.id===drag.blockId)?.taskId||""]:undefined;
  const editingTask=editingTaskId?state.tasks[editingTaskId]:undefined;
  const gateReady=state.week.mode==="reviewPending"&&!!state.week.emergencyReviewUnlockAt&&new Date(state.week.emergencyReviewUnlockAt).getTime()<=Date.now();
  return <main className="app-shell" style={appAssetVars}>
    <header className="topbar glass-panel">
      <div className="topbar-start">
        <button className="brand" onClick={()=>setState(s=>({...s,activeView:"plan"}))}>
          <span className="brand-mark" aria-hidden="true"><img src={visualAssets.brandMark} alt=""/></span>
          <span className="brand-copy"><strong>Habit Planner</strong></span>
        </button>
      </div>
      <div className="top-status">
        <span className="top-chip level-chip">LV {playerProgress.level}</span>
        <span className="xp-status"><b>{compactNumber(playerProgress.xp)} XP</b><i><em style={{width:`${playerProgress.progress*100}%`}}/></i><small>{playerProgress.level>=RS_MAX_LEVEL?"Max level":"to "+(playerProgress.level+1)}</small></span>
        <span className="top-chip token-chip"><SpriteIcon spec={iconSprites.core.token} className="top-icon"/>◈ {state.player.tokens}</span>
        <span className={`top-chip streak ${state.player.streakState}`}><SpriteIcon spec={iconSprites.core.streak} className="top-icon"/>✦ {state.player.streakDays}d</span>
        <span className={`top-chip mode ${state.week.mode}`}>{state.week.mode==="reviewOpen"?`Review ${countdown(state.week.reviewOpenUntil)}`:state.week.mode==="reviewPending"?`Gate ${countdown(state.week.emergencyReviewUnlockAt)}`:state.week.mode==="sealed"?"Sealed":"Draft"}</span>
      </div>
      <div className="top-actions">
        <div className="top-nav">
          <button className={`soft-action nav-shortcut ${state.activeView==="plan"?"active":""}`} onClick={()=>setState(s=>({...s,activeView:"plan"}))}>Plan</button>
          <button className={`soft-action nav-shortcut ${state.activeView==="today"?"active":""}`} onClick={()=>setState(s=>({...s,activeView:"today"}))}>Today</button>
        </div>
        <div className="top-utility">
          <button className={`soft-action sound-toggle ${state.audioMuted?"muted":""}`} onClick={toggleSound}>{state.audioMuted?"Sound off":"Sound on"}</button>
          {state.blocks.length===0&&<button className="soft-action" onClick={starter}>Starter</button>}
          {hasAnySealed(state)&&state.week.mode!=="reviewOpen"&&state.week.mode!=="reviewPending"&&<button className="soft-action" onClick={requestGate}>Review Gate</button>}
          {state.week.mode==="reviewPending"&&<button className="soft-action" disabled={!gateReady} onClick={openGate}>{gateReady?"Open Gate":`Gate ${countdown(state.week.emergencyReviewUnlockAt)}`}</button>}
          <button className={`seal-action ${r.status}`} onClick={sealWeek}>{state.week.mode==="reviewOpen"?"Reseal":"Seal Week"}</button>
          <button className="soft-action more-action" aria-expanded={menu} onClick={()=>{setMenu(m=>!m); if(menu)setResetConfirm(false);}}>⋯</button>
          {menu&&<div className={`pop-menu ${resetConfirm?"confirming":""}`}>{resetConfirm?<div className="menu-reset-confirm"><strong>Clear current plan and progression?</strong><small>This wipes planned blocks, XP, tokens, streaks, completion state, and review/seal state. Reset count is preserved.</small><button className="danger-menu" onClick={fullWipe}>Confirm full reset</button><button onClick={()=>setResetConfirm(false)}>Cancel</button></div>:<><button className="danger-menu" onClick={()=>setResetConfirm(true)}>Reset progress</button><button onClick={()=>{exportPlan();setMenu(false);}}>Export plan</button><button onClick={()=>{planImport.current?.click();setMenu(false);}}>Import plan</button><button onClick={()=>{toggleTheme();setMenu(false);}}>{state.theme==="dark"?"Light theme":"Dark theme"}</button><button onClick={()=>{setState(s=>({...s,weekStartIso:startOfWeekIso()}));setMenu(false);}}>This week</button></>}</div>}
        </div>
      </div>
      <input ref={planImport} className="file-input" type="file" accept="application/json,.json" onChange={e=>importPlan(e.target.files?.[0])}/>
    </header>
    <section className={`workspace ${state.activeView==="plan"?"plan-workspace":"single-workspace"}`}>
      {state.activeView==="plan"&&<>
        <aside className="action-bank glass-panel">
          <div className="bank-head"><strong>Action Bank</strong><button onClick={()=>setBankMenu(!bankMenu)}>Options</button></div>
          <label className="bank-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search actions"/></label>
          <div className="chip-row">{(["All","Body","Food","Focus","Dopa","Recovery","System"] as const).map(c=><button key={c} className={chip===c?"active":""} onClick={()=>setChip(c)}>{c}</button>)}</div>
          {bankMenu&&<div className="bank-tools"><button onClick={exportBank}>Export bank</button><button onClick={()=>bankImport.current?.click()}>Import bank</button><button onClick={exportTemplate}>Template</button></div>}
          <button className="add-action-toggle" onClick={()=>setShowAdd(!showAdd)}>{showAdd?"Close":"+ New action"}</button>
          {showAdd&&<div className="add-action"><input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Action name"/><div>{(["discipline","reward","recovery","review","pause"] as Kind[]).map(k=><button key={k} className={newKind===k?"active":""} onClick={()=>setNewKind(k)}>{k}</button>)}</div><button onClick={addCustom}>Add action</button></div>}
          {editingTask&&!isSystemTask(editingTask)&&<div className="bank-editor" data-kind={editingTask.kind} data-category={editingTask.category} data-accent={editingTask.accent}>
            <div className="bank-editor-head"><span><SpriteIcon spec={taskSprite(editingTask)}/></span><strong>{editingTask.title}</strong><button onClick={()=>setEditingTaskId(null)}>Close</button></div>
            <div className="bank-editor-section"><small>Category</small><div>{CATEGORY_OPTIONS.map(c=><button key={c} className={editingTask.category===c?"active":""} onClick={()=>editBankAction(editingTask.id,{category:c})}><SpriteIcon spec={itemCategorySprites[c]||categorySprites[c]}/>{c}</button>)}</div></div>
            <div className="bank-editor-section"><small>Path</small><div>{KIND_OPTIONS.map(k=><button key={k} className={editingTask.kind===k?"active":""} onClick={()=>editBankAction(editingTask.id,{kind:k})}><SpriteIcon spec={itemKindSprites[k]||kindSprites[k]}/>{k}</button>)}</div></div>
          </div>}
          <div className="bank-strip">{filteredTasks.map(t=><div key={t.id} data-kind={t.kind} data-category={t.category} data-accent={t.accent} className={`bank-card ${t.kind} ${t.accent} ${editingTaskId===t.id?"editing":""}`} onPointerDown={e=>startDrag(e,{type:"task",taskId:t.id,x:e.clientX,y:e.clientY})}><span className="bank-icon"><SpriteIcon spec={taskSprite(t)}/></span><span className="bank-copy"><strong>{t.title}</strong><small>{t.kind==="reward"?`${t.tokenCost} tokens`:t.kind}</small></span>{isSystemTask(t)?<span className="bank-lock" title="Protected system action"><SpriteIcon spec={iconSprites.core.mark} className="lock-icon"/></span>:<span className="bank-card-actions"><button className="bank-edit" aria-label={`Edit ${t.title}`} title="Edit action" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();playSfx("open");setEditingTaskId(editingTaskId===t.id?null:t.id);}}><SpriteIcon spec={iconSprites.core.mark} className="lock-icon"/></button><button className="bank-remove bank-x" aria-label={`Delete ${t.title}`} title="Delete from Action Bank" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();removeBankAction(t.id);}}>×</button></span>}</div>)}{!filteredTasks.length&&<div className="bank-empty">No actions found.</div>}</div>
          <input ref={bankImport} className="file-input" type="file" accept="application/json,.json" onChange={e=>importBank(e.target.files?.[0])}/>
        </aside>
        <section className="week-panel glass-panel">
          <div className="week-head"><div><h1>Week</h1><p>{state.week.mode==="reviewOpen"?"Review window open. Edit, then reseal.":"Drag actions into days. Seal one day or the full week when it feels stable."}</p></div><div className="week-controls">
  <div className="week-nav-cluster"><button aria-label="Previous week" onClick={()=>setState(s=>({...s,weekStartIso:addDays(new Date(s.weekStartIso),-7).toISOString()}))}>←</button><strong title={weekLabel(state.weekStartIso)}>{weekLabel(state.weekStartIso)}</strong><button aria-label="Next week" onClick={()=>setState(s=>({...s,weekStartIso:addDays(new Date(s.weekStartIso),7).toISOString()}))}>→</button></div>
  <div className="week-action-cluster"><button onClick={()=>setState(s=>({...s,weekStartIso:startOfWeekIso()}))}>Today</button><button className={state.hidePastDays?"active":""} onClick={()=>setState(s=>({...s,hidePastDays:!s.hidePastDays}))}>Hide past</button></div>
  <div className="view-cluster"><button className={state.planningView==="blocks"?"active":""} onClick={()=>setState(s=>({...s,planningView:"blocks"}))}>Blocks</button><button className={state.planningView==="time"?"active":""} onClick={()=>setState(s=>({...s,planningView:"time"}))}>Time</button></div>
  {state.planningView==="time"&&<div className="time-filter-cluster">{(["morning","afternoon","both"] as TimeFilter[]).map(f=><button key={f} className={state.timeFilter===f?"active":""} onClick={()=>setState(s=>({...s,timeFilter:f}))}>{f}</button>)}</div>}
</div><div className={`equilibrium ${r.status}`}><div><span className="eq-dot"/><strong>{r.status==="balanced"?"Balanced":r.status==="thinIce"?"Thin ice":"Red zone"}</strong><small>{r.netTension}</small></div><span className="eq-track"><i style={{width:`${Math.max(4,Math.min(100,45+r.netTension))}%`}}/></span>{r.sealDisabledReason&&<p>{r.sealDisabledReason}</p>}</div></div><div className="week-scroll">{state.planningView==="blocks"?<div className="week-row">{visibleDays.map(day=>renderDay(day))}</div>:renderTimeView()}</div></section></>}{state.activeView==="today"&&<Today state={state} blockAction={blockAction}/>}</section>
    <nav className="bottom-nav">{(["plan","today"] as const).map(v=><button key={v} className={state.activeView===v?"active":""} onClick={()=>setState(s=>({...s,activeView:v}))}>{v[0].toUpperCase()+v.slice(1)}</button>)}</nav>
    {state.toast&&<div className="toast glass-panel">{state.toast}</div>}
    {drag&&dragTask&&<div className="drag-overlay" style={{left:drag.x,top:drag.y}}><div className={`mini-card ${dragTask.accent}`}><span><SpriteIcon spec={taskSprite(dragTask)}/></span><strong>{dragTask.title}</strong></div></div>}
    {bursts.map(b=><div key={b.id} className={`completion-burst ${b.mode}`} style={{left:b.x,top:b.y}}>{Array.from({length:b.mode==="level"?22:14},(_,i)=><span key={i} style={{["--i" as any]:i} as React.CSSProperties}/> )}</div>)}
    {xpFloats.map(f=><div key={f.id} className={`xp-float ${f.levelUp?"level-up":""}`} style={{left:f.x,top:f.y}}><strong>+{f.xp} XP</strong>{f.levelUp&&<span>LEVEL {f.levelUp}</span>}</div>)}
  </main>;
}
function Today({state,blockAction}:{state:State;blockAction:(id:string,a:"tier"|"done"|"missed"|"remove"|"pause"|"review")=>void}){
  const blocks=dayBlocks(state.blocks,state.selectedDay);
  const current=blocks.find(b=>b.status==="planned"||b.status==="recoveryDue");
  const currentTask=current?state.tasks[current.taskId]:undefined;
  return <section className="today-panel glass-panel">
    <div className="today-head"><div className="today-ring"><span>{blocks.length?Math.round(blocks.filter(b=>b.status==="done"||b.status==="paused").length/blocks.length*100):0}%</span></div><div><h1>Today</h1><p>Assumed complete unless you report otherwise.</p></div></div>
    {current&&currentTask?<article className="today-current" data-kind={currentTask.kind} data-category={currentTask.category}><span className="today-current-icon"><SpriteIcon spec={taskSprite(currentTask)}/></span><strong>{currentTask.title}</strong><button onClick={()=>blockAction(current.id,"done")}>Done</button><button onClick={()=>blockAction(current.id,"missed")}>Missed</button></article>:<div className="quiet-empty">No active exception.</div>}
    <div className="today-queue">{blocks.map(b=>{const t=state.tasks[b.taskId]; return t?<div className={`queue-line ${b.status}`} data-status={b.status} data-kind={t.kind} key={b.id}><span><SpriteIcon spec={taskSprite(t)}/></span><strong>{t.title}</strong><small>{b.status}</small></div>:null;})}</div>
  </section>;
}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error?:Error}>{state:{error?:Error}={}; static getDerivedStateFromError(error:Error){return{error};} render(){if(this.state.error)return <main className="fallback-screen"><section className="fallback-card"><h1>Planner could not start.</h1><p>{this.state.error.message}</p><button onClick={()=>{for(const k of Object.keys(localStorage))if(k.startsWith("habit-planner-rpg"))localStorage.removeItem(k); location.reload();}}>Reset local plan</button></section></main>; return this.props.children;}}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
