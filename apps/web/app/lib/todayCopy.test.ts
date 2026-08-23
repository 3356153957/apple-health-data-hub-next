import { describe, expect, test } from "bun:test";

import { dictionaries } from "./i18n";
import {
  buildHeroByline,
  buildTodayHighlights,
  buildTodaySummary,
  formatRecoveryCompleteness,
  formatTodayAgo,
  formatTodayCopy,
} from "./todayCopy";

const zh = dictionaries["zh-CN"].today;

describe("Today copy", () => {
  test("formats every occurrence of a named placeholder", () => {
    expect(formatTodayCopy("{count} 项指标，共 {count} 项", { count: 3 })).toBe("3 项指标，共 3 项");
  });

  test("formats deterministic relative time in the active locale", () => {
    const now = Date.parse("2026-08-23T10:00:00.000Z");
    expect(formatTodayAgo(null, "zh-CN", now)).toBe("从未同步");
    expect(formatTodayAgo("2026-08-23T09:30:00.000Z", "zh-CN", now)).toBe("30 分钟前");
    expect(formatTodayAgo("2026-08-23T09:30:00.000Z", "en", now)).toBe("30m ago");
  });

  test("builds the Chinese steady summary from facts only", () => {
    expect(buildTodaySummary(zh, { score: 65, changes: 1, ready: 3, locale: "zh-CN" })).toBe(
      "状态整体平稳。下面的摘要会说明哪些指标发生了变化。已有 3 项指标积累了足够的历史数据。",
    );
  });

  test("builds localized highlight labels and hints", () => {
    const highlights = buildTodayHighlights(zh, {
      freshness: "30 分钟前",
      metricsWithData: 12,
      ready: 4,
      changes: 0,
      live: false,
      locale: "zh-CN",
    });

    expect(highlights).toEqual([
      { label: "最近同步", value: "30 分钟前", hint: "建议尽快刷新", tone: "watch" },
      { label: "已有数据", value: "12", hint: "项指标" },
      { label: "分析就绪", value: "4", hint: "项历史充足" },
      { label: "近期变化", value: "0", hint: "未发现异常" },
    ]);
  });

  test("builds localized byline and evidence completeness", () => {
    expect(buildHeroByline(zh, { ready: 3, freshness: "刚刚", locale: "zh-CN" })).toEqual([
      { lead: "依据", strong: "你的个人基线" },
      { strong: "3", trail: " 项指标已就绪" },
      { lead: "同步于", strong: "刚刚" },
    ]);
    expect(formatRecoveryCompleteness(zh, 3, 5, "zh-CN")).toBe("已收到 3/5 项输入");
  });
});
