# v2.16.0 — Gacha Lab React 原生化重构

日期：2026-10-24（Asia/Shanghai）。稳定基线：`4ddab85b6cf123805e72f96f07507e6c9b9575e7`（v2.15.22）。开始时工作树干净、检出分支为 `work`，本地没有 `main`，`origin/main` 跟踪引用过期。经 GitHub 和 Git 远程读取双重核实远程 `main` 为稳定基线后，从同一提交建立本地 `main` 并正常 fetch 更新跟踪引用；未覆盖、重置或变基任何已有内容。

## 实现

Gacha Lab 已改为 React + TypeScript 原生业务模块，移除 iframe、独立 HTML 和一次性集成脚本。`App.tsx` 仅增加返回日历的组合回调。业务按抽奖/结果、奖池管理、奖励编辑、兑换规则编辑、概率统计、图鉴/库存、商店、存储、音效和局部样式拆分；纯业务规则独立放在 `src/domain/gacha/`。

保留一亿份整数权重、原有 Math.random 调用顺序、数量闭区间均匀分布、重复收藏转换、商店兑换和重复兑换规则、1—10000 次抽数范围、理论概率计算、自定义统计合并与排序、模拟成本、声音包络和 JSON schema 1。多目标商店沿用 rewardIds 配置顺序；已显示结果保留抽奖时的配置快照。复用 Button、Field、PageHeading 和全站 design tokens，保留高对比交替编辑卡片与紧凑移动操作。

## 数据兼容性

- 存储仍是同源 `localStorage['zing-gacha-v1']`，沿用 active/pools、config、draws/spent、counts、collection、duplicates、converted、tradeGained、redeemedSpent、history、batchStats。读取仅在内存中兼容，不发生启动写回；历史和未知字段保留。
- 兼容更早的 versions 最后一版 config、trade.to 和 reward.redeemFrom/redeemCost；不丢弃原字段，不要求用户手动迁移。
- 无效 JSON 或结构阻止抽奖模块挂载，保留原始字符串，并提供原始数据导出、重试和返回日历。不会用示例或空奖池覆盖错误数据。
- 所有操作先生成候选副本，保存成功才更新界面。配额/存储失败保持旧数据和旧界面；原始快照比较阻止已检测到的其他标签页更新被覆盖。这不是跨标签页的原子事务保证。
- 文件异步读取完成后基于最新已提交快照导入，避免导入期间创建的奖池被陈旧回调覆盖。配置覆盖/完整备份替换仍保留原确认语义。
- 兼容性夹具由 v2.15.22 原 HTML 在隔离 Chromium 中真实生成，只含生成的示例数据。验证直接读取不改写、继续抽奖、刷新、图鉴/余额/统计保留、多奖池隔离和完整备份往返。
- 日历 IndexedDB schema 和全部记录在隔离测试中前后严格一致。本轮未修改数据库、B2、GitHub 同步、主应用备份或 API 功能，未访问或清理真实用户云数据。

## 导航与恢复

宿主 Portal 中的返回栏独立于延迟加载内容和错误边界，加载中、模块下载失败、渲染异常、数据读取异常时始终可返回日历。顶部 safe-area、44px 返回触摸区域、动态视口高度、独立滚动容器和高层级导航避免返回控件被内容遮挡。退出恢复 body 滚动，支持 Escape，日历日期/月浏览状态仍由 App 保留。

移动验证使用 Chromium 的 iPhone 13 视口模拟和桌面视口，未执行实体 iPhone/Safari/WebKit 测试，不将模拟测试表述为实体设备验证。

## 验证

| 命令 | 最终结果 |
| --- | --- |
| `npm run build` | 通过，包含 version:check、TypeScript、Vite、生产 Service Worker 版本注入；保留已有大 chunk 警告 |
| `npm run typecheck` | 通过 |
| `npm run lint` | 成功退出，0 error、72 warning；新增 Gacha 模块和专项测试无 lint warning |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/e2e/gacha-lab-integration.spec.ts` | **25 通过，0 失败，0 跳过**，1.8 分钟 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2` | **600 通过，0 失败，0 跳过**，6.5 分钟 |
| `git diff --check` / `git diff --cached --check` | 通过 |

专项 25 项也包含在全量 600 项内，不重复累计。全量覆盖生产离线、备份/恢复、同步、多设备、任务、笔记、Focus、日历和已有 UI 回归。

故障注入测试故意触发解析错误、渲染错误及模块下载错误；对应的 React 错误日志是已断言的恢复场景。早期专项测试发现的主应用初始化竞争已通过等待真实初始化持久化完成修复测试前置条件，保留全库严格相等断言。无删除、跳过或放宽断言制造通过。

## 修改文件

| 类型 | 文件 |
| --- | --- |
| 新增 | `docs/RELEASE_v2.16.0.md` |
| 删除 | `integrate_gacha.py` |
| 修改 | `package-lock.json` |
| 修改 | `package.json` |
| 删除 | `public/gacha-lab/index.html` |
| 修改 | `src/ARCHITECTURE.md` |
| 修改 | `src/App.css` |
| 修改 | `src/App.tsx` |
| 新增 | `src/domain/gacha/defaults.ts` |
| 新增 | `src/domain/gacha/draw.ts` |
| 新增 | `src/domain/gacha/inventory.ts` |
| 新增 | `src/domain/gacha/statistics.ts` |
| 新增 | `src/domain/gacha/trades.ts` |
| 新增 | `src/domain/gacha/types.ts` |
| 新增 | `src/domain/gacha/validation.ts` |
| 新增 | `src/features/gacha-lab/GachaLabBoundary.tsx` |
| 新增 | `src/features/gacha-lab/GachaLabContent.tsx` |
| 修改 | `src/features/gacha-lab/GachaLabPage.tsx` |
| 新增 | `src/features/gacha-lab/components/CollectionInventory.tsx` |
| 新增 | `src/features/gacha-lab/components/DrawPanel.tsx` |
| 新增 | `src/features/gacha-lab/components/PoolEditor.tsx` |
| 新增 | `src/features/gacha-lab/components/ProbabilityPanel.tsx` |
| 新增 | `src/features/gacha-lab/components/RewardEditor.tsx` |
| 新增 | `src/features/gacha-lab/components/Shop.tsx` |
| 新增 | `src/features/gacha-lab/components/TradeEditor.tsx` |
| 新增 | `src/features/gacha-lab/gacha-lab.css` |
| 新增 | `src/features/gacha-lab/storage.ts` |
| 新增 | `src/features/gacha-lab/useDrawSound.ts` |
| 新增 | `src/features/gacha-lab/useGachaLab.ts` |
| 修改 | `src/features/random-wheel/RandomWorkspace.tsx` |
| 修改 | `tests/e2e/gacha-lab-integration.spec.ts` |
| 新增 | `tests/fixtures/gacha/README.md` |
| 新增 | `tests/fixtures/gacha/v2.15.22-state.json` |

## 发布

仅在最终构建、专项测试和全量回归全部成功后提交、普通快进推送 `main` 与新建 `v2.16.0` Tag；不改写历史 Tag、提交或使用强制推送。正式部署由现有 GitHub main → Vercel 集成触发；部署观察结果记录在最终交付回执。
