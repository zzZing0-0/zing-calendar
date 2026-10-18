# 版本管理与发布

唯一版本来源是根目录 `package.json`。`src/features/application/version.ts` 读取它，页脚引用 APP_VERSION。`npm run release:version -- 2.15.3` 同步 package 与 lockfile 并拒绝相同或倒退版本。每次新的代码交付（包括修复）递增版本，未交付任务内部的迭代不重复发布。不得为了修正当前版本改写历史记录。

`npm run version:check` 校验两个包文件的一致性。构建后 `scripts/service-worker.mjs` 将版本注入 `dist/sw.js`；`public/sw.js` 是模板，不能将模板文件直接作为生产构件发布。版本变化会更换缓存名称。不得人工重复维护应用版本或页脚版本。

发布前执行：

```sh
npm run version:check
npm run typecheck
npm run lint
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
git diff --check
```

浏览器路径按环境配置。完整回归包括生产预览离线测试，需先构建。测试必须隔离数据和外部接口；真实 GitHub/B2 的破坏性操作禁止用于验证。记录命令、实际结果、失败原因及未验证项，不引用旧报告作为当前通过证明。

只有用户授权、所有关键检查通过、兼容性得到确认且无未解决数据丢失风险时，才允许发布。先确认远程 main、工作树及目标提交符合预期，检查远程和本地版本 Tag 不存在；存在则停止。用新提交保存源码、测试、配置和文档，不提交 node_modules、dist、测试产物或 ZIP。推送前再次检查远程 main 与 Tag，使用普通的快进/原子推送将明确的新提交与新 Tag 发布，禁止强制推送、修改历史 Tag 或历史提交。

当前 v2.15.5 是本地候选版本，承接前两轮未发布的审计修改并恢复受权的 B2 手动永久删除；每轮交付递增，不改写之前审计记录。是否发布以最新验证报告为准，版本文件已更新不代表已发布。B2 身份绑定配置与 provider 能力未验证前不得推送 main 或创建正式 Tag，见 `B2_DEPLOYMENT.md`。
