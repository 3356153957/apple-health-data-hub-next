import { getDictionary, type Dictionary, type Locale } from "./i18n";

export type TodayCopy = Dictionary["today"];

type CopyValue = string | number;

export type TodayHighlightCopy = {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "watch";
};

export type HeroBylineCopy = {
  lead?: string;
  strong: string;
  trail?: string;
};

export function formatTodayCopy(template: string, values: Record<string, CopyValue>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );
}

function localizedNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatTodayAgo(
  iso: string | null | undefined,
  locale: Locale,
  now = Date.now(),
): string {
  const copy = getDictionary(locale).today.time;
  if (!iso) return copy.never;

  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return copy.never;

  const mins = Math.floor((now - timestamp) / 60_000);
  if (mins < 1) return copy.justNow;
  if (mins < 60) return formatTodayCopy(copy.minutesAgo, { count: localizedNumber(mins, locale) });

  const hours = Math.floor(mins / 60);
  if (hours < 24) return formatTodayCopy(copy.hoursAgo, { count: localizedNumber(hours, locale) });
  return formatTodayCopy(copy.daysAgo, { count: localizedNumber(Math.floor(hours / 24), locale) });
}

export function buildTodaySummary(
  copy: TodayCopy,
  facts: { score: number | null; changes: number; ready: number; locale: Locale },
): string {
  const readiness =
    facts.ready > 0
      ? formatTodayCopy(copy.summary.ready, { count: localizedNumber(facts.ready, facts.locale) })
      : copy.summary.baselineBuilding;

  if (facts.score === null) return formatTodayCopy(copy.summary.syncing, { readiness });
  if (facts.score >= 60) {
    return formatTodayCopy(facts.changes > 0 ? copy.summary.steadyChanged : copy.summary.steady, { readiness });
  }
  if (facts.score >= 45) return formatTodayCopy(copy.summary.watch, { readiness });
  return formatTodayCopy(copy.summary.low, { readiness });
}

export function buildTodayHighlights(
  copy: TodayCopy,
  facts: {
    freshness: string;
    metricsWithData: number;
    ready: number;
    changes: number;
    live: boolean;
    locale: Locale;
  },
): TodayHighlightCopy[] {
  return [
    {
      label: copy.highlights.lastSync,
      value: facts.freshness,
      hint: facts.live ? copy.highlights.recentReadings : copy.highlights.refreshSoon,
      tone: facts.live ? "good" : "watch",
    },
    {
      label: copy.highlights.signals,
      value: localizedNumber(facts.metricsWithData, facts.locale),
      hint: copy.highlights.withData,
    },
    {
      label: copy.highlights.ready,
      value: localizedNumber(facts.ready, facts.locale),
      hint: copy.highlights.enoughHistory,
    },
    {
      label: copy.highlights.changes,
      value: localizedNumber(facts.changes, facts.locale),
      hint: facts.changes > 0 ? copy.highlights.reviewBelow : copy.highlights.noneFlagged,
    },
  ];
}

export function buildHeroByline(
  copy: TodayCopy,
  facts: { ready: number; freshness: string; locale: Locale },
): HeroBylineCopy[] {
  const items: HeroBylineCopy[] = [
    { lead: copy.byline.baselineLead, strong: copy.byline.baselineStrong },
  ];
  if (facts.ready > 0) {
    items.push({
      strong: localizedNumber(facts.ready, facts.locale),
      trail: copy.byline.readyTrail,
    });
  }
  items.push({ lead: copy.byline.syncedLead, strong: facts.freshness });
  return items;
}

export function formatRecoveryCompleteness(
  copy: TodayCopy,
  inputCount: number,
  inputTotal: number,
  locale: Locale,
): string {
  return formatTodayCopy(copy.hero.inputs, {
    count: localizedNumber(inputCount, locale),
    total: localizedNumber(inputTotal, locale),
  });
}
