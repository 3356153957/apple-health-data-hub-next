import type { TodayCopy } from "../lib/todayCopy";
import type { TodayHighlight } from "./RecoveryHero";

// The sync-plumbing strip, relocated OUT of the emotional hero (per the
// instrument-grammar restructure): Last sync / Signals / Ready / Changes, plus
// the freshness affordance. All four facts stay reachable; nothing is deleted —
// they simply no longer compete with the lead finding.
export function TodayPlumbing({
  copy,
  highlights,
  live,
}: {
  copy: TodayCopy["plumbing"];
  highlights: TodayHighlight[];
  live: boolean;
}) {
  if (highlights.length === 0) return null;
  return (
    <section className="today-plumbing" aria-label={copy.aria}>
      <div className="today-plumbing-head">
        <span>{copy.title}</span>
        <strong className={live ? "" : "watch"}>{live ? copy.fresh : copy.checkSync}</strong>
      </div>
      <div className="today-plumbing-grid">
        {highlights.map((item) => (
          <div key={item.label} className={`today-glance-item ${item.tone === "watch" ? "watch" : ""}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <em>{item.hint}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
