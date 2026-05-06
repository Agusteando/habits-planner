import { CSSProperties } from "react";
import { getDayBlocks, shortDayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/PlannerContext";
import { BlockCard } from "./BlockCard";
export function DayColumn({ day, mobile = false }: { day: DayKey; mobile?: boolean }) { const { blocks, tasks, setSelectedDay } = usePlanner(); const dayBlocks = getDayBlocks(blocks, day); const done = dayBlocks.filter((b) => b.status === "done").length; const progress = done / Math.max(1, dayBlocks.length); return <article className={`day-column ${mobile ? "mobile" : ""}`} data-drop-day={day} onClick={() => setSelectedDay(day)}><header><div className="day-orb" style={{ "--p": progress } as CSSProperties}>{shortDayLabel(day).slice(0,1)}</div><div><strong>{shortDayLabel(day)}</strong><small>{dayBlocks.length || "drop"}</small></div></header><div className="day-stack">{dayBlocks.map((block) => { const task = tasks[block.taskId]; return task ? <BlockCard key={block.id} task={task} block={block} compact={!mobile} /> : null; })}{dayBlocks.length === 0 && <div className="empty-day"><span />Drop here</div>}</div></article>; }
