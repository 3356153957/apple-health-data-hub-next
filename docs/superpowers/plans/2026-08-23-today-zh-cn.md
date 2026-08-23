# Today 简体中文实施计划

> **目标：** 在上游最新版 Today 页面中发布一条可维护的简体中文核心体验，同时保留上游恢复度、同步就绪度、隐私和首用流程的实现。

## 范围

本阶段覆盖 Today 页最先进入视野、最影响日常判断的文案：主结论、恢复度仪表、基线/同步状态、摘要指标、首次使用与服务断连状态、隐私回执、故事与指标区块标签。

本阶段不迁移旧 fork 的 `apple_dashboard.py` 或旧 Daily/Coach SQL，也不一次性翻译 SleepCard、MetricCard、WeeklyBriefCard 等下游卡片内部文案。后者按独立 PR 继续推进。

## 设计

- 在 `Dictionary` 中新增结构化 `today` 文案组，英文作为类型基线，简体中文提供完整翻译；尚未发布的预览语言暂时复用英文，避免伪装成已经完成页面级翻译。
- 新增纯函数模块 `apps/web/app/lib/todayCopy.ts`，负责占位符、相对时间、主结论、摘要指标和署名行的确定性格式化。
- `page.tsx` 只读取一次 locale/dictionary，并把 `locale` 与 `dict.today` 传给 Today 的服务器组件。
- `RecoveryHero` 接收文案对象，不在可复用展示组件里硬编码英文；数值阈值与 CSS 状态保持不变。
- 不改变 API、数据库、恢复度算法和数据选择逻辑。

## Task 1：用失败测试固定文案契约

**文件：**

- 新建 `apps/web/app/lib/todayCopy.test.ts`
- 修改 `apps/web/app/components/RecoveryHero.test.tsx`

**步骤：**

1. 为简体中文主结论、相对时间、摘要指标、占位符替换添加测试。
2. 为 RecoveryHero 的中文状态、标题、基线差值和 HRV 标题添加渲染测试。
3. 运行：

   `bun test app/lib/todayCopy.test.ts app/components/RecoveryHero.test.tsx`

4. 确认测试因缺少 `today` 字典/文案参数而失败，而不是测试基础设施故障。

## Task 2：实现纯文案层和字典

**文件：**

- 修改 `apps/web/app/lib/i18n.ts`
- 新建 `apps/web/app/lib/todayCopy.ts`

**步骤：**

1. 在英文与简体中文字典中加入相同的 `today` 结构。
2. 预览语言通过 `englishDictionary.today` 保持完整形状。
3. 实现 `formatTodayCopy`、`formatTodayAgo`、`buildTodaySummary`、`buildTodayHighlights`、`buildHeroByline` 和证据完整度格式化。
4. 运行目标测试，确认纯函数测试转绿。

## Task 3：把 Today 核心组件接到字典

**文件：**

- 修改 `apps/web/app/page.tsx`
- 修改 `apps/web/app/components/sections/TodaySections.tsx`
- 修改 `apps/web/app/components/RecoveryHero.tsx`
- 修改 `apps/web/app/components/RecoveryHero.test.tsx`

**步骤：**

1. 从页面向 Today 各区块传递 `locale` 和 `dict.today`。
2. 用纯文案函数替换主结论、摘要指标、署名、相对时间与证据完整度的英文拼接。
3. 将 RecoveryHero 的标题、状态名、仪表标题、基线差值和 HRV 标签改为传入文案。
4. 翻译空数据、服务不可达、隐私回执、故事区块和指标区块的核心 UI。
5. 保持现有数据加载、阈值、并发请求和组件布局不变。

## Task 4：验证、提交与合并

**步骤：**

1. 运行目标测试。
2. 运行 Web 全量测试：`bun test`。
3. 运行类型检查：`bun run typecheck`。
4. 运行生产构建：`bun run build`。
5. 用 codebase memory 检查变更影响面。
6. 按可用增量提交并推送 `codex/today-zh-cn`，创建 PR。
7. 等待 GitHub 的 test 与 Docker e2e 均通过后合并，再确认 `main` 的合并后 CI。
