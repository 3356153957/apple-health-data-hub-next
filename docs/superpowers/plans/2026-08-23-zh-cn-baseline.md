# 简体中文基线实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或在当前会话中按相同检查点逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 在最新 HealthSave Observatory 上游基线上正式提供简体中文公共界面，并保持其他未完成语言仍受实验开关保护。

**架构：** 复用现有 `i18n.ts` 字典、服务端 Locale Cookie、`I18nProvider` 和 `LanguageSwitcher`，不复制 Shell、Sidebar 或页面组件。第一阶段只翻译共享导航、页面标题与设置文案；页面正文和 Apple 专属页面在后续独立计划中迁移。

**技术栈：** Next.js 16、React 19、TypeScript、Bun Test、现有 HealthSave i18n 字典。

---

## 文件职责

- 修改 `apps/web/app/lib/i18n.test.ts`：锁定简体中文可用性、默认发布门控和字典完整性。
- 修改 `apps/web/app/lib/i18n.ts`：注册 `zh-CN`、把它加入正式发布语言，并提供完整共享字典。
- 修改 `apps/web/README.md`：说明英文和简体中文默认可用，其他翻译仍需实验开关。

此阶段不修改 API、数据库、Apple Health 导入、页面正文、认证或全局样式。

### 任务 1：用失败测试定义简体中文发布行为

**文件：**
- 修改：`apps/web/app/lib/i18n.test.ts`
- 测试：`apps/web/app/lib/i18n.test.ts`

- [ ] **步骤 1：扩展 Locale 解析测试**

在 `parseLocale accepts only supported locales` 中加入：

```ts
expect(parseLocale("zh-CN")).toBe("zh-CN");
```

- [ ] **步骤 2：把发布门控测试改成精确的新契约**

将测试改为：

```ts
test("only finished locales are released without the preview gate", () => {
  expect(availableLocales(false)).toEqual(["en", "zh-CN"]);
  expect(availableLocales(true)).toEqual(LOCALES);
  expect(resolveAvailableLocale("zh-CN", false)).toBe("zh-CN");
  expect(resolveAvailableLocale("fr", false)).toBe("en");
  expect(resolveAvailableLocale("fr", true)).toBe("fr");
  expect(resolveAvailableLocale("pt-BR", true)).toBe("en");
});
```

- [ ] **步骤 3：运行目标测试并验证红灯**

运行：

```powershell
bun test app/lib/i18n.test.ts
```

工作目录：`apps/web`

预期：FAIL；`parseLocale("zh-CN")` 当前返回 `en`，且 `availableLocales(false)` 当前只有 `en`。

- [ ] **步骤 4：确认失败原因来自功能缺失**

必须确认不是依赖缺失、TypeScript 语法错误或测试路径错误。若是环境错误，先修复环境再重新取得上述红灯。

### 任务 2：实现最小简体中文共享字典

**文件：**
- 修改：`apps/web/app/lib/i18n.ts`
- 测试：`apps/web/app/lib/i18n.test.ts`

- [ ] **步骤 1：注册并正式发布 `zh-CN`**

修改 Locale 常量：

```ts
export const LOCALES = ["en", "es", "fr", "de", "ja", "zh-TW", "zh-CN"] as const;

export const LOCALE_OPTIONS: readonly { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ja", label: "日本語" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "zh-CN", label: "简体中文" },
];

const DEFAULT_LOCALE: Locale = "en";
const RELEASED_LOCALES: readonly Locale[] = [DEFAULT_LOCALE, "zh-CN"];
```

- [ ] **步骤 2：添加完整共享字典**

在 `dictionaries` 中添加以下精确条目；必须保持与英语字典相同的键和占位符：

```ts
"zh-CN": {
  chrome: {
    closeNavigation: "关闭导航",
    openNavigation: "打开导航",
    commandSearch: "跳转到指标或页面（Command K）",
    search: "搜索",
    serviceStatus: "服务状态",
    language: "语言",
    footer: "HealthSave Observatory · 规范化观测数据 · 本地优先",
  },
  density: { label: "视图模式", essentials: "精简", observatory: "观测站" },
  navGroups: { essentials: "常用", explore: "分析", manage: "管理" },
  nav: {
    today: "今日",
    sleep: "睡眠",
    activity: "活动",
    findings: "健康发现",
    data: "数据",
    sources: "数据源",
    privacy: "隐私",
    explore: "探索",
    library: "指标库",
    compare: "对比",
    relationships: "相关性",
    experiments: "健康实验",
    timeline: "时间线",
    integrations: "集成",
    intelligence: "智能分析",
    settings: "设置",
  },
  titles: {
    today: "今日",
    todaySub: "恢复状态、近期变化和值得关注的指标。",
    sleep: "睡眠",
    sleepSub: "睡眠阶段、时长、规律性和睡眠债，逐夜查看。",
    activity: "活动",
    activitySub: "每日负荷、步数、能量消耗和心血管负荷。",
    demoSub: "使用本地演示数据展示 30 天健康变化。",
    experiments: "健康实验",
    experimentsSub: "尝试一种改变，再测量它是否有帮助。",
    timeline: "健康时间线",
    timelineSub: "一览你的健康历程：时刻、变化与决定。",
    findings: "健康发现",
    findingsSub: "优先呈现重要变化，需要时再深入计算细节。",
    sources: "数据源",
    sourcesSub: "查看每个数字的来源及新鲜度。",
    data: "数据",
    dataSub: "指标、覆盖率、就绪状态和导出。",
    explore: "自定义分析",
    exploreSub: "使用任意健康指标组合自己的面板。",
    compare: "对比",
    compareSub: "在保留数据来源的前提下比较周期、来源和设备。",
    relationships: "相关性",
    relationshipsSub: "探索多个健康指标如何共同变化。",
    privacy: "隐私",
    privacySub: "查看哪些数据留在本机、哪些离开了主机以及原因。",
    library: "指标库",
    librarySub: "搜索并固定你采集的每一项健康指标。",
    intelligence: "智能分析",
    intelligenceSub: "默认由本地模型解读，只有明确同意后才使用云端。",
    integrations: "集成",
    integrationsSub: "汇总输入来源和输出目标，并显示实时状态。",
    settings: "设置",
    settingsSub: "在一个页面管理偏好、服务和系统状态。",
  },
  settings: {
    viewTitle: "视图",
    viewHintEssentials: "精简",
    viewHintObservatory: "观测站",
    viewHint: "仅保留日常页面导航；{observatory} 会展示全部高级视图。无论使用哪种模式，所有页面仍可通过网址访问。",
    languageTitle: "语言",
    languageHint: "选择导航、页面标题和公共控件使用的界面语言。后续可以继续把页面正文迁移到同一翻译目录。",
    pinnedSignals: "已固定指标",
    noPinned: "尚未固定任何指标——今日面板会显示默认推荐内容。请在 {library} 中收藏指标，构建自己的面板。",
  },
},
```

- [ ] **步骤 3：运行目标测试并验证绿灯**

运行：

```powershell
bun test app/lib/i18n.test.ts
```

预期：PASS；Locale 解析、发布门控、字典键和占位符全部通过。

- [ ] **步骤 4：运行完整 Web 测试**

运行：

```powershell
bun run test
```

工作目录：`apps/web`

预期：全部通过，无失败。

- [ ] **步骤 5：提交代码行为变更**

```powershell
git add apps/web/app/lib/i18n.ts apps/web/app/lib/i18n.test.ts
git commit -m "feat(web): release Simplified Chinese locale"
```

### 任务 3：记录语言发布策略

**文件：**
- 修改：`apps/web/README.md`
- 验证：`apps/web/README.md`

- [ ] **步骤 1：在 Web README 添加语言说明**

在运行说明附近加入：

```markdown
## Interface languages

English and Simplified Chinese (`zh-CN`) are available in normal builds. Other incomplete translations remain behind `HEALTHSAVE_EXPERIMENTAL_LOCALES=1` until their shared catalogs are ready for release.
```

- [ ] **步骤 2：验证文档与环境配置一致**

运行：

```powershell
python -m pytest tests/test_setup_env_completeness.py tests/test_docs_accuracy.py -q
```

预期：全部通过。

- [ ] **步骤 3：提交文档变更**

```powershell
git add apps/web/README.md
git commit -m "docs(web): document locale release policy"
```

### 任务 4：完成第一阶段验证

**文件：**
- 验证：整个仓库

- [ ] **步骤 1：检查格式和静态类型**

```powershell
python -m ruff format --check .
python -m ruff check .
bun run --cwd apps/web typecheck
```

预期：三个命令都以退出码 0 完成。

- [ ] **步骤 2：运行 Web 测试和生产构建**

```powershell
bun run --cwd apps/web test
bun run --cwd apps/web build
```

预期：测试全部通过，Next.js 生产构建退出码为 0。

- [ ] **步骤 3：运行 Python 回归测试**

```powershell
python -m pytest -q
```

预期：非 Docker 测试全部通过；若本机 Docker 不可用，只能将明确依赖 Docker 的失败单独记录，不能把阶段标记为完全通过。

- [ ] **步骤 4：检查变更范围**

```powershell
git status --short
git diff upstream/main...HEAD --stat
git log --oneline upstream/main..HEAD
```

预期：只有计划文档、i18n 测试、i18n 字典和 Web README 发生变化，没有 API、数据库或部署文件漂移。

- [ ] **步骤 5：提交计划文档**

```powershell
git add docs/superpowers/plans/2026-08-23-zh-cn-baseline.md
git commit -m "docs: add Simplified Chinese baseline plan"
```

