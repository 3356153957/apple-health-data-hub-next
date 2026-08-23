import { type Finding, isNarratorOff, type MetricSeries, type Privacy, type Readiness } from "../../lib/api";
import {
  dataState,
  GRID_METRICS,
  hasAnyData,
  loadReadinessSparklines,
  safeCandidates,
  safeExperiments,
  safeFindings,
  safeLatest,
  safeMetrics,
  safeNarratives,
  safePrivacy,
  safeReadiness,
  safeReceipts,
  safeSeries,
  safeSeriesMany,
} from "../../lib/load";
import { recoveryEvidence } from "../../lib/findingPresentation";
import type { Locale } from "../../lib/i18n";
import { getFocusGoal, getPinnedMetrics } from "../../lib/prefs";
import {
  buildHeroByline,
  buildTodayHighlights,
  buildTodaySummary,
  formatRecoveryCompleteness,
  formatTodayAgo,
  formatTodayCopy,
  type TodayCopy,
} from "../../lib/todayCopy";
import { EvidenceCard } from "../EvidenceCard";
import { ExperimentsCard } from "../ExperimentsCard";
import { FocusGoalPicker } from "../FocusGoalPicker";
import { GoalRibbon } from "../GoalRibbon";
import { LocalVaultReceipt, type VaultStep } from "../LocalVaultReceipt";
import { MetricCard } from "../MetricCard";
import { MobilityCard } from "../MobilityCard";
import { ReadinessCard } from "../ReadinessCard";
import { RecoveryHero } from "../RecoveryHero";
import { SleepCard } from "../SleepCard";
import { TodayPlumbing } from "../TodayPlumbing";
import { WeeklyBriefCard } from "../WeeklyBriefCard";

function recoveryFinding(findings: Finding[] | null): Finding | undefined {
  return findings?.find((finding) => finding.finding_type === "recovery_score");
}

function recoveryScore(findings: Finding[] | null): number | null {
  return recoveryEvidence(recoveryFinding(findings))?.score ?? null;
}

function recoveryCompleteness(findings: Finding[] | null, copy: TodayCopy, locale: Locale): string | null {
  const evidence = recoveryEvidence(recoveryFinding(findings));
  return evidence ? formatRecoveryCompleteness(copy, evidence.inputCount, evidence.inputTotal, locale) : null;
}

const CONTRIBUTOR_DEFS = [
  { key: "hrv_vs_baseline_pct", labelKey: "hrv", unit: "%", positiveIsGood: true },
  { key: "rhr_vs_baseline_pct", labelKey: "restingHeartRate", unit: "%", positiveIsGood: false },
  { key: "respiratory_rate_vs_baseline_pct", labelKey: "respiratoryRate", unit: "%", positiveIsGood: false },
  { key: "temperature_deviation_c", labelKey: "wristTemperature", unit: "°C", positiveIsGood: false },
] as const;

function recoveryContributors(findings: Finding[] | null, copy: TodayCopy) {
  const found = recoveryFinding(findings);
  if (!recoveryEvidence(found)) return [];
  const raw = found?.structured_data?.contributors as Record<string, unknown> | undefined;
  if (!raw) return [];
  return CONTRIBUTOR_DEFS.flatMap((def) => {
    const value = raw[def.key];
    return typeof value === "number" && Number.isFinite(value)
      ? [{ label: copy.contributors[def.labelKey], value, unit: def.unit, positiveIsGood: def.positiveIsGood }]
      : [];
  });
}

function recoveryDelta(findings: Finding[] | null): number | null {
  const found = recoveryFinding(findings);
  if (!recoveryEvidence(found)) return null;
  const delta = found?.structured_data?.delta_pct_vs_baseline;
  return typeof delta === "number" && Number.isFinite(delta) ? delta : null;
}

function readyMetricCount(readiness: Readiness | null): number {
  return (
    readiness?.metrics.filter((metric) =>
      Object.values(metric.analyzable ?? {}).some((gate) => gate.is_sufficient),
    ).length ?? 0
  );
}

function metricsWithData(readiness: Readiness | null): number {
  return (
    readiness?.summary.metrics_with_data ??
    readiness?.metrics.filter((metric) => metric.observation_count > 0).length ??
    0
  );
}

function changeCount(findings: Finding[] | null): number {
  return findings?.filter((finding) => finding.finding_type !== "recovery_score").length ?? 0;
}

// Byline for the hero lede — every atom is a fact the hero already holds
// (that the score is measured against the personal baseline, the ready-signal
// count, sync freshness). We deliberately do NOT print a "nights" count: the
// only window figure on hand is the raw HRV sample count (thousands of
// readings, not nights), so quoting it would be a misleading number.
function vaultSteps(
  privacy: Privacy | null,
  readiness: Readiness | null,
  copy: TodayCopy,
  locale: Locale,
): VaultStep[] {
  const sourceCount = readiness?.sources?.length ?? 0;
  const totalRows = (readiness?.sources ?? []).reduce((n, s) => n + (s.observation_count ?? 0), 0);
  const provider = privacy?.provider ?? "ollama";
  const local = privacy?.is_local ?? true;
  const cloudActive = privacy?.cloud_active ?? false;
  const narratorOff = isNarratorOff(privacy?.provider);
  return [
    {
      label: copy.vault.healthSaveSync,
      meta:
        sourceCount > 1
          ? formatTodayCopy(copy.vault.sources, { count: sourceCount.toLocaleString(locale) })
          : formatTodayAgo(readiness?.last_ingested_at, locale),
    },
    {
      label: copy.vault.localStore,
      meta: totalRows
        ? formatTodayCopy(copy.vault.rows, { count: totalRows.toLocaleString(locale) })
        : copy.vault.ready,
    },
    { label: copy.vault.patternChecks, meta: copy.vault.onThisServer },
    narratorOff
      ? { label: copy.vault.briefs, meta: copy.vault.off }
      : {
          label: local ? copy.vault.privateBriefs : copy.vault.cloudBriefs,
          meta: local ? copy.vault.local : provider,
        },
    {
      label: copy.vault.cloudSharing,
      meta: cloudActive ? copy.vault.on : copy.vault.off,
      blocked: !cloudActive,
    },
  ];
}

async function EmptyToday({ copy, state }: { copy: TodayCopy; state: "empty" | "unreachable" }) {
  if (state === "unreachable") {
    return (
      <section className="lead">
        <article className="hero today-hero">
          <div className="hero-eyebrow">{copy.empty.unreachableEyebrow}</div>
          <h2>{copy.empty.unreachableTitle}</h2>
          <p className="recovery-line" style={{ marginTop: 8 }}>
            {copy.empty.unreachableBody}
          </p>
          <div className="exp-action">
            <a className="btn" href="/demo">
              {copy.empty.exploreDemo}
            </a>
            <span className="empty">{copy.empty.unreachableDemoHint}</span>
          </div>
        </article>
      </section>
    );
  }

  const goal = await getFocusGoal();
  return (
    <section className="lead">
      <article className="hero today-hero firstrun">
        <div className="hero-eyebrow">{copy.empty.welcomeEyebrow}</div>
        <h2>{copy.empty.welcomeTitle}</h2>
        <p className="recovery-line" style={{ marginTop: 8 }}>
          {copy.empty.welcomeBody}
        </p>
        <ol className="firstrun-steps">
          <li className="firstrun-step">
            <span className="firstrun-n">1</span>
            <div>
              <strong>{copy.empty.pairTitle}</strong>
              <span className="firstrun-hint">
                {copy.empty.pairBefore}
                <strong>{copy.empty.pairPath}</strong>
                {copy.empty.pairAfter}
              </span>
            </div>
          </li>
          <li className="firstrun-step">
            <span className="firstrun-n">2</span>
            <div>
              <strong>{copy.empty.pillarsTitle}</strong>
              <span className="firstrun-hint">
                <a href="/">{copy.empty.todayLink}</a>
                {copy.empty.todayHint}
                <a href="/sleep">{copy.empty.sleepLink}</a>
                {copy.empty.sleepHint}
                <a href="/activity">{copy.empty.activityLink}</a>
                {copy.empty.activityHint}
              </span>
            </div>
          </li>
          <li className="firstrun-step">
            <span className="firstrun-n">3</span>
            <div>
              <strong>{copy.empty.demoTitle}</strong>
              <span className="firstrun-hint">
                <a href="/demo">{copy.empty.exploreDemo}</a>
                {copy.empty.demoHint}
              </span>
            </div>
          </li>
          <li className="firstrun-step">
            <span className="firstrun-n">4</span>
            <div>
              <strong>{copy.empty.focusTitle}</strong>
              <span className="firstrun-hint">
                {goal
                  ? formatTodayCopy(copy.empty.activeGoal, { goal: goal.title })
                  : copy.empty.emptyGoal}
              </span>
              <FocusGoalPicker active={goal} />
            </div>
          </li>
        </ol>
      </article>
    </section>
  );
}

async function gridDefs(): Promise<{ defs: { id: string; title: string }[]; pinned: boolean }> {
  const pinned = await getPinnedMetrics();
  if (pinned.length === 0) return { defs: GRID_METRICS, pinned: false };
  const catalog = await safeMetrics();
  return {
    defs: pinned.map((id) => ({
      id,
      title: catalog?.find((m) => m.id === id)?.display_name ?? id,
    })),
    pinned: true,
  };
}

async function todaySeries7d() {
  const [{ defs }, goal] = await Promise.all([gridDefs(), getFocusGoal()]);
  const ids = defs.map((d) => d.id);
  const seen = new Set(ids);
  for (const id of goal?.metricIds ?? []) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return safeSeriesMany(ids, "7d");
}

export async function GoalSection() {
  if (!(await hasAnyData())) return null;
  const goal = await getFocusGoal();
  if (!goal) return null;
  const seriesById = await todaySeries7d();
  return <GoalRibbon goal={goal} seriesById={seriesById} />;
}

export async function HeroSection({ copy, locale }: { copy: TodayCopy; locale: Locale }) {
  const state = await dataState();
  if (state !== "data") return <EmptyToday copy={copy} state={state} />;

  const [readiness, findings, hrv] = await Promise.all([
    safeReadiness(),
    safeFindings(),
    safeSeries("vital.hrv_sdnn", "30d"),
  ]);
  const ribbonValues = (hrv?.points ?? []).map((p) => p.value).filter((v): v is number => v !== null);
  const lastObs = readiness?.last_observation_at;
  const live = Boolean(lastObs && Date.now() - new Date(lastObs).getTime() < 24 * 3600_000);
  const score = recoveryScore(findings);
  const freshness = formatTodayAgo(readiness?.last_observation_at, locale);
  const ready = readyMetricCount(readiness);
  const changes = changeCount(findings);

  return (
    <>
      <RecoveryHero
        copy={copy.hero}
        freshness={freshness}
        live={live}
        score={score}
        contributors={recoveryContributors(findings, copy)}
        summary={buildTodaySummary(copy, { score, changes, ready, locale })}
        byline={buildHeroByline(copy, { ready, freshness, locale })}
        deltaPct={recoveryDelta(findings)}
        evidenceLabel={recoveryCompleteness(findings, copy, locale)}
        ribbon={
          ribbonValues.length >= 2
            ? { values: ribbonValues, axis: [copy.hero.axisStart, copy.hero.axisEnd] }
            : null
        }
      />
      <TodayPlumbing
        copy={copy.plumbing}
        highlights={buildTodayHighlights(copy, {
          freshness,
          metricsWithData: metricsWithData(readiness),
          ready,
          changes,
          live,
          locale,
        })}
        live={live}
      />
    </>
  );
}

export async function VaultSection({ copy, locale }: { copy: TodayCopy; locale: Locale }) {
  if (!(await hasAnyData())) return null;
  const [privacy, readiness, receipts] = await Promise.all([safePrivacy(), safeReadiness(), safeReceipts()]);
  const cloudActive = privacy?.cloud_active ?? false;
  const lastEvent = receipts?.events?.[0];
  const auditNote = lastEvent
    ? formatTodayCopy(copy.vault.privacyChanged, {
        freshness: formatTodayAgo(lastEvent.created_at, locale),
      })
    : receipts?.events_unavailable
      ? copy.vault.historyPreparing
      : null;

  return (
    <LocalVaultReceipt
      steps={vaultSteps(privacy, readiness, copy, locale)}
      title={cloudActive ? copy.vault.dataSharing : copy.vault.dataPrivacy}
      seal={cloudActive ? copy.vault.cloudBriefsOn : copy.vault.staysLocal}
      variant={cloudActive ? "egress" : "local"}
      auditNote={auditNote}
    />
  );
}

export async function TodayStorySection({ copy }: { copy: TodayCopy }) {
  if (!(await hasAnyData())) return null;
  const [latest, findings, privacy, narratives, candidates, experiments] = await Promise.all([
    safeLatest(),
    safeFindings(),
    safePrivacy(),
    safeNarratives(),
    safeCandidates(),
    safeExperiments(),
  ]);
  return (
    <section className="today-story-grid" aria-label={copy.sections.storyAria}>
      <div className="today-story-left">
        <WeeklyBriefCard latest={latest} narratorOff={isNarratorOff(privacy?.provider)} history={narratives ?? []} />
        <ExperimentsCard experiments={experiments} candidates={candidates} />
      </div>
      <EvidenceCard findings={findings} compact />
    </section>
  );
}

export async function SignalsSection({ copy }: { copy: TodayCopy }) {
  if (!(await hasAnyData())) return null;
  const [{ defs: baseDefs, pinned }, goal] = await Promise.all([gridDefs(), getFocusGoal()]);
  let defs = baseDefs;
  if (goal) {
    const goalSet = new Set(goal.metricIds);
    defs = [...defs.filter((d) => goalSet.has(d.id)), ...defs.filter((d) => !goalSet.has(d.id))];
  }
  // Pull both the metric grid series and the dedicated mobility-card series in
  // one batch — fewer round-trips to the backend per Today page render.
  const mobilityIds = [
    "vital.walking_heart_rate_average",
    "mobility.walking_speed",
    "mobility.walking_step_length",
    "mobility.walking_asymmetry",
  ];
  const [map, sleep, mobility] = await Promise.all([
    todaySeries7d(),
    safeSeries("sleep.stage", "7d"),
    safeSeriesMany(mobilityIds, "7d"),
  ]);
  const mobilitySeries: Record<string, MetricSeries | null> = {
    "vital.walking_heart_rate_average": mobility.get("vital.walking_heart_rate_average") ?? null,
    "mobility.walking_speed": mobility.get("mobility.walking_speed") ?? null,
    "mobility.walking_step_length": mobility.get("mobility.walking_step_length") ?? null,
    "mobility.walking_asymmetry": mobility.get("mobility.walking_asymmetry") ?? null,
  };
  return (
    <>
      <div className="section-label">{pinned ? copy.sections.signalsPinned : copy.sections.signals}</div>
      <section className="grid today-signals-grid">
        {defs.map((metric) => (
          <MetricCard key={metric.id} series={map.get(metric.id) ?? null} fallbackTitle={metric.title} />
        ))}
        <SleepCard series={sleep} />
        <MobilityCard seriesByMetric={mobilitySeries} />
      </section>
    </>
  );
}

export async function ReadinessSection() {
  if (!(await hasAnyData())) return null;
  const readiness = await safeReadiness();
  const sparklines = await loadReadinessSparklines(readiness);
  return <ReadinessCard readiness={readiness} sparklines={sparklines} compact />;
}
