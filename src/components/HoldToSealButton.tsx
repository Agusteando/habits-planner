import { useEffect, useRef, useState } from "react";
import { canSealWeek } from "../domain/rules";
import { usePlanner } from "../state/PlannerContext";

export function HoldToSealButton() {
  const { report, week, sealWeek, requestReviewGate } = usePlanner();
  const allowed = canSealWeek(report, week);
  const [p, setP] = useState(0);
  const [burst, setBurst] = useState(false);
  const timer = useRef<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function down() {
    if (!allowed) return;
    start.current = performance.now();
    timer.current = window.setInterval(() => {
      const next = Math.min(1, (performance.now() - start.current) / 1200);
      setP(next);
      if (next >= 1) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        sealWeek();
        setBurst(true);
        setTimeout(() => setBurst(false), 900);
      }
    }, 16);
  }

  function up() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setP(0);
  }

  if (week.mode === "sealed") return <button className="seal sealed" onClick={requestReviewGate}>Review</button>;
  if (week.mode === "reviewPending") return <button className="seal review" disabled>24h Gate</button>;
  return <button className={`seal ${allowed ? "" : "disabled"}`} onPointerDown={down} onPointerUp={up} onPointerLeave={up} disabled={!allowed}><i style={{ width: `${p * 100}%` }} /><span>Hold to seal</span>{burst && <b />}</button>;
}
