import { BaselineRibbon } from "./BaselineRibbon";
import { BodyDial, type DialTone } from "./BodyDial";
import { type Contributor, ContributorStack } from "./ContributorStack";
import { formatTodayCopy, type TodayCopy } from "../lib/todayCopy";

const STATES = [
  { min: 75, key: "prime", cls: "state-prime", tone: "good" },
  { min: 60, key: "steady", cls: "state-steady", tone: "good" },
  { min: 45, key: "caution", cls: "state-caution", tone: "warn" },
  { min: 0, key: "suppressed", cls: "state-suppressed", tone: "muted" },
] as const;

function stateFor(score: number) {
  return STATES.find((s) => score >= s.min) ?? STATES[STATES.length - 1];
}

// The lede leads with ONE finding sentence (h1), the rest of the deterministic
// summary follows as a muted dek. Pure string reshaping — invents nothing.
function splitSummary(summary: string): [string, string] {
  const match = summary.match(/^(.*?[.!?。！？])\s*(.+)$/s);
  return match ? [match[1], match[2]] : [summary, ""];
}

export type HeroRibbon = {
  values: number[];
  band?: [number, number];
  axis?: [string, string];
};

export type TodayHighlight = {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "watch";
};

// A byline atom: `{lead}<b>{strong}</b>{trail}`. Built only from data the hero
// already receives (baseline window, ready-signal count, sync freshness) —
// never an invented number.
export type BylineItem = {
  lead?: string;
  strong: string;
  trail?: string;
};

export function RecoveryHero({
  copy,
  freshness,
  score,
  summary,
  ribbon,
  live,
  contributors = [],
  byline = [],
  deltaPct = null,
  evidenceLabel = null,
}: {
  copy: TodayCopy["hero"];
  freshness: string;
  score: number | null;
  summary: string;
  ribbon: HeroRibbon | null;
  live?: boolean;
  contributors?: Contributor[];
  byline?: BylineItem[];
  deltaPct?: number | null;
  evidenceLabel?: string | null;
}) {
  const state = score !== null ? stateFor(score) : null;
  const tone: DialTone = state ? state.tone : "muted";
  const [headline, dek] = splitSummary(summary);
  const finiteDeltaPct = typeof deltaPct === "number" && Number.isFinite(deltaPct) ? deltaPct : null;

  return (
    <section className={`hero today-hero ${state ? `hero-${state.cls}` : ""}`}>
      <div className="today-hero-main">
        <div className="hero-lede">
          <div className="hero-eyebrow">{copy.eyebrow}</div>
          <h1 className="hero-lede-head">{headline}</h1>
          {dek && <p className="hero-lede-dek">{dek}</p>}
          {byline.length > 0 && (
            <div className="hero-byline mono">
              {byline.map((item, i) => (
                <span key={i}>
                  {item.lead}
                  <b>{item.strong}</b>
                  {item.trail}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={`hero-instrument dial-tone-${tone}`}>
          <BodyDial
            score={score}
            tone={tone}
            caption={copy.recovery}
            ariaLabel={
              score !== null
                ? formatTodayCopy(copy.dialScore, { score: Math.round(score) })
                : copy.dialBuilding
            }
          />
          <div className="hero-instrument-meta">
            {state ? (
              <span className="hero-chip">{copy.states[state.key]}</span>
            ) : (
              <span className="hero-chip">{copy.states.building}</span>
            )}
            {evidenceLabel && <span className="hero-evidence mono">{evidenceLabel}</span>}
            {finiteDeltaPct !== null && (
              <span className="hero-delta mono">
                {formatTodayCopy(copy.baselineComparison, {
                  value: `${finiteDeltaPct >= 0 ? "+" : "−"}${Math.abs(finiteDeltaPct).toFixed(0)}`,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {ribbon && ribbon.values.length >= 2 && (
        <div className="today-ribbon">
          <div className="today-ribbon-head">
            <span>{copy.hrvBaseline}</span>
            <em>{formatTodayCopy(copy.lastReading, { freshness })}</em>
          </div>
          <BaselineRibbon
            values={ribbon.values}
            band={ribbon.band}
            axis={ribbon.axis}
            live={live}
            ariaLabel={copy.ribbonAria}
          />
        </div>
      )}

      {contributors.length > 0 && (
        <div className="today-contributors">
          <ContributorStack contributors={contributors} ariaLabel={copy.contributorsAria} />
        </div>
      )}
    </section>
  );
}
