import { DAYS, HOURS, shortDayLabel } from "../domain/rules";
import { DayKey } from "../domain/types";
import { usePlanner } from "../state/PlannerContext";
import { BlockCard } from "./BlockCard";
function Slot({ day, hour, board = false }: { day: DayKey; hour: string; board?: boolean }) { const { blocks, tasks } = usePlanner(); const matches = blocks.filter((b) => b.day === day && b.at?.startsWith(hour)).sort((a,b)=>a.order-b.order); return <div className={board ? "time-cell" : "time-slot"} data-drop-day={day} data-drop-hour={hour}>{!board && <time>{hour}:00</time>}<div className="time-stack">{matches.map((b) => { const task = tasks[b.taskId]; return task ? <BlockCard key={b.id} task={task} block={b} compact quiet={board} /> : null; })}{matches.length === 0 && <span className="slot-ghost" />}</div></div>; }
export function TimeLens({ day }: { day: DayKey }) { return <section className="time-lens glass-panel">{HOURS.map((hour) => <Slot key={hour} day={day} hour={hour} />)}</section>; }
export function TimeBoard() { return <div className="time-board"><div className="time-head" />{DAYS.map((day)=><div className="time-head" key={day}>{shortDayLabel(day).slice(0,3)}</div>)}{HOURS.map((hour)=><div className="time-row" key={hour}><time>{hour}:00</time>{DAYS.map((day)=><Slot key={`${day}-${hour}`} day={day} hour={hour} board />)}</div>)}</div>; }
