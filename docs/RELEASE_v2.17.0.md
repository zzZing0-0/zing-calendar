# v2.17.0 — 重复任务设置恢复与习惯系统完善

基线：`0af08cd1c0d5114f65a987a08d337ef94f7ad7e3`（v2.16.0）。2026-10-25（Asia/Shanghai）开始时工作树干净，正常 fetch 核实本地与远程 main 同步。本轮直接在 main 开发，不创建 Preview 分支。

## 功能实现

1. **重复任务设置**：新增独立 `TaskRecurrenceFields`，仅在已安排日期时显示。不重复、每天、每周、每月、每年、自定义均接入原有草稿和规则转换。自定义支持间隔、单位、指定星期、永不结束/日期/次数；保留原有上限和系列操作。结束日期早于开始日期时阻止保存。跨日期重复保留每次时长，不禁止原本支持的跨度。另修复单个指定星期不同于系列起始星期时的回填分类：使用自定义表达以免保存时改变旧星期。
2. **习惯日开始时间**：设置新增 `habitDayStart`，默认 `00:00`。`domain/habitDay` 只计算习惯日期，使用本地时钟和日历减日处理跨月、跨年、DST。首页、今天的日期详情、状态、周期目标、快捷打卡使用同一习惯日；运行中按分钟和前台恢复刷新。今日详情内任务、日记、专注等仍使用原自然日期。
3. **直接补打卡**：月历/年历选择日期后，记录区提供「＋ 为所选日期补打卡」，直接增加一次习惯默认数量。手选日期按原值保存，不再打开新增记录日期弹窗。保留已有记录的日期/数量修改与取消；归档习惯只读，禁止自然日期未来新增。新增、修改、取消均立即更新统计和日历。
4. **持久化排序**：扩展现有 SortableList 的内容插槽，复用点点手柄、鼠标、触摸长按和键盘排序；限制在各自完成组内拖动。未完成/已完成仍自动分组，组内按基础顺序。完成后移动分组不丢失基础位置，今日详情复用同一排序。只更新相关活跃习惯，归档/删除数据及历史记录不被重建。

## 数据兼容和安全

- IndexedDB schema 仍为 12，未清空、重建或新增对象仓库。任务 RecurrenceRule、例外和历史结构不变，无自动迁移。
- Habit 新增可选 `sortOrder`；缺失时保持旧数组顺序，首次排序后随习惯实体通过原有原子持久化和 GitHub 同步传递。归档/删除/恢复保留排序和打卡。
- HabitCheckIn 数据结构不变。快捷记录在写入时选择习惯日；历史 occurredDate/quantity/时间戳不因修改日界线而重新计算。手动补打卡或编辑采用明确选择的日期；可补至自然日期今天，不能添加自然日期未来记录。
- SyncedUserSettings 与完整 ZIP 设置新增可选 `habitDayStart`。复用现有用户设置缓存、同步与原子恢复路径；旧设置/旧备份缺失字段按 `00:00`。读取已存旧设置时同时清除可能残留的新截止时间缓存，避免错误沿用。备份和同步入口拒绝无效 HH:mm 值。
- 未修改 B2、API、GitHub 同步协议/服务端或附件生命周期；仅将新设置和习惯字段接入已有机制。云同步验证使用隔离 Mock GitHub Contents/SHA 接口，不读写真实用户数据仓库或 B2 附件。

## 验证

| 命令 | 最终结果 |
| --- | --- |
| `npm run build` | 通过，包含版本校验、TypeScript、Vite 和生产 Service Worker 版本注入；已有大 chunk 警告仍在 |
| `npm run typecheck` | 通过 |
| `npm run lint` | 成功退出，0 error、71 warning；未添加禁用规则或绕过检查 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/e2e/task-recurrence-v217.spec.ts tests/e2e/habits-v217.spec.ts tests/e2e/habits-persistence-v217.spec.ts tests/e2e/habit-checkin-note-focus-ui-v2148.spec.ts tests/e2e/habits-archive-v2114.spec.ts --workers=2` | **35 通过，0 失败，0 跳过**，2.9 分钟 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2` | **631 通过，0 失败，0 跳过**，9.6 分钟 |
| `git diff --check` | 通过 |

新增 31 项专项用例，另有 4 项相关现有用例一同进行专项验证；专项 35 项包含在全量 631 项中，不重复累计。初轮全量因新增设置字段和旧版本硬编码出现 3 项旧断言失败后停止；已保留全部原字段断言，并补充默认/自定义习惯日设置及从 package.json 校验界面版本。最终已从头完整执行全部 631 项并通过，没有删除、跳过或放宽断言制造通过。

专项覆盖创建/回填/仅本次/本次及以后/整个系列/停止/转单次/删除/跨日期时长；六时区和 DST、05:00 边界、月周目标、历史不改写、手选日期、修改与取消、未来禁用、归档只读、键盘和真实 CDP 触摸、刷新、删除恢复、完整 ZIP 往返、旧备份与设置兼容、Mock GitHub 双设备同步。此前依赖旧补打卡弹窗的两项测试已改为更强的真实 UI 断言，未删除或跳过测试。

实际手机验证为 Chromium iPhone 13 模拟和真实触摸输入事件，未执行实体 iPhone/Safari 验证。

## 文件清单

| 类型 | 文件 |
| --- | --- |
| 新增 | `docs/RELEASE_v2.17.0.md` |
| 修改 | `package-lock.json` |
| 修改 | `package.json` |
| 修改 | `src/ARCHITECTURE.md` |
| 修改 | `src/App.tsx` |
| 修改 | `src/components/ui/SortableList.tsx` |
| 修改 | `src/domain/backupValidation.ts` |
| 新增 | `src/domain/habitDay.ts` |
| 修改 | `src/domain/settings.ts` |
| 修改 | `src/domain/task.ts` |
| 修改 | `src/features/application/settingsCache.ts` |
| 修改 | `src/features/calendar/DayDetail.tsx` |
| 修改 | `src/features/habits/HabitCalendar.tsx` |
| 修改 | `src/features/habits/HabitWorkspace.tsx` |
| 修改 | `src/features/habits/HabitsPage.tsx` |
| 修改 | `src/features/habits/habitDomain.ts` |
| 新增 | `src/features/habits/habitOrder.ts` |
| 修改 | `src/features/habits/habits.css` |
| 新增 | `src/features/habits/useHabitCheckIns.ts` |
| 新增 | `src/features/habits/useHabitToday.ts` |
| 修改 | `src/features/settings/SettingsPage.tsx` |
| 修改 | `src/features/tasks/TaskEditor.tsx` |
| 新增 | `src/features/tasks/TaskRecurrenceFields.tsx` |
| 新增 | `src/features/tasks/taskRecurrenceDraft.ts` |
| 修改 | `src/hooks/useAppPreferences.ts` |
| 修改 | `src/types.ts` |
| 修改 | `tests/e2e/app-preferences-hook.spec.ts` |
| 修改 | `tests/e2e/gacha-lab-integration.spec.ts` |
| 修改 | `tests/e2e/habit-checkin-note-focus-ui-v2148.spec.ts` |
| 修改 | `tests/e2e/habits-archive-v2114.spec.ts` |
| 新增 | `tests/e2e/habits-persistence-v217.spec.ts` |
| 新增 | `tests/e2e/habits-v217.spec.ts` |
| 新增 | `tests/e2e/task-recurrence-v217.spec.ts` |
| 修改 | `tests/helpers/applicationSource.ts` |
| 新增 | `tests/helpers/v217Harness.ts` |

## 发布

只有构建、专项和全量回归全部通过后才提交，并普通快进/原子推送 main 与新的 v2.17.0 Tag。不修改历史 Tag、提交，不强制推送。Vercel 沿用现有 main 正式部署集成。
