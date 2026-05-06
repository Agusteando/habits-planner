import { usePlanner } from "../state/plannerStore";

export function EquilibriumMeter() {
  const { report } = usePlanner();
  const pct = Math.max(4, Math.min(100, 45 + report.netTension));

  return (
    <section className={`equilibrium ${report.status}`}>
      <div className="eq-meta">
        <span className="eq-dot" />
        <strong>{report.status === "balanced" ? "Balanced" : report.status === "thinIce" ? "Thin ice" : "Red zone"}</strong>
        <small>{report.netTension}</small>
      </div>
      <div className="eq-track">
        <span style={{ width: `${pct}%` }} />
        <i className="eq-mid" />
        <i className="eq-red" />
      </div>
      {report.sealDisabledReason && <p>{report.sealDisabledReason}</p>}
    </section>
  );
}
